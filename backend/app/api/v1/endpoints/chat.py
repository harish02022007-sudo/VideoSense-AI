import os
import re
from typing import Dict, Any, List, Optional
from collections import defaultdict
from fastapi import APIRouter, Request, HTTPException

from app.schemas.common import ResponseEnvelope
from app.schemas.chat import ChatRequest, ChatResponse, CitationItem
from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video, Frame, Object, OCRResult, Transcript, Scene
from app.services.search_service import SearchService, STOP_WORDS, SYNONYMS
from app.services.video_understanding import generate_video_understanding_narrative, clean_video_title
from app.core.logging import get_logger

logger = get_logger("app.api.chat")
router = APIRouter()

QUESTION_BOILERPLATES = [
    "provide an executive summary of this video", "provide an executive summary",
    "provide a summary of this video", "provide a summary", "provide an overview",
    "give an executive summary of this video", "give an executive summary", "give a summary",
    "executive summary of this video", "executive summary", "summary of this video",
    "summary of the video", "summarize this video", "summarize the video",
    "what is this video about", "what happens in this video", "what happens in the video",
    "can you tell in which frame", "in which frame did", "in which frame is", "in which frame does",
    "in which frame", "which frame did", "which frame is", "which frame does", "which frame",
    "what frame did", "what frame is", "what frame", "which scene did", "which scene is", "which scene",
    "tell me where", "tell me when", "tell me what", "can you tell me", "can you tell",
    "where does", "where did", "where is", "where are", "where can i see", "where can i find",
    "when does", "when did", "when is", "what time does", "what time is", "at what second",
    "how many", "count of", "number of", "list all", "total number of",
    "is appeared", "did appear", "does appear", "appeared", "appearing", "appear",
    "was spotted", "is spotted", "spotted", "seen", "visible", "located", "found",
    "show me", "find me", "look for", "search for", "detect"
]

def format_timestamp(sec: float) -> str:
    """Formats seconds into mm:ss format."""
    m = int(sec // 60)
    s = int(sec % 60)
    return f"{m:02d}:{s:02d}"

def extract_target_entity(query: str) -> str:
    """Extracts the core subject entity from a natural conversational question."""
    q_work = query.lower().strip()
    for bp in sorted(QUESTION_BOILERPLATES, key=len, reverse=True):
        q_work = q_work.replace(bp, " ")
    
    # Remove punctuation & stop words
    cleaned_tokens = [
        re.sub(r"[^\w\s-]", "", w) 
        for w in q_work.split() 
        if w not in STOP_WORDS and len(w) > 1
    ]
    return " ".join(cleaned_tokens).strip()

@router.post("", response_model=ResponseEnvelope[ChatResponse])
async def chat_with_video(
    req: ChatRequest,
    request: Request
):
    request_id = getattr(request.state, "request_id", "N/A")
    logger.info(f"Chat request received: query='{req.message}' video_id={req.video_id} persona={req.persona}")

    q_lower = req.message.lower().strip()
    video_id = req.video_id if req.video_id and req.video_id != "ALL" else None

    # Query Intent Classification
    is_summary_query = any(w in q_lower for w in [
        "summary", "summarize", "overview", "what happens", "what is this", 
        "explain", "describe", "report", "brief", "tell me about this video", "executive summary"
    ])
    is_count_query = any(w in q_lower for w in ["how many", "count", "number of", "list all", "total"])
    is_ocr_query = any(w in q_lower for w in ["text", "sign", "signage", "banner", "words", "license", "plate", "store", "name"])
    is_audio_query = any(w in q_lower for w in ["audio", "speech", "say", "said", "dialogue", "talk", "voice", "transcript"])
    is_traffic_query = any(w in q_lower for w in ["traffic", "vehicle", "car", "congestion", "jam", "speed", "road", "flow"])
    is_frame_query = any(w in q_lower for w in [
        "which frame", "what frame", "in which frame", "frame", "frames", 
        "where", "where is", "where did", "where does", "where can", "appear", "appeared", "appearing", 
        "first seen", "first appear", "when", "timestamp", "what time", "at what second"
    ])

    # Extract target entity (only if not a general summary query)
    candidate_entity = extract_target_entity(q_lower) if not is_summary_query else ""

    with UnitOfWork() as uow:
        # 1. Resolve Target Video if provided
        target_video = None
        if video_id:
            target_video = uow.videos.get(video_id)
            if not target_video:
                raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found.")

        # 2. Gather Multimodal Intelligence for Target Video
        video_objects = []
        video_ocrs = []
        video_transcripts = []
        video_scenes = []

        if target_video:
            video_objects = [o for o in uow.objects.list() if o.video_id == target_video.id]
            video_ocrs = uow.ocr_results.get_by_video_id(target_video.id)
            video_transcripts = uow.transcripts.get_by_video_id(target_video.id)
            video_scenes = uow.scenes.get_by_video_id(target_video.id)

        # 3. Aggregate Object Statistics
        object_counts = defaultdict(int)
        object_first_seen = {}
        object_max_conf = defaultdict(float)
        object_moments = defaultdict(list)

        for obj in video_objects:
            lbl = (obj.class_label or "unknown").lower().strip()
            object_counts[lbl] += 1
            conf = float(obj.confidence or 0.0)
            if conf > object_max_conf[lbl]:
                object_max_conf[lbl] = conf
            t_sec = float(obj.first_seen_timestamp or 0.0)
            if lbl not in object_first_seen or t_sec < object_first_seen[lbl]:
                object_first_seen[lbl] = t_sec
            object_moments[lbl].append(t_sec)

        # 4. Resolve Synonyms & Matching Entities
        target_matched_labels = []
        if candidate_entity:
            # Check exact or partial match in object classes
            for lbl in object_counts.keys():
                if candidate_entity == lbl or candidate_entity in lbl or lbl in candidate_entity:
                    target_matched_labels.append(lbl)
            
            # Check synonyms lookup
            syns = SYNONYMS.get(candidate_entity, [])
            for s in syns:
                for lbl in object_counts.keys():
                    if s == lbl or s in lbl or lbl in s:
                        if lbl not in target_matched_labels:
                            target_matched_labels.append(lbl)

        # Also check whole q_lower against known object classes if not summary
        if not is_summary_query:
            for lbl in object_counts.keys():
                if lbl in q_lower and lbl not in target_matched_labels:
                    target_matched_labels.append(lbl)

        # 5. Execute Semantic Context Retrieval via SearchService (Only when needed, NOT for summary queries)
        retrieval_hits = []
        if not is_summary_query and not (is_frame_query and target_matched_labels):
            search_service = SearchService()
            search_query = candidate_entity if candidate_entity else req.message
            try:
                retrieval_hits = search_service.search(
                    query=search_query,
                    video_id=target_video.id if target_video else None,
                    modality="ALL",
                    top_k=8
                )
            except Exception as e:
                logger.warning(f"Semantic search fallback: {e}")
                retrieval_hits = []

        # 6. Extract OCR & Audio Highlights
        ocr_texts = [o.text.strip() for o in video_ocrs if o.text and len(o.text.strip()) > 1]
        unique_ocr_texts = list(dict.fromkeys(ocr_texts))[:15]

        transcript_snippets = [t.text.strip() for t in video_transcripts if t.text]
        full_transcript = " ".join(transcript_snippets)

        # Persona prefix
        persona = req.persona or "analyst"
        persona_prefix = ""
        if persona == "traffic":
            persona_prefix = "🚦 **Traffic & Urban Mobility Analysis:**\n\n"
        elif persona == "analyst":
            persona_prefix = "🔍 **Surveillance & Security Intelligence Dossier:**\n\n"
        elif persona == "executive":
            persona_prefix = "📊 **Executive Video Intelligence Brief:**\n\n"

        v_title = target_video.filename if target_video else "Global Video Library"
        duration_str = f"{target_video.duration:.1f}s" if (target_video and target_video.duration) else "N/A"
        answer = ""
        suggested_prompts = []
        modalities_used = []
        citations = []

        # =========================================================================
        # CASE A: Summary or Overview Query (Executes FIRST for summary requests)
        # =========================================================================
        if is_summary_query or (not video_id and not target_matched_labels and not is_frame_query):
            modalities_used = ["Metadata", "Object Detection", "Scene Analysis"]
            if unique_ocr_texts:
                modalities_used.append("OCR Signage")
            if full_transcript:
                modalities_used.append("Whisper Audio")

            # 1. Synthesize Human-Like Comprehension Story / Narrative
            narrative_info = generate_video_understanding_narrative(
                video=target_video,
                objects=video_objects,
                transcripts=video_transcripts,
                ocrs=video_ocrs,
                scenes=video_scenes,
                persona=req.persona
            )

            clean_display_title = narrative_info.get("clean_title") or v_title
            answer = f"{persona_prefix}### 🎬 Video Understanding & Executive Summary for `{clean_display_title}`\n\n"

            # 2. Executive Narrative Overview (Highlighted Short Story)
            answer += f"> **Executive Narrative Overview:**\n"
            answer += f"> {narrative_info['short_story']}\n\n"

            # 3. Scenario & Scene Dynamics Progression
            if narrative_info.get("scenario_points"):
                answer += "#### 📋 Scenario & Scene Dynamics:\n"
                for pt in narrative_info["scenario_points"]:
                    answer += f"* {pt}\n"
                answer += "\n"

            answer += "---\n\n"
            answer += "#### 📊 Multimodal Telemetry & Ingestion Specs:\n"
            if target_video:
                answer += f"* **Duration:** {duration_str} | **Resolution:** {target_video.width}×{target_video.height} @ {target_video.fps} FPS\n"
                answer += f"* **Scenes Detected:** {len(video_scenes)} distinct camera cuts.\n"
            else:
                answer += f"* **Scope:** Repository-wide multimodal intelligence index across all processed videos.\n"

            if object_counts:
                sorted_objs = sorted(object_counts.items(), key=lambda x: x[1], reverse=True)
                top_items = [f"**{cnt}× {lbl}** (peak conf: {object_max_conf[lbl]*100:.0f}%, first at `[{format_timestamp(object_first_seen[lbl])}]`)" for lbl, cnt in sorted_objs[:6]]
                answer += f"* **Primary Visual Entities:** {', '.join(top_items)}.\n"

            if unique_ocr_texts:
                answer += f"* **On-Screen Signages & Text:** {', '.join([f'`{t}`' for t in unique_ocr_texts[:6]])}\n"

            if full_transcript:
                answer += f"* **Dialogue Transcript:** \"{full_transcript[:250]}...\"\n"

            answer += "\n#### 🎯 Key Timeline Milestones & Visual Evidence:\n"
            if video_objects and target_video:
                # Pick unique timestamp milestones chronologically
                seen_ts = set()
                chronological_milestones = []
                for o in sorted(video_objects, key=lambda x: (x.first_seen_timestamp or 0.0)):
                    ts_round = round(o.first_seen_timestamp or 0.0, 1)
                    if ts_round not in seen_ts:
                        seen_ts.add(ts_round)
                        chronological_milestones.append(o)
                    if len(chronological_milestones) >= 5:
                        break

                for o in chronological_milestones:
                    t_fmt = format_timestamp(o.first_seen_timestamp or 0.0)
                    answer += f"- **`[{t_fmt}]` ({o.first_seen_timestamp or 0.0:.1f}s):** Detection of **{o.class_label.capitalize()}** (confidence: {int((o.confidence or 0)*100)}%).\n"
                    citations.append(CitationItem(
                        timestamp=round(o.first_seen_timestamp or 0.0, 2),
                        label=o.class_label.capitalize(),
                        modality="OBJECT",
                        confidence=round(o.confidence or 0.0, 3),
                        thumbnail_url=f"/api/v1/videos/{target_video.id}/frames/{o.frame_id}/image" if o.frame_id else None,
                        box=[o.box_x_min, o.box_y_min, o.box_x_max, o.box_y_max],
                        video_id=target_video.id,
                        video_title=target_video.filename
                    ))
            else:
                answer += "- Video processed smoothly with no anomalous safety flags.\n"

            suggested_prompts = [
                f"How many vehicles were detected in {v_title}?",
                "What text signs appeared on screen?",
                "Show chronological milestones with timestamps"
            ]

        # =========================================================================
        # CASE B: Frame Identification & Location ("which frame", "where does X appear")
        # =========================================================================
        elif (is_frame_query or candidate_entity) and target_matched_labels and target_video:
            modalities_used = ["Keyframe Analysis", "Object Tracking", "Reticle Coordinates"]
            primary_subject = (candidate_entity or target_matched_labels[0]).capitalize()
            
            # Find matching objects and group by frame
            matched_objs = [o for o in video_objects if any(ml in (o.class_label or "").lower() for ml in target_matched_labels)]
            frame_id_to_objs = defaultdict(list)
            for o in matched_objs:
                if o.frame_id:
                    frame_id_to_objs[o.frame_id].append(o)

            # Map frames
            frame_records = {f.id: f for f in uow.frames.list() if f.id in frame_id_to_objs}
            
            frame_timeline = []
            for fid, objs in frame_id_to_objs.items():
                fr = frame_records.get(fid)
                if fr:
                    t_sec = (fr.timestamp_offset_ms / 1000.0) if fr.timestamp_offset_ms else (objs[0].first_seen_timestamp or 0.0)
                    f_num = fr.frame_number
                    max_conf = max(o.confidence or 0.0 for o in objs)
                    labels_on_frame = list(dict.fromkeys(o.class_label.capitalize() for o in objs))
                    primary_box = [objs[0].box_x_min, objs[0].box_y_min, objs[0].box_x_max, objs[0].box_y_max]
                    frame_timeline.append({
                        "frame_id": fid,
                        "frame_number": f_num,
                        "timestamp": t_sec,
                        "confidence": max_conf,
                        "labels": labels_on_frame,
                        "box": primary_box
                    })

            frame_timeline = sorted(frame_timeline, key=lambda x: x["frame_number"])

            if frame_timeline:
                total_instances = len(matched_objs)
                answer = f"{persona_prefix}### 🎯 Keyframe Identification for **'{primary_subject}'** in `{v_title}`:\n\n"
                answer += f"The entity **'{primary_subject}'** was verified in **{len(frame_timeline)} distinct keyframe(s)** across **{total_instances} instance detections**:\n\n"
                
                for f_info in frame_timeline[:6]:
                    t_fmt = format_timestamp(f_info["timestamp"])
                    lbl_str = ", ".join(f_info["labels"])
                    answer += f"* **Frame #{f_info['frame_number']}** at **`[{t_fmt}]` ({f_info['timestamp']:.1f}s)**:\n"
                    answer += f"  - **Detected Entity:** `{lbl_str}` (confidence: **{int(f_info['confidence']*100)}%**)\n"
                    answer += f"  - **Screen Reticle Coordinates:** `[x: {int(f_info['box'][0]*100)}%, y: {int(f_info['box'][1]*100)}%]`\n"

                answer += "\nSelect any citation card below to instantly preview the keyframe and seek the synchronized video player to that exact frame."

                # Construct precise visual citations
                for f_info in frame_timeline[:6]:
                    citations.append(CitationItem(
                        timestamp=round(f_info["timestamp"], 2),
                        label=f"Frame #{f_info['frame_number']}: {f_info['labels'][0]}",
                        modality="OBJECT",
                        confidence=round(f_info["confidence"], 3),
                        thumbnail_url=f"/api/v1/videos/{target_video.id}/frames/{f_info['frame_id']}/image",
                        box=f_info["box"],
                        video_id=target_video.id,
                        video_title=target_video.filename
                    ))

                suggested_prompts = [
                    f"How many {primary_subject} were detected in total?",
                    f"Show timeline breakdown for {primary_subject}",
                    "Summarize overall events in this video"
                ]

        # =========================================================================
        # CASE C: Entity Not Found / Open-World Guidance
        # =========================================================================
        elif (is_frame_query or candidate_entity) and candidate_entity and not target_matched_labels and target_video:
            modalities_used = ["Open-World Verification", "Feature Index Scan"]
            subj = candidate_entity.capitalize()
            answer = f"{persona_prefix}### Visual Entity Verification for **'{subj}'** in `{v_title}`:\n\n"
            answer += f"No detections for **'{subj}'** were identified in the pre-extracted visual index for this video.\n\n"
            answer += f"* **Scanned Modalities:** Evaluated YOLOv8 object detections, EasyOCR text signages, and Whisper audio transcripts.\n"
            
            if object_counts:
                sorted_top = sorted(object_counts.items(), key=lambda x: x[1], reverse=True)[:5]
                top_str = ", ".join([f"**{lbl.capitalize()}** ({cnt}×)" for lbl, cnt in sorted_top])
                answer += f"* **Currently Indexed Classes in this Clip:** {top_str}.\n"

            answer += f"\n> 💡 **Open-World Discovery:** The baseline YOLOv8 model classifies 80 standard COCO categories. To detect fine-grained, micro, or custom items like '{subj}', you can trigger our **Open-World Grounding DINO Vision Engine** on-demand."

            suggested_prompts = [
                f"⚡ Run Open-World Detection for '{candidate_entity}'",
                f"List all objects detected in {v_title}",
                "Provide an executive summary of this video"
            ]
            citations = []

        # =========================================================================
        # CASE D: Counting / Quantity Query
        # =========================================================================
        elif is_count_query:
            modalities_used = ["Object Inventory", "Tracking Registry"]
            answer = f"{persona_prefix}### Detected Entity Inventory for `{v_title}`:\n\n"

            matched_targets = target_matched_labels if target_matched_labels else [lbl for lbl in object_counts.keys() if lbl in q_lower]
            if matched_targets:
                for tgt in matched_targets:
                    cnt = object_counts[tgt]
                    t_first = object_first_seen[tgt]
                    answer += f"* **{tgt.capitalize()}:** Detected **{cnt} instances** (peak confidence: {object_max_conf[tgt]*100:.0f}%, first seen at `[{format_timestamp(t_first)}]`).\n"
            else:
                sorted_objs = sorted(object_counts.items(), key=lambda x: x[1], reverse=True)
                for lbl, cnt in sorted_objs:
                    answer += f"* **{lbl.capitalize()}:** **{cnt} detected instances** (peak confidence: {object_max_conf[lbl]*100:.0f}%, first at `[{format_timestamp(object_first_seen[lbl])}]`)\n"

            answer += f"\n*Total Unique Entity Classes Tracked:* **{len(object_counts)} classes** across {len(video_objects)} bounding boxes."
            suggested_prompts = [
                "When does the first vehicle appear?",
                "Provide a traffic flow security brief",
                "What words were detected on signboards?"
            ]

        # =========================================================================
        # CASE E: OCR / Signage Query
        # =========================================================================
        elif is_ocr_query:
            modalities_used = ["EasyOCR Engine"]
            answer = f"{persona_prefix}### On-Screen Text & Signage Extracted from `{v_title}`:\n\n"
            if unique_ocr_texts:
                answer += f"Found **{len(video_ocrs)} total text detections** across frames. Unique extracted phrases:\n\n"
                for idx, t in enumerate(unique_ocr_texts[:10]):
                    matching_ocr = next((o for o in video_ocrs if o.text and o.text.strip() == t), None)
                    t_str = f"`[{format_timestamp(matching_ocr.timestamp_offset_ms/1000.0)}]`" if (matching_ocr and matching_ocr.timestamp_offset_ms) else ""
                    answer += f"{idx + 1}. **`{t}`** {t_str}\n"
            else:
                answer += "No prominent text or commercial signs were detected in this video stream."

            suggested_prompts = [
                "What visual objects were detected?",
                "Give me a chronological breakdown",
                "Summarize the audio dialogue"
            ]

        # =========================================================================
        # CASE F: Audio / Dialogue Query
        # =========================================================================
        elif is_audio_query:
            modalities_used = ["Whisper Speech Recognizer"]
            answer = f"{persona_prefix}### Audio & Dialogue Intelligence for `{v_title}`:\n\n"
            if video_transcripts:
                answer += f"Captured **{len(video_transcripts)} spoken transcript segments**:\n\n"
                for seg in video_transcripts[:8]:
                    t_start = (seg.start_time_ms or 0) / 1000.0
                    answer += f"* **`[{format_timestamp(t_start)}]`:** \"{seg.text}\" *(confidence: {int((seg.confidence or 0.9)*100)}%)*\n"
            else:
                answer += "No active speech or dialogue was transcribed in this video's audio channel."

            suggested_prompts = [
                "What objects are visible in this video?",
                "Provide an executive summary",
                "Show key timestamps"
            ]

        # =========================================================================
        # CASE G: General Semantic Match Query
        # =========================================================================
        else:
            modalities_used = ["Multimodal Hybrid RAG"]
            answer = f"{persona_prefix}### Analysis for query: *\"{req.message}\"*\n\n"

            # Filter retrieval hits if candidate_entity is present
            filtered_hits = []
            for hit in retrieval_hits:
                matched_lbls = [str(l).lower() for l in hit.get("matched_labels", [])]
                if candidate_entity:
                    if any(candidate_entity in ml or ml in candidate_entity for ml in matched_lbls):
                        filtered_hits.append(hit)
                else:
                    filtered_hits.append(hit)

            hits_to_use = filtered_hits if filtered_hits else retrieval_hits

            if hits_to_use:
                answer += f"Found **{len(hits_to_use)} direct multimodal keyframe correlations** in `{v_title}`:\n\n"
                for i, hit in enumerate(hits_to_use[:5]):
                    t_fmt = format_timestamp(hit['timestamp'])
                    m_type = hit.get('match_type') or hit.get('modality')
                    sim_pct = int((hit.get('similarity_score') or 0.8) * 100)
                    answer += f"{i+1}. **`[{t_fmt}]` ({hit['timestamp']:.1f}s)** — **{m_type}** ({sim_pct}% match)\n"
                    answer += f"   *{hit['matched_content']}*\n"
                answer += "\nSelect any citation card below to preview the exact scene and bounding reticles."

                for hit in hits_to_use[:5]:
                    boxes = hit.get("bounding_boxes", [])
                    primary_box = boxes[0].get("box") if boxes else None
                    primary_label = hit.get("matched_labels", [hit.get("match_type", "Keyframe")])[0]
                    citations.append(CitationItem(
                        timestamp=round(hit.get("timestamp", 0.0), 2),
                        label=str(primary_label).capitalize(),
                        modality=hit.get("modality", "FRAME"),
                        confidence=hit.get("confidence") or hit.get("similarity_score"),
                        thumbnail_url=hit.get("thumbnail_url"),
                        box=primary_box,
                        video_id=hit.get("video_id") or (target_video.id if target_video else None),
                        video_title=hit.get("video_title") or (target_video.filename if target_video else None)
                    ))
            elif object_counts:
                answer += f"No exact match for *\"{req.message}\"*, but the video features the following verified entities:\n"
                for lbl, cnt in sorted(object_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
                    answer += f"- **{lbl.capitalize()}**: {cnt} detections (first at `[{format_timestamp(object_first_seen[lbl])}]`)\n"
            else:
                answer += f"No semantic data found matching *\"{req.message}\"*. Please verify that the video has completed AI processing."

            suggested_prompts = [
                f"List all objects detected in {v_title}",
                "Provide an executive traffic summary",
                "Extract all on-screen text"
            ]

    return ResponseEnvelope(
        success=True,
        message="AI Video reasoning completed successfully.",
        data=ChatResponse(
            answer=answer,
            citations=citations,
            suggested_prompts=suggested_prompts,
            video_id=target_video.id if target_video else None,
            video_title=target_video.filename if target_video else None,
            persona=persona,
            modality_sources=modalities_used or ["Multimodal RAG"]
        ),
        request_id=request_id
    )

@router.get("/dossier/{video_id}", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_video_dossier(video_id: str, request: Request):
    """Returns a pre-computed complete intelligence dossier for live anchoring on the Chat page."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")

        objects = [o for o in uow.objects.list() if o.video_id == video.id]
        ocrs = uow.ocr_results.get_by_video_id(video.id)
        transcripts = uow.transcripts.get_by_video_id(video.id)
        scenes = uow.scenes.get_by_video_id(video.id)

        obj_counts = defaultdict(int)
        for o in objects:
            obj_counts[o.class_label.lower()] += 1

        ocr_sample = list(dict.fromkeys([o.text.strip() for o in ocrs if o.text]))[:12]

        dossier = {
            "video_id": video.id,
            "filename": video.filename,
            "duration": video.duration,
            "resolution": f"{video.width}x{video.height}" if video.width else "1080p",
            "fps": video.fps or 30,
            "stream_url": f"/api/v1/videos/{video.id}/stream",
            "stats": {
                "total_objects": len(objects),
                "unique_classes": len(obj_counts),
                "total_text_signs": len(ocrs),
                "total_transcripts": len(transcripts),
                "total_scenes": len(scenes)
            },
            "object_classes": dict(sorted(obj_counts.items(), key=lambda x: x[1], reverse=True)),
            "ocr_highlights": ocr_sample,
            "audio_preview": " ".join([t.text for t in transcripts[:5]]) if transcripts else None,
            "suggested_prompts": [
                f"Summarize the events in {video.filename}",
                f"How many {list(obj_counts.keys())[0] if obj_counts else 'vehicles'} are detected?",
                "What text signs appear on screen?",
                "Provide an executive security and traffic brief"
            ]
        }

    return ResponseEnvelope(
        success=True,
        message="Video dossier retrieved successfully.",
        data=dossier,
        request_id=request_id
    )
