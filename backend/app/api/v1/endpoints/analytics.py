import math
from typing import Dict, Any, List, Optional
from collections import Counter, defaultdict
from fastapi import APIRouter, Request, HTTPException, Query
from sqlalchemy import func, desc

from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video, Frame, Object, OCRResult, Transcript, Scene, Job
from app.schemas.common import ResponseEnvelope

router = APIRouter()

# Category definitions for semantic grouping
CATEGORY_MAP = {
    # Vehicles
    "car": "Vehicles", "automobile": "Vehicles", "motorcycle": "Vehicles", "motorbike": "Vehicles",
    "scooter": "Vehicles", "auto rickshaw": "Vehicles", "rickshaw": "Vehicles", "tuk tuk": "Vehicles",
    "bicycle": "Vehicles", "bus": "Vehicles", "truck": "Vehicles", "cart": "Vehicles", "vehicle": "Vehicles",
    # Living beings
    "person": "Living Beings", "man": "Living Beings", "woman": "Living Beings", "child": "Living Beings",
    "pedestrian": "Living Beings", "worker": "Living Beings", "crowd": "Living Beings", "cow": "Living Beings",
    "cattle": "Living Beings", "bull": "Living Beings", "dog": "Living Beings", "cat": "Living Beings",
    "horse": "Living Beings", "animal": "Living Beings",
    # Wearables & Personal Items
    "helmet": "Wearables", "cap": "Wearables", "umbrella": "Wearables", "bag": "Wearables",
    "backpack": "Wearables", "tote bag": "Wearables", "sunglasses": "Wearables", "safety vest": "Wearables",
    "footwear": "Wearables", "shoes": "Wearables", "boots": "Wearables", "diamond ring": "Wearables",
    # Urban & Infrastructure
    "building": "Infrastructure", "shop / stall": "Infrastructure", "house": "Infrastructure",
    "roof": "Infrastructure", "chimney": "Infrastructure", "road": "Infrastructure", "sidewalk": "Infrastructure",
    "tree": "Environment", "sign": "Infrastructure", "pole": "Infrastructure", "wall": "Infrastructure",
    "traffic cone": "Objects", "toolbox": "Objects", "bottle": "Objects", "foam": "Objects"
}

def get_category(label: str) -> str:
    lbl = label.lower().strip()
    return CATEGORY_MAP.get(lbl, "Other Objects")


@router.get("/overview", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_analytics_overview(request: Request):
    """
    Returns platform-wide aggregated analytics across all ingested videos:
    totals, class distribution, category breakdown, confidence distribution, and video library summary.
    """
    request_id = getattr(request.state, "request_id", "N/A")

    with UnitOfWork() as uow:
        total_videos = uow.session.query(func.count(Video.id)).scalar() or 0
        total_frames = uow.session.query(func.count(Frame.id)).scalar() or 0
        total_objects = uow.session.query(func.count(Object.id)).scalar() or 0
        total_ocr = uow.session.query(func.count(OCRResult.id)).scalar() or 0
        total_transcripts = uow.session.query(func.count(Transcript.id)).scalar() or 0
        total_duration = uow.session.query(func.sum(Video.duration)).scalar() or 0.0

        # Top 15 detected classes across all videos
        class_stats = (
            uow.session.query(
                Object.class_label,
                func.count(Object.id).label("count"),
                func.avg(Object.confidence).label("avg_conf")
            )
            .group_by(Object.class_label)
            .order_by(desc("count"))
            .limit(15)
            .all()
        )

        top_classes = [
            {
                "label": cs[0],
                "count": int(cs[1]),
                "avg_confidence": round(float(cs[2] or 0.0), 3),
                "category": get_category(cs[0])
            }
            for cs in class_stats
        ]

        # Category distribution
        category_counts = defaultdict(int)
        for tc in top_classes:
            category_counts[tc["category"]] += tc["count"]

        category_distribution = [
            {"name": cat, "count": count}
            for cat, count in category_counts.items()
        ]

        # Average confidence overall
        avg_confidence = uow.session.query(func.avg(Object.confidence)).scalar() or 0.0

        # Confidence distribution buckets (20-40%, 40-60%, 60-80%, 80-100%)
        conf_buckets = [
            {"range": "20-40%", "count": 0},
            {"range": "40-60%", "count": 0},
            {"range": "60-80%", "count": 0},
            {"range": "80-100%", "count": 0}
        ]

        all_confs = uow.session.query(Object.confidence).filter(Object.confidence.isnot(None)).all()
        for c in all_confs:
            conf = float(c[0])
            if conf < 0.40:
                conf_buckets[0]["count"] += 1
            elif conf < 0.60:
                conf_buckets[1]["count"] += 1
            elif conf < 0.80:
                conf_buckets[2]["count"] += 1
            else:
                conf_buckets[3]["count"] += 1

        # Recent videos list for quick selection
        recent_videos = (
            uow.session.query(Video)
            .order_by(desc(Video.uploaded_at))
            .limit(10)
            .all()
        )

        video_list = []
        for v in recent_videos:
            obj_c = uow.session.query(func.count(Object.id)).filter(Object.video_id == v.id).scalar() or 0
            video_list.append({
                "id": v.id,
                "filename": v.filename,
                "duration": round(float(v.duration or 0.0), 1),
                "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None,
                "objects_count": obj_c
            })

    return ResponseEnvelope(
        success=True,
        message="Platform analytics overview retrieved successfully.",
        data={
            "summary": {
                "total_videos": total_videos,
                "total_frames": total_frames,
                "total_objects": total_objects,
                "total_ocr": total_ocr,
                "total_transcripts": total_transcripts,
                "total_duration_sec": round(float(total_duration), 1),
                "avg_confidence": round(float(avg_confidence), 3)
            },
            "top_classes": top_classes,
            "category_distribution": category_distribution,
            "confidence_distribution": conf_buckets,
            "videos": video_list
        },
        request_id=request_id
    )


@router.get("/video/{video_id}", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_video_analytics(
    video_id: str,
    request: Request,
    min_confidence: float = Query(0.0, ge=0.0, le=1.0)
):
    """
    Returns deep-dive granular analytics for a specific video:
    - Object class distribution
    - Temporal density across timestamps (keyframes)
    - Spatial screen quadrant heatmap
    - Extracted OCR text signatures
    - AI confidence calibration curve
    """
    request_id = getattr(request.state, "request_id", "N/A")

    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(status_code=404, detail=f"Video {video_id} not found.")

        # Frames
        frames = sorted(uow.frames.get_by_video_id(video_id), key=lambda f: f.frame_number)
        frame_map = {f.id: f for f in frames}

        # Objects
        query = uow.session.query(Object).filter(Object.video_id == video_id)
        if min_confidence > 0.0:
            query = query.filter(Object.confidence >= min_confidence)
        objects = query.all()

        # OCR Results
        ocr_results = (
            uow.session.query(OCRResult)
            .filter(OCRResult.video_id == video_id)
            .order_by(desc(OCRResult.confidence))
            .all()
        )

        # Transcripts
        transcripts = uow.transcripts.get_by_video_id(video_id)

        # Class frequency ranking
        class_counter = Counter()
        class_conf_sum = defaultdict(float)
        for obj in objects:
            lbl = obj.class_label
            class_counter[lbl] += 1
            class_conf_sum[lbl] += float(obj.confidence or 0.0)

        class_distribution = []
        for lbl, count in class_counter.most_common():
            avg_c = class_conf_sum[lbl] / count if count > 0 else 0.0
            class_distribution.append({
                "label": lbl,
                "count": count,
                "avg_confidence": round(avg_c, 3),
                "category": get_category(lbl)
            })

        # Category breakdown
        category_counts = defaultdict(int)
        for cd in class_distribution:
            category_counts[cd["category"]] += cd["count"]

        category_distribution = [
            {"name": cat, "count": count}
            for cat, count in category_counts.items()
        ]

        # Temporal Density: timeline progression
        timeline_density = []
        objects_by_frame_id = defaultdict(list)
        for obj in objects:
            objects_by_frame_id[obj.frame_id].append(obj)

        for f in frames:
            f_objs = objects_by_frame_id.get(f.id, [])
            top_f_labels = Counter([o.class_label for o in f_objs]).most_common(3)
            timeline_density.append({
                "frame_number": f.frame_number,
                "timestamp_sec": round((f.timestamp_offset_ms or 0.0) / 1000.0, 2),
                "objects_count": len(f_objs),
                "top_labels": ", ".join([l[0] for l in top_f_labels]) if top_f_labels else "None"
            })

        # Spatial Heatmap: Screen Quadrants (Top-Left, Top-Right, Bottom-Left, Bottom-Right, Center)
        spatial_quadrants = {
            "Top Left": 0,
            "Top Right": 0,
            "Bottom Left": 0,
            "Bottom Right": 0,
            "Center Zone": 0
        }

        vw = float(video.width or 1920)
        vh = float(video.height or 1080)

        for obj in objects:
            if obj.box_x_min is None or obj.box_x_max is None or obj.box_y_min is None or obj.box_y_max is None:
                continue
            cx = (float(obj.box_x_min) + float(obj.box_x_max)) / 2.0 / vw
            cy = (float(obj.box_y_min) + float(obj.box_y_max)) / 2.0 / vh

            # Check if within center rectangle (0.3 to 0.7 in both x and y)
            if 0.3 <= cx <= 0.7 and 0.3 <= cy <= 0.7:
                spatial_quadrants["Center Zone"] += 1
            elif cx < 0.5 and cy < 0.5:
                spatial_quadrants["Top Left"] += 1
            elif cx >= 0.5 and cy < 0.5:
                spatial_quadrants["Top Right"] += 1
            elif cx < 0.5 and cy >= 0.5:
                spatial_quadrants["Bottom Left"] += 1
            else:
                spatial_quadrants["Bottom Right"] += 1

        spatial_distribution = [
            {"quadrant": k, "count": v}
            for k, v in spatial_quadrants.items()
        ]

        # Confidence distribution buckets
        conf_buckets = [
            {"range": "20-40%", "count": 0},
            {"range": "40-60%", "count": 0},
            {"range": "60-80%", "count": 0},
            {"range": "80-100%", "count": 0}
        ]
        for obj in objects:
            c = float(obj.confidence or 0.0)
            if c < 0.40:
                conf_buckets[0]["count"] += 1
            elif c < 0.60:
                conf_buckets[1]["count"] += 1
            elif c < 0.80:
                conf_buckets[2]["count"] += 1
            else:
                conf_buckets[3]["count"] += 1

        # OCR Highlights (clean unique texts)
        seen_texts = set()
        ocr_stream = []
        for ocr in ocr_results:
            txt = ocr.text.strip()
            if len(txt) > 1 and txt not in seen_texts:
                seen_texts.add(txt)
                frame = frame_map.get(ocr.frame_id)
                t_sec = (frame.timestamp_offset_ms or 0.0) / 1000.0 if frame else (ocr.frame_timestamp or 0.0)
                ocr_stream.append({
                    "id": ocr.id,
                    "text": txt,
                    "confidence": round(float(ocr.confidence), 3),
                    "timestamp_sec": round(t_sec, 2),
                    "frame_number": frame.frame_number if frame else 1
                })
                if len(ocr_stream) >= 20:
                    break

        # Summary KPIs
        total_obj_count = len(objects)
        unique_classes_count = len(class_counter)
        avg_conf = (
            sum(float(o.confidence or 0.0) for o in objects) / total_obj_count
            if total_obj_count > 0 else 0.0
        )

        return ResponseEnvelope(
            success=True,
            message="Video granular analytics compiled successfully.",
            data={
                "video": {
                    "id": video.id,
                    "filename": video.filename,
                    "duration": round(float(video.duration or 0.0), 1),
                    "fps": video.fps or 30,
                    "resolution": f"{video.width or 1920}x{video.height or 1080}",
                    "total_frames_analyzed": len(frames)
                },
                "kpis": {
                    "total_objects": total_obj_count,
                    "unique_classes": unique_classes_count,
                    "avg_confidence": round(avg_conf, 3),
                    "ocr_hits_count": len(ocr_results),
                    "transcripts_count": len(transcripts)
                },
                "class_distribution": class_distribution,
                "category_distribution": category_distribution,
                "timeline_density": timeline_density,
                "spatial_distribution": spatial_distribution,
                "confidence_distribution": conf_buckets,
                "ocr_stream": ocr_stream
            },
            request_id=request_id
        )
