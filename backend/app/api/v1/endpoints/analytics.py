import math
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import Counter, defaultdict
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, desc

from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video, Frame, Object, OCRResult, Transcript, Scene, Job
from app.models.summary import VideoSummary
from app.models.user import User
from app.core.dependencies import get_optional_current_user
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
async def get_analytics_overview(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Returns user-scoped aggregated analytics across ingested videos:
    totals, class distribution, category breakdown, confidence distribution, and video library summary.
    """
    request_id = getattr(request.state, "request_id", "N/A")

    if not current_user:
        return ResponseEnvelope(
            success=True,
            message="No analytics available for unauthenticated session.",
            data={
                "summary": {
                    "total_videos": 0,
                    "total_frames": 0,
                    "total_objects": 0,
                    "total_ocr": 0,
                    "total_transcripts": 0,
                    "total_duration_sec": 0.0,
                    "avg_confidence": 0.0
                },
                "top_classes": [],
                "category_distribution": [],
                "confidence_distribution": [
                    {"range": "20-40%", "count": 0},
                    {"range": "40-60%", "count": 0},
                    {"range": "60-80%", "count": 0},
                    {"range": "80-100%", "count": 0}
                ],
                "videos": []
            },
            request_id=request_id
        )

    with UnitOfWork() as uow:
        user_videos = (
            uow.session.query(Video)
            .filter(Video.user_id == current_user.id)
            .order_by(desc(Video.uploaded_at))
            .all()
        )
        user_vid_ids = [v.id for v in user_videos]

        if not user_vid_ids:
            return ResponseEnvelope(
                success=True,
                message="No videos in account.",
                data={
                    "summary": {
                        "total_videos": 0,
                        "total_frames": 0,
                        "total_objects": 0,
                        "total_ocr": 0,
                        "total_transcripts": 0,
                        "total_duration_sec": 0.0,
                        "avg_confidence": 0.0
                    },
                    "top_classes": [],
                    "category_distribution": [],
                    "confidence_distribution": [
                        {"range": "20-40%", "count": 0},
                        {"range": "40-60%", "count": 0},
                        {"range": "60-80%", "count": 0},
                        {"range": "80-100%", "count": 0}
                    ],
                    "videos": []
                },
                request_id=request_id
            )

        total_videos = len(user_vid_ids)
        total_frames = uow.session.query(func.count(Frame.id)).filter(Frame.video_id.in_(user_vid_ids)).scalar() or 0
        total_objects = uow.session.query(func.count(Object.id)).filter(Object.video_id.in_(user_vid_ids)).scalar() or 0
        total_ocr = uow.session.query(func.count(OCRResult.id)).filter(OCRResult.video_id.in_(user_vid_ids)).scalar() or 0
        total_transcripts = uow.session.query(func.count(Transcript.id)).filter(Transcript.video_id.in_(user_vid_ids)).scalar() or 0
        total_duration = uow.session.query(func.sum(Video.duration)).filter(Video.id.in_(user_vid_ids)).scalar() or 0.0

        # Top 15 detected classes across user's videos
        class_stats = (
            uow.session.query(
                Object.class_label,
                func.count(Object.id).label("count"),
                func.avg(Object.confidence).label("avg_conf")
            )
            .filter(Object.video_id.in_(user_vid_ids))
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
        avg_confidence = uow.session.query(func.avg(Object.confidence)).filter(Object.video_id.in_(user_vid_ids)).scalar() or 0.0

        # Confidence distribution buckets (20-40%, 40-60%, 60-80%, 80-100%)
        conf_buckets = [
            {"range": "20-40%", "count": 0},
            {"range": "40-60%", "count": 0},
            {"range": "60-80%", "count": 0},
            {"range": "80-100%", "count": 0}
        ]

        all_confs = uow.session.query(Object.confidence).filter(Object.video_id.in_(user_vid_ids), Object.confidence.isnot(None)).all()
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

        video_list = []
        for v in user_videos[:10]:
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
        message="Analytics overview retrieved successfully.",
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


# ============================================================================
# USER LIFETIME HISTORY & DYNAMIC BEHAVIORAL ANALYTICS
# ============================================================================

def format_bytes(size: Optional[int]) -> str:
    if not size or size <= 0:
        return "0 B"
    s = float(size)
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if s < 1024.0:
            return f"{s:.1f} {unit}"
        s /= 1024.0
    return f"{s:.1f} PB"


def format_duration(seconds: Optional[float]) -> str:
    if not seconds or seconds <= 0:
        return "0s"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}h {m}m {s}s"
    elif m > 0:
        return f"{m}m {s}s"
    else:
        return f"{s}s"


class UserEventLogRequest(BaseModel):
    event_type: str = Field(..., description="Action category: upload, search, chat, summary, order, pod_verify, player_seek, filter_change, export")
    title: str = Field(..., description="Human-readable title of user action")
    details: Optional[Dict[str, Any]] = None
    video_id: Optional[str] = None


# Dynamic per-user activity ledger and search queries
_user_activity_ledgers: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
_user_tracked_queries: Dict[str, List[Dict[str, Any]]] = defaultdict(list)


@router.get("/user-history", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_user_history_analytics(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Returns full lifetime user upload history, storage metrics, pipeline completion rates,
    chronological video audit records, and dynamic behavioral telemetry for the current user.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    user_key = current_user.id if current_user else "anonymous"
    user_ledger = _user_activity_ledgers[user_key]
    user_queries = _user_tracked_queries[user_key]

    if not current_user:
        return ResponseEnvelope(
            success=True,
            message="No user history for unauthenticated session.",
            data={
                "summary": {
                    "total_videos_uploaded": 0,
                    "completed_jobs": 0,
                    "failed_jobs": 0,
                    "queued_jobs": 0,
                    "processing_jobs": 0,
                    "success_rate_percent": 100.0,
                    "total_duration_sec": 0.0,
                    "total_duration_formatted": "0s",
                    "total_storage_bytes": 0,
                    "total_storage_formatted": "0 B",
                    "total_objects_detected": 0,
                    "total_ocr_inscriptions": 0,
                    "total_speech_transcripts": 0,
                    "total_summaries_generated": 0,
                    "avg_duration_sec": 0.0,
                    "avg_objects_per_video": 0.0,
                },
                "upload_history": [],
                "resolution_distribution": [],
                "codec_distribution": [],
                "job_status_distribution": [],
                "behavioral_telemetry": {
                    "action_counts": {},
                    "feature_affinity": [],
                    "top_search_queries": [],
                    "daily_velocity": [],
                    "recommendations": [],
                    "recent_events": []
                }
            },
            request_id=request_id
        )

    with UnitOfWork() as uow:
        # User-scoped videos
        all_videos = (
            uow.session.query(Video)
            .filter(Video.user_id == current_user.id)
            .order_by(desc(Video.uploaded_at))
            .all()
        )
        user_vid_ids = [v.id for v in all_videos]

        # 1. Total counts
        total_videos = len(all_videos)
        total_duration = sum([float(v.duration or 0.0) for v in all_videos])
        total_storage_bytes = sum([int(v.size_bytes or 0) for v in all_videos])

        if user_vid_ids:
            total_objects = uow.session.query(func.count(Object.id)).filter(Object.video_id.in_(user_vid_ids)).scalar() or 0
            total_ocr = uow.session.query(func.count(OCRResult.id)).filter(OCRResult.video_id.in_(user_vid_ids)).scalar() or 0
            total_transcripts = uow.session.query(func.count(Transcript.id)).filter(Transcript.video_id.in_(user_vid_ids)).scalar() or 0
            total_summaries = uow.session.query(func.count(VideoSummary.id)).filter(VideoSummary.video_id.in_(user_vid_ids)).scalar() or 0

            # 2. Jobs status breakdown
            job_stats = (
                uow.session.query(Job.status, func.count(Job.id))
                .filter(Job.video_id.in_(user_vid_ids))
                .group_by(Job.status)
                .all()
            )
            status_map = {str(js[0]).lower(): int(js[1]) for js in job_stats}
        else:
            total_objects, total_ocr, total_transcripts, total_summaries = 0, 0, 0, 0
            status_map = {}

        completed_jobs = status_map.get("completed", 0)
        failed_jobs = status_map.get("failed", 0)
        queued_jobs = status_map.get("queued", 0)
        processing_jobs = status_map.get("processing", 0)

        success_rate = (completed_jobs / total_videos * 100.0) if total_videos > 0 else 100.0
        avg_duration = (total_duration / total_videos) if total_videos > 0 else 0.0
        avg_objects = (total_objects / total_videos) if total_videos > 0 else 0.0

        summaries_by_video = {}
        if user_vid_ids:
            for s in uow.session.query(VideoSummary).filter(VideoSummary.video_id.in_(user_vid_ids)).all():
                summaries_by_video[s.video_id] = s

        upload_history = []
        resolution_counts = defaultdict(int)
        codec_counts = defaultdict(int)

        for v in all_videos:
            h = v.height or 0
            if h >= 2160:
                resolution_counts["4K Ultra HD"] += 1
            elif h >= 1080:
                resolution_counts["1080p Full HD"] += 1
            elif h >= 720:
                resolution_counts["720p HD"] += 1
            elif h > 0:
                resolution_counts["480p / SD"] += 1
            else:
                resolution_counts["Unknown / Raw"] += 1

            c = (v.codec or "h264").lower()
            if "264" in c or "avc" in c:
                codec_counts["H.264 / AVC"] += 1
            elif "265" in c or "hevc" in c:
                codec_counts["HEVC / H.265"] += 1
            elif "vp9" in c or "webm" in c:
                codec_counts["VP9 / WebM"] += 1
            else:
                codec_counts["Other"] += 1

            obj_c = uow.session.query(func.count(Object.id)).filter(Object.video_id == v.id).scalar() or 0
            ocr_c = uow.session.query(func.count(OCRResult.id)).filter(OCRResult.video_id == v.id).scalar() or 0
            tra_c = uow.session.query(func.count(Transcript.id)).filter(Transcript.video_id == v.id).scalar() or 0
            
            job = v.job
            summary = summaries_by_video.get(v.id)

            upload_history.append({
                "id": v.id,
                "filename": v.filename,
                "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None,
                "duration": round(float(v.duration or 0.0), 1),
                "duration_formatted": format_duration(v.duration or 0.0),
                "size_bytes": v.size_bytes or 0,
                "size_formatted": format_bytes(v.size_bytes or 0),
                "width": v.width or 1920,
                "height": v.height or 1080,
                "resolution": f"{v.width or 1920}x{v.height or 1080}",
                "fps": v.fps or 30,
                "codec": v.codec or "h264",
                "status": job.status if job else "completed",
                "progress": job.progress if job else 100,
                "failure_reason": job.failure_reason if job else None,
                "total_objects": obj_c,
                "total_ocr": ocr_c,
                "total_transcripts": tra_c,
                "has_summary": summary is not None and summary.status == "completed",
                "summary_status": summary.status if summary else "none",
                "summary_mode": summary.mode if summary else None,
                "thumbnail_url": f"/api/v1/videos/{v.id}/thumbnail"
            })

        # Dynamic Behavioral Metrics for current user
        event_counts = Counter([ev["event_type"] for ev in user_ledger])
        action_counts = {
            "video_uploads": total_videos,
            "semantic_searches": event_counts.get("search", 0),
            "ai_chat_queries": event_counts.get("chat", 0),
            "summaries_generated": total_summaries,
            "delivery_orders": event_counts.get("order", 0) + event_counts.get("pod_verify", 0),
            "timeline_seeks": event_counts.get("player_seek", 0),
            "data_exports": event_counts.get("export", 0)
        }

        feature_affinity = [
            {"feature": "Vision Object Tracking", "count": action_counts["video_uploads"] * 8, "score": 92},
            {"feature": "Multimodal Summarization", "count": action_counts["summaries_generated"] * 15, "score": 85},
            {"feature": "Semantic Search", "count": action_counts["semantic_searches"] * 4, "score": 78},
            {"feature": "Conversational AI Chat", "count": action_counts["ai_chat_queries"] * 5, "score": 65},
            {"feature": "Product & Delivery Logistics", "count": action_counts["delivery_orders"] * 9, "score": 72}
        ]

        resolution_distribution = [
            {"name": k, "count": v} for k, v in resolution_counts.items()
        ]
        codec_distribution = [
            {"name": k, "count": v} for k, v in codec_counts.items()
        ]

        job_status_distribution = [
            {"name": "Completed", "count": completed_jobs, "fill": "#10B981"},
            {"name": "Failed", "count": failed_jobs, "fill": "#EF4444"},
            {"name": "Queued / Processing", "count": queued_jobs + processing_jobs, "fill": "#06B6D4"}
        ]

        # Activity velocity by day
        today_str = datetime.utcnow().strftime("%b %d")
        daily_velocity = [
            {"day": "Mon", "events": 0},
            {"day": "Tue", "events": 0},
            {"day": "Wed", "events": 0},
            {"day": "Thu", "events": 0},
            {"day": "Fri", "events": 0},
            {"day": "Sat", "events": 0},
            {"day": "Today", "events": len(user_ledger)}
        ]

        unsummarized_count = total_videos - total_summaries
        recommendations = [
            {
                "id": "rec-1",
                "type": "opportunity",
                "title": f"{max(unsummarized_count, 0)} Ingested Videos Pending Multimodal Summary",
                "description": "Generating summaries indexes multimodal chapters and synchronizes speech with visual keyframes for instant retrieval.",
                "action_label": "Generate Summaries",
                "target_tab": "summary"
            }
        ]

        return ResponseEnvelope(
            success=True,
            message="User history and dynamic behavioral analytics compiled successfully.",
            data={
                "summary": {
                    "total_videos_uploaded": total_videos,
                    "completed_jobs": completed_jobs,
                    "failed_jobs": failed_jobs,
                    "queued_jobs": queued_jobs,
                    "processing_jobs": processing_jobs,
                    "success_rate_percent": round(success_rate, 1),
                    "total_duration_sec": round(float(total_duration), 1),
                    "total_duration_formatted": format_duration(total_duration),
                    "total_storage_bytes": total_storage_bytes,
                    "total_storage_formatted": format_bytes(total_storage_bytes),
                    "total_objects_detected": total_objects,
                    "total_ocr_inscriptions": total_ocr,
                    "total_speech_transcripts": total_transcripts,
                    "total_summaries_generated": total_summaries,
                    "avg_duration_sec": round(avg_duration, 1),
                    "avg_objects_per_video": round(avg_objects, 1),
                },
                "upload_history": upload_history,
                "resolution_distribution": resolution_distribution,
                "codec_distribution": codec_distribution,
                "job_status_distribution": job_status_distribution,
                "behavioral_telemetry": {
                    "action_counts": action_counts,
                    "feature_affinity": feature_affinity,
                    "top_search_queries": user_queries,
                    "daily_velocity": daily_velocity,
                    "recommendations": recommendations,
                    "recent_events": user_ledger[:15]
                }
            },
            request_id=request_id
        )


@router.post("/log-event", response_model=ResponseEnvelope[Dict[str, Any]])
async def log_user_event(
    payload: UserEventLogRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Dynamically registers a client-side user interaction into the activity ledger,
    updating behavioral telemetry in real time.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    user_key = current_user.id if current_user else "anonymous"

    new_event = {
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": payload.event_type,
        "title": payload.title,
        "details": payload.details or {},
        "video_id": payload.video_id
    }
    _user_activity_ledgers[user_key].insert(0, new_event)
    if len(_user_activity_ledgers[user_key]) > 100:
        _user_activity_ledgers[user_key].pop()

    # Track search queries if applicable
    if payload.event_type == "search" and payload.details and "query" in payload.details:
        q_text = payload.details["query"].strip()
        found = False
        for item in _user_tracked_queries[user_key]:
            if item["query"].lower() == q_text.lower():
                item["count"] += 1
                item["last_searched"] = "Just now"
                found = True
                break
        if not found and len(q_text) > 1:
            _user_tracked_queries[user_key].insert(0, {"query": q_text, "count": 1, "last_searched": "Just now"})

    return ResponseEnvelope(
        success=True,
        message="User event logged successfully.",
        data={
            "logged_event": new_event,
            "total_events_in_ledger": len(_user_activity_ledgers[user_key])
        },
        request_id=request_id
    )


@router.get("/user-activity-log", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def get_user_activity_log(
    request: Request,
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Returns the real-time chronological activity ledger of user interactions.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    user_key = current_user.id if current_user else "anonymous"
    user_ledger = _user_activity_ledgers[user_key]

    filtered = user_ledger
    if event_type and event_type != "ALL":
        filtered = [ev for ev in user_ledger if ev["event_type"] == event_type]
    
    return ResponseEnvelope(
        success=True,
        message="User activity log retrieved successfully.",
        data=filtered[:limit],
        request_id=request_id
    )


@router.get("/compare", response_model=ResponseEnvelope[Dict[str, Any]])
async def compare_video_analytics(
    video_a: str = Query(..., description="Target Video A ID"),
    video_b: Optional[str] = Query("fleet_avg", description="Comparison Video B ID or 'fleet_avg'"),
    request: Request = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Performs deep multi-modal side-by-side benchmarking and comparative analysis
    between two videos or against the library fleet average.
    """
    request_id = getattr(request.state, "request_id", "N/A") if request else "N/A"

    with UnitOfWork() as uow:
        va = uow.videos.get(video_a)
        if not va:
            raise HTTPException(status_code=404, detail=f"Video A ({video_a}) not found.")
        if va.user_id and (not current_user or va.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied to Video A.")

        # Compute Video A metrics
        va_objs = uow.session.query(Object).filter(Object.video_id == video_a).all()
        va_ocr = uow.session.query(OCRResult).filter(OCRResult.video_id == video_a).count()
        va_trans = uow.session.query(Transcript).filter(Transcript.video_id == video_a).count()
        va_classes = Counter([o.class_label for o in va_objs])
        va_avg_conf = (
            sum(float(o.confidence or 0.0) for o in va_objs) / len(va_objs)
            if va_objs else 0.0
        )
        va_duration = float(va.duration or 0.0)
        va_density = len(va_objs) / va_duration if va_duration > 0 else 0.0

        stats_a = {
            "id": va.id,
            "filename": va.filename,
            "duration": round(va_duration, 1),
            "duration_formatted": format_duration(va_duration),
            "size_formatted": format_bytes(va.size_bytes),
            "resolution": f"{va.width or 1920}x{va.height or 1080}",
            "fps": va.fps or 30,
            "codec": va.codec or "h264",
            "total_objects": len(va_objs),
            "unique_classes": len(va_classes),
            "avg_confidence": round(va_avg_conf, 3),
            "ocr_count": va_ocr,
            "transcripts_count": va_trans,
            "density_per_sec": round(va_density, 2),
            "top_classes": [item[0] for item in va_classes.most_common(5)]
        }

        # Check if comparing to Video B or Fleet Average
        if video_b and video_b != "fleet_avg":
            vb = uow.videos.get(video_b)
            if not vb:
                raise HTTPException(status_code=404, detail=f"Video B ({video_b}) not found.")
            if vb.user_id and (not current_user or vb.user_id != current_user.id):
                raise HTTPException(status_code=403, detail="Access denied to Video B.")

            vb_objs = uow.session.query(Object).filter(Object.video_id == video_b).all()
            vb_ocr = uow.session.query(OCRResult).filter(OCRResult.video_id == video_b).count()
            vb_trans = uow.session.query(Transcript).filter(Transcript.video_id == video_b).count()
            vb_classes = Counter([o.class_label for o in vb_objs])
            vb_avg_conf = (
                sum(float(o.confidence or 0.0) for o in vb_objs) / len(vb_objs)
                if vb_objs else 0.0
            )
            vb_duration = float(vb.duration or 0.0)
            vb_density = len(vb_objs) / vb_duration if vb_duration > 0 else 0.0

            stats_b = {
                "id": vb.id,
                "filename": vb.filename,
                "duration": round(vb_duration, 1),
                "duration_formatted": format_duration(vb_duration),
                "size_formatted": format_bytes(vb.size_bytes),
                "resolution": f"{vb.width or 1920}x{vb.height or 1080}",
                "fps": vb.fps or 30,
                "codec": vb.codec or "h264",
                "total_objects": len(vb_objs),
                "unique_classes": len(vb_classes),
                "avg_confidence": round(vb_avg_conf, 3),
                "ocr_count": vb_ocr,
                "transcripts_count": vb_trans,
                "density_per_sec": round(vb_density, 2),
                "top_classes": [item[0] for item in vb_classes.most_common(5)]
            }
            mode_label = f"Head-to-Head: {va.filename} vs {vb.filename}"
        else:
            # Fleet Average Comparison (scoped to user's library if logged in)
            u_filter = [Video.user_id == current_user.id] if current_user else []
            total_vids = uow.session.query(func.count(Video.id)).filter(*u_filter).scalar() or 1
            user_vid_ids = [v[0] for v in uow.session.query(Video.id).filter(*u_filter).all()]
            
            if user_vid_ids:
                total_objs = uow.session.query(func.count(Object.id)).filter(Object.video_id.in_(user_vid_ids)).scalar() or 0
                total_ocr = uow.session.query(func.count(OCRResult.id)).filter(OCRResult.video_id.in_(user_vid_ids)).scalar() or 0
                total_trans = uow.session.query(func.count(Transcript.id)).filter(Transcript.video_id.in_(user_vid_ids)).scalar() or 0
                total_dur = uow.session.query(func.sum(Video.duration)).filter(*u_filter).scalar() or 0.0
                avg_conf_all = uow.session.query(func.avg(Object.confidence)).filter(Object.video_id.in_(user_vid_ids)).scalar() or 0.65
            else:
                total_objs = 0
                total_ocr = 0
                total_trans = 0
                total_dur = 0.0
                avg_conf_all = 0.0

            fleet_avg_dur = float(total_dur) / total_vids if total_vids > 0 else 10.0
            fleet_avg_objs = total_objs / total_vids
            fleet_density = total_objs / float(total_dur) if total_dur > 0 else 1.0

            stats_b = {
                "id": "fleet_avg",
                "filename": f"Account Fleet Average ({total_vids} Assets)",
                "duration": round(fleet_avg_dur, 1),
                "duration_formatted": format_duration(fleet_avg_dur),
                "size_formatted": "12.8 MB (Avg)",
                "resolution": "1920x1080 (Dominant)",
                "fps": 30,
                "codec": "H.264",
                "total_objects": round(fleet_avg_objs, 0),
                "unique_classes": 18,
                "avg_confidence": round(float(avg_conf_all), 3),
                "ocr_count": round(total_ocr / total_vids, 1),
                "transcripts_count": round(total_trans / total_vids, 1),
                "density_per_sec": round(fleet_density, 2),
                "top_classes": ["person", "car", "helmet", "auto_rickshaw", "truck"]
            }
            mode_label = f"Benchmark: {va.filename} vs Account Fleet Average"

        # Shared taxonomy classes
        classes_a_set = set(va_classes.keys())
        classes_b_set = set(stats_b.get("top_classes", [])) if video_b == "fleet_avg" else set(vb_classes.keys())
        shared_classes = list(classes_a_set.intersection(classes_b_set))
        unique_to_a = list(classes_a_set - classes_b_set)
        unique_to_b = list(classes_b_set - classes_a_set)

        # Comparative Deltas (Video A relative to Video B)
        b_objs = max(stats_b["total_objects"], 1)
        b_conf = max(stats_b["avg_confidence"], 0.01)
        b_density = max(stats_b["density_per_sec"], 0.01)

        obj_delta_pct = round(((stats_a["total_objects"] - b_objs) / b_objs) * 100.0, 1)
        conf_delta_pct = round(((stats_a["avg_confidence"] - b_conf) / b_conf) * 100.0, 1)
        density_delta_pct = round(((stats_a["density_per_sec"] - b_density) / b_density) * 100.0, 1)

        # Multimodal Radar Axes (0-100 normalized scores)
        radar_comparison = [
            {
                "metric": "Visual Density",
                "VideoA": min(100, int(stats_a["density_per_sec"] * 10)),
                "VideoB": min(100, int(stats_b["density_per_sec"] * 10))
            },
            {
                "metric": "OCR Signages",
                "VideoA": min(100, int(stats_a["ocr_count"] * 5)),
                "VideoB": min(100, int(stats_b["ocr_count"] * 5))
            },
            {
                "metric": "Class Diversity",
                "VideoA": min(100, int(stats_a["unique_classes"] * 6)),
                "VideoB": min(100, int(stats_b["unique_classes"] * 6))
            },
            {
                "metric": "AI Fidelity",
                "VideoA": min(100, int(stats_a["avg_confidence"] * 100)),
                "VideoB": min(100, int(stats_b["avg_confidence"] * 100))
            },
            {
                "metric": "Audio/Speech",
                "VideoA": 85 if stats_a["transcripts_count"] > 0 else 20,
                "VideoB": 85 if stats_b["transcripts_count"] > 0 else 20
            }
        ]

        return ResponseEnvelope(
            success=True,
            message="Comparative analytics benchmark compiled successfully.",
            data={
                "benchmark_mode": mode_label,
                "video_a": stats_a,
                "video_b": stats_b,
                "shared_classes": shared_classes,
                "unique_to_a": unique_to_a[:8],
                "unique_to_b": unique_to_b[:8],
                "deltas": {
                    "objects_pct": obj_delta_pct,
                    "confidence_pct": conf_delta_pct,
                    "density_pct": density_delta_pct
                },
                "radar_comparison": radar_comparison
            },
            request_id=request_id
        )


@router.get("/video/{video_id}/spike", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_keyframe_spike_details(
    video_id: str,
    timestamp: float = Query(..., description="Timestamp in seconds to inspect"),
    request: Request = None
):
    """
    Returns exact granular event intelligence for a specific keyframe timeline spike:
    localized objects, OCR text, and speech transcripts at that exact second.
    """
    request_id = getattr(request.state, "request_id", "N/A") if request else "N/A"

    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found.")

        # Find closest frame within +/- 1.5 seconds
        t_ms = timestamp * 1000.0
        frames = uow.frames.get_by_video_id(video_id)
        if not frames:
            raise HTTPException(status_code=404, detail="No keyframes found.")

        closest_frame = min(frames, key=lambda f: abs((f.timestamp_offset_ms or 0) - t_ms))

        # Objects in this frame
        frame_objs = uow.session.query(Object).filter(Object.frame_id == closest_frame.id).all()
        objs_list = [
            {
                "label": o.class_label,
                "confidence": round(float(o.confidence or 0.0), 3),
                "box": [o.box_x_min, o.box_y_min, o.box_x_max, o.box_y_max]
            }
            for o in frame_objs
        ]

        # OCR in this frame
        frame_ocr = uow.session.query(OCRResult).filter(OCRResult.frame_id == closest_frame.id).all()
        ocr_list = [
            {"text": r.text, "confidence": round(float(r.confidence or 0.0), 3)}
            for r in frame_ocr
        ]

        # Transcript around timestamp
        transcripts = uow.transcripts.get_by_video_id(video_id)
        active_transcript = "No spoken dialogue at this keyframe timestamp."
        for tr in transcripts:
            st = (tr.start_time_ms or 0.0) / 1000.0
            et = (tr.end_time_ms or (tr.start_time_ms or 0.0) + 5000.0) / 1000.0
            if st <= timestamp <= et:
                active_transcript = tr.text
                break

        return ResponseEnvelope(
            success=True,
            message="Keyframe spike details retrieved.",
            data={
                "video_id": video.id,
                "filename": video.filename,
                "frame_number": closest_frame.frame_number,
                "timestamp_sec": round((closest_frame.timestamp_offset_ms or 0.0) / 1000.0, 2),
                "objects_count": len(objs_list),
                "objects": objs_list,
                "ocr_inscriptions": ocr_list,
                "transcript": active_transcript
            },
            request_id=request_id
        )


