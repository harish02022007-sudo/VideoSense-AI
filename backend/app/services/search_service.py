import numpy as np
from typing import List, Dict, Any, Optional
from collections import defaultdict
from sqlalchemy import func, or_

from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video, Frame, Object, OCRResult, Transcript
from app.core.container import Container
from app.core.logging import get_logger

logger = get_logger("app.services.search_service")

STOP_WORDS = {
    "in", "on", "at", "the", "a", "an", "with", "of", "and", "or", "for", "is", 
    "by", "from", "to", "has", "have", "all", "any", "some", "it", "this", "that",
    "can", "could", "would", "will", "you", "tell", "which", "what", "where", "how",
    "when", "show", "me", "does", "did", "do", "appear", "appeared", "appearing",
    "appears", "seen", "find", "locate", "give", "please", "video", "clip", "frame",
    "frames", "second", "seconds", "time", "timestamp", "are", "were", "been", "there"
}

# Synonym dictionary for semantic object expansion
SYNONYMS = {
    "cow": ["cow", "cattle", "bull", "ox", "animal"],
    "cattle": ["cow", "cattle", "bull", "ox", "animal"],
    "bull": ["cow", "cattle", "bull", "ox", "animal"],
    "rickshaw": ["auto rickshaw", "rickshaw", "tuk tuk", "e-rickshaw"],
    "auto rickshaw": ["auto rickshaw", "rickshaw", "tuk tuk", "e-rickshaw"],
    "tuk tuk": ["auto rickshaw", "rickshaw", "tuk tuk"],
    "bike": ["motorcycle", "motorbike", "scooter", "bicycle"],
    "motorcycle": ["motorcycle", "motorbike", "scooter"],
    "scooter": ["scooter", "motorcycle", "motorbike"],
    "bicycle": ["bicycle", "bike", "cycle"],
    "car": ["car", "automobile", "vehicle", "taxi"],
    "truck": ["truck", "lorry", "vehicle"],
    "person": ["person", "man", "woman", "pedestrian", "worker", "crowd", "people"],
    "pedestrian": ["pedestrian", "person", "man", "woman"],
    "child": ["child", "kid", "boy", "girl"],
    "kid": ["child", "kid", "boy", "girl"],
    "woman": ["woman", "lady", "girl", "person"],
    "man": ["man", "gentleman", "boy", "person"],
    "glasses": ["sunglasses", "eyeglasses", "glasses", "cooling glass", "cooling glasses"],
    "sunglasses": ["sunglasses", "eyeglasses", "glasses", "cooling glass", "cooling glasses"],
    "cooling glass": ["sunglasses", "eyeglasses", "glasses", "cooling glass"],
    "cooling glasses": ["sunglasses", "eyeglasses", "glasses", "cooling glass"],
    "umbrella": ["umbrella", "parasol"],
    "shop": ["shop / stall", "shop", "stall", "kiosk", "market"],
    "stall": ["shop / stall", "shop", "stall", "kiosk"],
    "hat": ["cap", "hat", "helmet"],
    "helmet": ["helmet", "cap", "hat"],
    "ring": ["diamond ring", "gold ring", "ring", "jewelry", "band"],
    "diamond ring": ["diamond ring", "gold ring", "ring", "jewelry"],
    "foam": ["foam", "soap", "bubble", "bubbles", "shampoo"],
    "worker": ["worker", "person", "miniature figure", "man"],
    "penguin": ["penguin", "bird", "toy"],
    "bag": ["backpack", "handbag", "bag", "purse"],
    "backpack": ["backpack", "bag", "handbag"],
    "tree": ["tree", "plant", "vegetation"]
}

def expand_query_terms(query: str) -> List[str]:
    """Expands query with domain synonyms for high-accuracy object retrieval."""
    q_clean = query.lower().strip()
    terms = set([q_clean])
    
    # Filter words with stop words removed
    words = [w for w in q_clean.split() if w not in STOP_WORDS and len(w) > 2]
    for word in words:
        terms.add(word)
        for syn in SYNONYMS.get(word, []):
            terms.add(syn)
            
    for k, syns in SYNONYMS.items():
        if k in q_clean:
            for s in syns:
                terms.add(s)
    return [t for t in terms if t not in STOP_WORDS]


class SearchService:
    """
    High-Precision Multimodal Hybrid Search Engine:
    Combines direct Grounding DINO Object Detection matching, EasyOCR on-screen text matching,
    Whisper speech transcript dialogue retrieval, and dense CLIP visual frame embeddings.
    """

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def search(
        self,
        query: str,
        video_id: Optional[str] = None,
        modality: Optional[str] = None,
        top_k: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Executes unified hybrid search across all multimodal channels:
        - OBJECT: Grounding DINO detection entities in PostgreSQL
        - TEXT / OCR: On-screen EasyOCR signages & text in PostgreSQL
        - AUDIO: Spoken Whisper transcripts in PostgreSQL
        - FRAME: Dense CLIP visual frame embeddings in Vector Storage
        """
        logger.info(f"Executing hybrid semantic search query='{query}' video_id={video_id} modality={modality} top_k={top_k}")
        mod_upper = (modality or "ALL").upper()
        if mod_upper in ("METADATA", "VIDEO_METADATA"):
            mod_upper = "FRAME"

        results_map: Dict[str, Dict[str, Any]] = {}

        with UnitOfWork() as uow:
            # 1. Search Detected Objects in PostgreSQL (if ALL, OBJECT, or FRAME)
            if mod_upper in ("ALL", "OBJECT", "FRAME"):
                self._search_objects(uow, query, video_id, results_map)

            # 2. Search OCR On-Screen Text in PostgreSQL (if ALL, TEXT, or OCR)
            if mod_upper in ("ALL", "TEXT", "OCR"):
                self._search_ocr(uow, query, video_id, results_map)

            # 3. Search Audio / Dialogue Transcripts (if ALL or AUDIO)
            if mod_upper in ("ALL", "AUDIO"):
                self._search_transcripts(uow, query, video_id, results_map)

            # 4. Search Dense Visual Frame Embeddings via CLIP (if ALL or FRAME)
            if mod_upper in ("ALL", "FRAME"):
                self._search_clip_vectors(uow, query, video_id, results_map)

        # Sort combined results by similarity score descending
        sorted_results = sorted(
            results_map.values(),
            key=lambda r: r["similarity_score"],
            reverse=True
        )

        logger.info(f"Hybrid search completed. Yielded {len(sorted_results)} ranked multimodal hits.")
        return sorted_results[:top_k]

    def _search_objects(
        self,
        uow: UnitOfWork,
        query: str,
        video_id: Optional[str],
        results_map: Dict[str, Dict[str, Any]]
    ) -> None:
        """Finds keyframes containing objects matching query terms or synonyms with precision scoring."""
        expanded_terms = expand_query_terms(query)
        if not expanded_terms:
            expanded_terms = [query.lower().strip()]
            
        # Build SQL filters for expanded terms
        filters = []
        for term in expanded_terms:
            filters.append(Object.class_label.ilike(f"%{term}%"))

        q = (
            uow.session.query(Object, Frame, Video)
            .join(Frame, Object.frame_id == Frame.id)
            .join(Video, Object.video_id == Video.id)
            .filter(or_(*filters))
        )
        if video_id:
            q = q.filter(Object.video_id == video_id)

        # Order by highest confidence detections first and retrieve up to 100 records
        matching_records = q.order_by(Object.confidence.desc()).limit(100).all()

        # Group by (video_id, frame_id)
        grouped = defaultdict(list)
        for obj, frame, video in matching_records:
            key = f"{video.id}_{frame.id}"
            grouped[key].append((obj, frame, video))

        # Query terms to check for multi-term coverage
        q_clean = query.lower().strip()
        meaningful_query_words = [w for w in q_clean.split() if w not in STOP_WORDS and len(w) > 2]

        for key, items in grouped.items():
            first_obj, frame, video = items[0]
            
            # Count occurrences per class label on this frame
            class_counts = defaultdict(int)
            class_max_conf = defaultdict(float)
            for o, _, _ in items:
                lbl = (o.class_label or "").strip()
                class_counts[lbl] += 1
                conf_val = float(o.confidence or 0.0)
                if conf_val > class_max_conf[lbl]:
                    class_max_conf[lbl] = conf_val

            matched_labels = list(class_counts.keys())
            max_conf = max([float(o.confidence or 0.0) for o, _, _ in items])
            
            # Query all objects on this frame for comprehensive context
            all_frame_objs = uow.session.query(Object).filter(Object.frame_id == frame.id).all()
            all_labels = [o.class_label for o in all_frame_objs if o.class_label]

            # Relevance Scoring:
            # 1. Exact match on full query string
            is_exact = any(q_clean == lbl.lower() for lbl in matched_labels)
            
            # 2. Multi-word composite coverage (e.g. query has "child" AND "umbrella")
            matched_text_blob = " ".join(matched_labels).lower()
            words_matched_count = sum(1 for w in meaningful_query_words if w in matched_text_blob)
            multi_term_bonus = 0.05 if len(meaningful_query_words) > 1 and words_matched_count == len(meaningful_query_words) else 0.0

            if is_exact:
                score = 0.92 + min(0.06, max_conf * 0.06) + multi_term_bonus
            elif any(w in matched_text_blob for w in meaningful_query_words):
                score = 0.85 + min(0.09, max_conf * 0.09) + multi_term_bonus
            else:
                score = 0.78 + min(0.12, max_conf * 0.12)

            score = min(0.99, score)
            t_sec = float((frame.timestamp_offset_ms or 0.0) / 1000.0)
            thumbnail_url = f"/api/v1/videos/{video.id}/frames/{frame.id}/image"

            # Clean bounding boxes payload
            boxes = [
                {
                    "label": o.class_label,
                    "confidence": round(float(o.confidence or 0.0), 3),
                    "box": [
                        round(float(o.box_x_min or 0.0), 1),
                        round(float(o.box_y_min or 0.0), 1),
                        round(float(o.box_x_max or 0.0), 1),
                        round(float(o.box_y_max or 0.0), 1),
                    ]
                }
                for o, _, _ in items
            ]

            # Formulate a clean, structured summary: e.g. "Detected 2× 'cow' (91.2% conf), 1× 'person' (85.0%)"
            detected_summary_parts = []
            for lbl, cnt in sorted(class_counts.items(), key=lambda x: class_max_conf[x[0]], reverse=True)[:3]:
                conf_pct = class_max_conf[lbl] * 100
                cnt_str = f"{cnt}× " if cnt > 1 else ""
                detected_summary_parts.append(f"{cnt_str}'{lbl}' ({conf_pct:.1f}% conf)")

            desc = f"Visual Detection: Detected {', '.join(detected_summary_parts)}"
            other_labels = [l for l in all_labels if l not in matched_labels]
            if other_labels:
                unique_others = list(dict.fromkeys(other_labels))[:3]
                desc += f" alongside {', '.join(unique_others)}"

            result_item = {
                "video_id": video.id,
                "video_title": video.filename,
                "frame_id": frame.id,
                "frame_number": frame.frame_number,
                "timestamp": round(t_sec, 2),
                "thumbnail_url": thumbnail_url,
                "modality": "OBJECT",
                "match_type": "Visual Object Entity",
                "matched_content": desc,
                "matched_labels": matched_labels,
                "similarity_score": round(score, 3),
                "confidence": round(max_conf, 3),
                "detected_objects": list(dict.fromkeys(all_labels[:10])),
                "bounding_boxes": boxes[:8]
            }

            if key not in results_map or results_map[key]["similarity_score"] < score:
                results_map[key] = result_item

    def _search_ocr(
        self,
        uow: UnitOfWork,
        query: str,
        video_id: Optional[str],
        results_map: Dict[str, Dict[str, Any]]
    ) -> None:
        """Finds on-screen street banners, text, signages, or license numbers matching the query with precision scoring."""
        q_clean = query.lower().strip()
        terms = [t for t in query.split() if t.lower() not in STOP_WORDS and len(t) > 1] or [query]
        filters = [OCRResult.text.ilike(f"%{t}%") for t in terms]

        q = (
            uow.session.query(OCRResult, Frame, Video)
            .outerjoin(Frame, OCRResult.frame_id == Frame.id)
            .join(Video, OCRResult.video_id == Video.id)
            .filter(or_(*filters))
        )
        if video_id:
            q = q.filter(OCRResult.video_id == video_id)

        matching_ocrs = q.order_by(OCRResult.confidence.desc()).limit(30).all()

        for ocr, frame, video in matching_ocrs:
            t_sec = float((frame.timestamp_offset_ms or 0.0) / 1000.0) if frame else float(ocr.frame_timestamp or 0.0)
            f_id = frame.id if frame else "unassigned"
            key = f"{video.id}_{f_id}_ocr_{ocr.id}"
            conf = float(ocr.confidence or 0.0)
            
            # Exact vs partial match
            ocr_text_clean = (ocr.text or "").strip()
            is_exact = q_clean == ocr_text_clean.lower()
            if is_exact:
                score = 0.92 + min(0.06, conf * 0.06)
            elif q_clean in ocr_text_clean.lower():
                score = 0.86 + min(0.09, conf * 0.09)
            else:
                score = 0.78 + min(0.12, conf * 0.12)

            thumbnail_url = f"/api/v1/videos/{video.id}/frames/{frame.id}/image" if frame else None

            # Get surrounding objects if frame is known
            other_objects = []
            if frame:
                f_objs = uow.session.query(Object).filter(Object.frame_id == frame.id).limit(6).all()
                other_objects = [o.class_label for o in f_objs if o.class_label]

            results_map[key] = {
                "video_id": video.id,
                "video_title": video.filename,
                "frame_id": f_id,
                "frame_number": frame.frame_number if frame else 1,
                "timestamp": round(t_sec, 2),
                "thumbnail_url": thumbnail_url,
                "modality": "TEXT",
                "match_type": "On-Screen OCR Text",
                "matched_content": f"On-screen text sign: \"{ocr_text_clean}\" ({conf*100:.1f}% confidence)",
                "similarity_score": round(min(0.99, score), 3),
                "confidence": round(conf, 3),
                "detected_objects": [ocr_text_clean] + other_objects[:4],
                "bounding_boxes": [
                    {
                        "label": ocr_text_clean,
                        "confidence": round(conf, 3),
                        "box": [
                            round(float(ocr.box_x_min or 0.0), 1),
                            round(float(ocr.box_y_min or 0.0), 1),
                            round(float(ocr.box_x_max or 0.0), 1),
                            round(float(ocr.box_y_max or 0.0), 1),
                        ]
                    }
                ]
            }

    def _search_transcripts(
        self,
        uow: UnitOfWork,
        query: str,
        video_id: Optional[str],
        results_map: Dict[str, Dict[str, Any]]
    ) -> None:
        """Finds spoken dialogue segments matching query words."""
        terms = [t for t in query.split() if len(t) > 2] or [query]
        filters = [Transcript.text.ilike(f"%{t}%") for t in terms]

        q = (
            uow.session.query(Transcript, Video)
            .join(Video, Transcript.video_id == Video.id)
            .filter(or_(*filters))
        )
        if video_id:
            q = q.filter(Transcript.video_id == video_id)

        matching_transcripts = q.limit(10).all()

        for trans, video in matching_transcripts:
            t_sec = float((trans.start_time_ms or 0.0) / 1000.0)
            key = f"{video.id}_audio_{trans.id}"
            conf = float(trans.confidence or 0.0)
            score = 0.80 + min(0.15, conf * 0.15)

            results_map[key] = {
                "video_id": video.id,
                "video_title": video.filename,
                "frame_id": "dialogue",
                "frame_number": 0,
                "timestamp": round(t_sec, 2),
                "thumbnail_url": None,
                "modality": "AUDIO",
                "match_type": "Spoken Dialogue",
                "matched_content": f"Spoken dialogue: \"{trans.text}\"",
                "similarity_score": round(score, 3),
                "confidence": round(conf, 3),
                "detected_objects": [],
                "bounding_boxes": []
            }

    def _search_clip_vectors(
        self,
        uow: UnitOfWork,
        query: str,
        video_id: Optional[str],
        results_map: Dict[str, Dict[str, Any]]
    ) -> None:
        """Runs dense CLIP cosine similarity across frame visual representations."""
        embedding_service = Container.get_embedding_service()
        vector_storage = Container.get_vector_storage()

        try:
            query_vector = np.array(
                embedding_service.generate_query_embedding(query, "FRAME"),
                dtype=np.float32
            )
            query_vector = np.squeeze(query_vector)
            query_norm = np.linalg.norm(query_vector)
            if query_norm == 0.0:
                return
        except Exception as e:
            logger.debug(f"CLIP query embedding failed: {e}")
            return

        videos = [uow.videos.get(video_id)] if video_id else uow.session.query(Video).limit(20).all()

        for video in videos:
            if not video or not vector_storage.vector_exists(video.id, "FRAME"):
                continue

            try:
                stored_vectors = vector_storage.load_vector(video.id, "FRAME")
                meta = vector_storage.load_frame_metadata(video.id)
            except Exception:
                continue

            if stored_vectors.size == 0 or len(stored_vectors.shape) < 2:
                continue

            stored_norms = np.linalg.norm(stored_vectors, axis=1)
            norms = stored_norms * query_norm
            norms[norms == 0.0] = 1e-8
            similarities = np.dot(stored_vectors, query_vector) / norms

            # Top frame matches above threshold
            top_indices = np.where(similarities >= 0.22)[0]
            if len(top_indices) == 0:
                continue

            top_indices = top_indices[np.argsort(similarities[top_indices])[::-1]][:5]

            # Cache frames for this video
            db_frames = sorted(uow.frames.get_by_video_id(video.id), key=lambda f: f.frame_number)

            for f_idx in top_indices:
                sim = float(similarities[f_idx])
                t_sec = float(meta[f_idx].get("timestamp", 0.0)) if f_idx < len(meta) else 0.0
                
                matched_frame = None
                if f_idx < len(db_frames):
                    matched_frame = db_frames[f_idx]
                elif db_frames:
                    matched_frame = db_frames[min(f_idx, len(db_frames) - 1)]

                f_id = matched_frame.id if matched_frame else f"idx_{f_idx}"
                key = f"{video.id}_{f_id}"
                thumbnail_url = f"/api/v1/videos/{video.id}/frames/{f_id}/image" if matched_frame else None

                # Query objects present on this frame to describe context
                frame_objs = uow.session.query(Object).filter(Object.frame_id == f_id).limit(6).all() if matched_frame else []
                labels = [o.class_label for o in frame_objs]

                desc = f"Visual Scene Semantics: Contextual match for '{query}'"
                if labels:
                    desc += f" (Visible: {', '.join(labels[:4])})"

                # If this frame already matched an object, boost its score!
                if key in results_map:
                    results_map[key]["similarity_score"] = min(0.99, round(results_map[key]["similarity_score"] + 0.05, 3))
                    results_map[key]["match_type"] = "Hybrid: Object & Visual Scene Match"
                else:
                    results_map[key] = {
                        "video_id": video.id,
                        "video_title": video.filename,
                        "frame_id": f_id,
                        "frame_number": matched_frame.frame_number if matched_frame else (f_idx + 1),
                        "timestamp": round(t_sec, 2),
                        "thumbnail_url": thumbnail_url,
                        "modality": "FRAME",
                        "match_type": "Visual Scene Semantics",
                        "matched_content": desc,
                        "similarity_score": round(sim, 3),
                        "confidence": round(sim, 3),
                        "detected_objects": labels,
                        "bounding_boxes": [
                            {
                                "label": o.class_label,
                                "confidence": round(float(o.confidence or 0.0), 3),
                                "box": [
                                    round(float(o.box_x_min or 0.0), 1),
                                    round(float(o.box_y_min or 0.0), 1),
                                    round(float(o.box_x_max or 0.0), 1),
                                    round(float(o.box_y_max or 0.0), 1)
                                ]
                            }
                            for o in frame_objs[:4]
                        ]
                    }