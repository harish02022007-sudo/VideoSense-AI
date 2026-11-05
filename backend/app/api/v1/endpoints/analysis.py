import os
import glob
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse

from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Object
from app.models.user import User
from app.core.dependencies import get_optional_current_user
from app.core.container import Container
from app.core.exceptions import ValidationError
from app.schemas.common import ResponseEnvelope
from app.core.config import settings
from app.infrastructure.storage.path_manager import PathManager
from app.infrastructure.storage.supabase_storage import supabase_storage
from app.core.logging import get_logger

logger = get_logger("app.api.analysis")

router = APIRouter()

@router.api_route("/{id}/stream", methods=["GET", "HEAD"])
async def stream_video(id: str, request: Request):
    """
    Streams the original video file with HTTP Range support for fluid HTML5 seeking,
    bypassing URL encoding and hashtag/emoji filename issues.
    Automatically redirects to Supabase CDN if cloud storage is enabled.
    """
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise HTTPException(status_code=404, detail=f"Video with ID {id} not found.")
        v_filename = video.filename
        v_filepath = video.filepath

    # 1. Direct Supabase CDN stream redirect if stored URL is cloud URL
    if v_filepath and v_filepath.startswith("http"):
        return RedirectResponse(url=v_filepath, status_code=307)

    # 2. Redirect to Supabase CDN if Supabase storage is active
    if supabase_storage.is_enabled and v_filename:
        cloud_url = supabase_storage.get_public_url(f"{id}/original/{v_filename}")
        return RedirectResponse(url=cloud_url, status_code=307)

    video_path = PathManager.resolve_video_file(id, v_filename, v_filepath)
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(
            status_code=404,
            detail="Video stream unavailable on ephemeral storage. Please re-upload your video or select a sample."
        )

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("range")

    if not range_header:
        return FileResponse(
            video_path,
            media_type="video/mp4",
            filename=os.path.basename(video_path),
            headers={"Accept-Ranges": "bytes", "Content-Length": str(file_size)},
            content_disposition_type="inline"
        )

    try:
        range_val = range_header.strip().replace("bytes=", "")
        parts = range_val.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
        start = max(0, min(start, file_size - 1))
        end = max(start, min(end, file_size - 1))
        chunk_length = end - start + 1

        def iterfile():
            with open(video_path, "rb") as f:
                f.seek(start)
                bytes_left = chunk_length
                while bytes_left > 0:
                    chunk = f.read(min(bytes_left, 512 * 1024))
                    if not chunk:
                        break
                    bytes_left -= len(chunk)
                    yield chunk

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_length),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iterfile(), status_code=206, headers=headers)
    except Exception:
        return FileResponse(
            video_path,
            media_type="video/mp4",
            filename=os.path.basename(video_path),
            headers={"Accept-Ranges": "bytes"},
            content_disposition_type="inline"
        )


@router.api_route("/{id}/frames/{frame_id}/image", methods=["GET", "HEAD"])
async def get_frame_image(id: str, frame_id: str):
    """Serves the extracted JPEG keyframe image with robust dynamic extraction, Supabase CDN, and fallback."""
    with UnitOfWork() as uow:
        frame = uow.frames.get(frame_id)
        if not frame:
            raise HTTPException(status_code=404, detail=f"Frame {frame_id} not found.")

        # 1. If frame stored filepath is a Supabase cloud CDN URL, redirect directly
        if frame.filepath and frame.filepath.startswith("http"):
            return RedirectResponse(url=frame.filepath, status_code=307)

        # 2. If Supabase is enabled, redirect directly to Supabase public CDN URL
        if supabase_storage.is_enabled:
            cloud_url = supabase_storage.get_public_url(f"{id}/frames/frame_{frame.frame_number:05d}.jpg")
            return RedirectResponse(url=cloud_url, status_code=307)

        filepath = frame.filepath
        if filepath and not os.path.exists(filepath) and "Projects" in filepath:
            fixed_cand = filepath.replace("Projects\\Sem Project", "Sem Project").replace("Projects/Sem Project", "Sem Project")
            if os.path.exists(fixed_cand):
                filepath = fixed_cand

        if not filepath or not os.path.exists(filepath):
            curr_dir = os.path.dirname(os.path.abspath(__file__))
            candidate_dirs = [
                os.path.abspath(settings.storage.upload_dir),
                os.path.abspath(os.path.join(curr_dir, "..", "..", "..", "uploads")),
                os.path.abspath("./uploads"),
                os.path.abspath("./backend/uploads"),
            ]
            frame_file = None
            for bdir in candidate_dirs:
                ff = os.path.join(bdir, id, "frames", f"frame_{frame.frame_number:05d}.jpg")
                if os.path.exists(ff):
                    filepath = ff
                    frame_file = ff
                    break
            if not frame_file:
                frame_file = os.path.join(candidate_dirs[0], id, "frames", f"frame_{frame.frame_number:05d}.jpg")

            if not filepath or not os.path.exists(filepath):
                # Dynamic keyframe extraction fallback from video
                video = uow.videos.get(id)
                v_path = PathManager.resolve_video_file(id, video.filename if video else None, video.filepath if video else None)
                if v_path and os.path.exists(v_path):
                    try:
                        import cv2
                        os.makedirs(os.path.dirname(frame_file), exist_ok=True)
                        cap = cv2.VideoCapture(v_path)
                        cap.set(cv2.CAP_PROP_POS_MSEC, frame.timestamp_offset_ms or 0)
                        ret, img_mat = cap.read()
                        cap.release()
                        if ret and img_mat is not None:
                            cv2.imwrite(frame_file, img_mat)
                            filepath = frame_file
                    except Exception as e:
                        logger.warning(f"Dynamic frame extraction error: {e}")

                if not filepath or not os.path.exists(filepath):
                    # Generate a clean styled fallback keyframe image so UI canvas always displays
                    try:
                        import cv2
                        import numpy as np
                        os.makedirs(os.path.dirname(frame_file), exist_ok=True)
                        ph = np.zeros((720, 1280, 3), dtype=np.uint8)
                        ph[:] = (20, 18, 14)
                        cv2.rectangle(ph, (15, 15), (1265, 705), (45, 40, 35), 2)
                        ts = (frame.timestamp_offset_ms or 0.0) / 1000.0
                        cv2.putText(ph, f"Keyframe #{frame.frame_number} [{ts:.2f}s]", (50, 360), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 210, 255), 2, cv2.LINE_AA)
                        cv2.putText(ph, "VideoSense AI Dynamic Telemetry Active", (50, 420), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 180, 180), 1, cv2.LINE_AA)
                        cv2.imwrite(frame_file, ph)
                        filepath = frame_file
                    except Exception:
                        raise HTTPException(status_code=404, detail="Frame image file not found on disk.")

        return FileResponse(filepath, media_type="image/jpeg")


@router.api_route("/{id}/thumbnail", methods=["GET", "HEAD"])
async def get_video_thumbnail(id: str):
    """Serves the thumbnail/poster image for a video (first keyframe or dynamic capture)."""
    # 1. Supabase CDN redirect if cloud storage is active
    if supabase_storage.is_enabled:
        cloud_url = supabase_storage.get_public_url(f"{id}/thumbnails/thumbnail.jpg")
        return RedirectResponse(url=cloud_url, status_code=307)

    with UnitOfWork() as uow:
        frames = uow.frames.get_by_video_id(id)
        if frames:
            frames.sort(key=lambda f: f.frame_number)
            first_frame = frames[0]
            try:
                return await get_frame_image(id, first_frame.id)
            except Exception:
                pass

        video = uow.videos.get(id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found.")

        base_dir = os.path.abspath(settings.storage.upload_dir)
        thumb_file = os.path.join(base_dir, id, "thumbnails", "thumbnail.jpg")
        if os.path.exists(thumb_file):
            return FileResponse(thumb_file, media_type="image/jpeg")

        v_path = PathManager.resolve_video_file(id, video.filename, video.filepath)
        if v_path and os.path.exists(v_path):
            try:
                import cv2
                os.makedirs(os.path.dirname(thumb_file), exist_ok=True)
                cap = cv2.VideoCapture(v_path)
                cap.set(cv2.CAP_PROP_POS_MSEC, 1000)
                ret, mat = cap.read()
                if not ret or mat is None:
                    cap.set(cv2.CAP_PROP_POS_MSEC, 0)
                    ret, mat = cap.read()
                cap.release()
                if ret and mat is not None:
                    cv2.imwrite(thumb_file, mat)
                    return FileResponse(thumb_file, media_type="image/jpeg")
            except Exception:
                pass

        # Generate a styled placeholder poster image
        try:
            import cv2
            import numpy as np
            os.makedirs(os.path.dirname(thumb_file), exist_ok=True)
            ph = np.zeros((720, 1280, 3), dtype=np.uint8)
            ph[:] = (25, 20, 16)
            cv2.rectangle(ph, (15, 15), (1265, 705), (55, 48, 40), 2)
            cv2.putText(ph, (video.filename or "VideoSense AI")[:35], (50, 360), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 210, 255), 2, cv2.LINE_AA)
            cv2.putText(ph, "VideoSense AI Video", (50, 420), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 180, 180), 1, cv2.LINE_AA)
            cv2.imwrite(thumb_file, ph)
            return FileResponse(thumb_file, media_type="image/jpeg")
        except Exception:
            raise HTTPException(status_code=404, detail="Thumbnail not available.")


@router.get("/{id}/frames", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def get_video_frames(
    id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Returns all extracted keyframes with timestamps, image URLs, and detected objects with bounding boxes."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this video's keyframes.")

        frames = uow.frames.get_by_video_id(id)
        objects = uow.objects.get_by_video_id(id)

        # Index objects by frame_id
        objects_by_frame: Dict[str, List[Dict[str, Any]]] = {}
        for obj in objects:
            fid = obj.frame_id or "unassigned"
            if fid not in objects_by_frame:
                objects_by_frame[fid] = []
            objects_by_frame[fid].append({
                "id": obj.id,
                "label": obj.class_label,
                "confidence": round(float(obj.confidence or 0.0), 3),
                "box": [
                    round(float(obj.box_x_min or 0.0), 1),
                    round(float(obj.box_y_min or 0.0), 1),
                    round(float(obj.box_x_max or 0.0), 1),
                    round(float(obj.box_y_max or 0.0), 1),
                ]
            })

        frame_list = []
        for f in frames:
            timestamp_sec = (f.timestamp_offset_ms or 0.0) / 1000.0
            frame_objs = objects_by_frame.get(f.id, [])
            img_url = f.filepath if (f.filepath and f.filepath.startswith("http")) else f"/api/v1/videos/{id}/frames/{f.id}/image"
            frame_list.append({
                "id": f.id,
                "frame_number": f.frame_number,
                "timestamp": timestamp_sec,
                "image_url": img_url,
                "width": f.width or video.width or 1280,
                "height": f.height or video.height or 720,
                "objects_count": len(frame_objs),
                "objects": frame_objs
            })

    return ResponseEnvelope(
        success=True,
        message="Keyframes retrieved successfully.",
        data=frame_list,
        request_id=request_id
    )


@router.get("/{id}/summary", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_video_summary(
    id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Compiles intelligence summaries from processed transcripts, OCR matches, and Grounding DINO objects."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this video's summary.")

        ocr_count = len(uow.ocr_results.get_by_video_id(id))
        objects = uow.objects.get_by_video_id(id)
        unique_objects = list(set([obj.class_label for obj in objects]))
        transcripts = uow.transcripts.get_by_video_id(id)
        full_dialogue = " ".join([t.text for t in transcripts])

        summary_payload = {
            "video_id": id,
            "filename": video.filename,
            "detected_keywords": unique_objects,
            "dialogue_snippet": full_dialogue[:200] + "..." if len(full_dialogue) > 200 else full_dialogue,
            "ocr_hits_count": ocr_count,
            "objects_count": len(objects),
            "aggregated_summary": (
                f"Video analysis completed with {len(objects)} object detections (including {', '.join(unique_objects[:6])}) "
                f"and {ocr_count} on-screen text regions."
            )
        }

    return ResponseEnvelope(
        success=True,
        message="AI processing summary compiled successfully.",
        data=summary_payload,
        request_id=request_id
    )


@router.get("/{id}/timeline", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def get_video_timeline(
    id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Returns chronological timeline segment mapping records."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this video's timeline.")

        scenes = uow.scenes.get_by_video_id(id)
        timeline_segments = []
        for s in scenes:
            timeline_segments.append({
                "segment_index": s.scene_number,
                "start_time_ms": s.start_time_ms,
                "end_time_ms": s.end_time_ms,
                "title": f"Scene Segment {s.scene_number}",
                "description": f"Scene cut between {s.start_time_ms/1000.0:.2f}s and {s.end_time_ms/1000.0:.2f}s."
            })

    return ResponseEnvelope(
        success=True,
        message="Timeline segments compiled successfully.",
        data=timeline_segments,
        request_id=request_id
    )


@router.get("/{id}/insights", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_video_insights(
    id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Returns aggregated multimodal insights: transcripts, objects with bounding boxes, OCR text, and scenes."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this video's insights.")

        # 1. Transcripts
        transcripts = uow.transcripts.get_by_video_id(id)
        transcript_list = [
            {
                "id": t.id,
                "start": (t.start_time_ms or 0) / 1000.0,
                "end": (t.end_time_ms or 0) / 1000.0,
                "text": t.text or ""
            }
            for t in transcripts
        ]

        # 2. Objects with Bounding Boxes & Frame mapping
        objects = uow.objects.get_by_video_id(id)
        object_list = [
            {
                "id": o.id,
                "timestamp": (o.first_seen_timestamp or 0) / 1000.0 if (o.first_seen_timestamp and o.first_seen_timestamp > 1000) else (o.first_seen_timestamp or 0.0),
                "label": o.class_label,
                "confidence": round(float(o.confidence or 0.0), 3),
                "frame_id": o.frame_id,
                "frame_url": f"/api/v1/videos/{id}/frames/{o.frame_id}/image" if o.frame_id else None,
                "bbox": [
                    round(float(o.box_x_min or 0.0), 1),
                    round(float(o.box_y_min or 0.0), 1),
                    round(float(o.box_x_max or 0.0), 1),
                    round(float(o.box_y_max or 0.0), 1)
                ],
                "color": "border-cyan-500 bg-cyan-500/10"
            }
            for o in objects
        ]

        # 3. OCR Text
        ocr_hits = uow.ocr_results.get_by_video_id(id)
        ocr_list = [
            {
                "id": r.id,
                "timestamp": (r.frame_timestamp or 0) / 1000.0 if (r.frame_timestamp and r.frame_timestamp > 1000) else (r.frame_timestamp or 0.0),
                "text": r.text,
                "confidence": round(float(r.confidence or 0.0), 2),
                "bbox": [
                    round(float(r.box_x_min or 0.0), 1),
                    round(float(r.box_y_min or 0.0), 1),
                    round(float(r.box_x_max or 0.0), 1),
                    round(float(r.box_y_max or 0.0), 1)
                ]
            }
            for r in ocr_hits
        ]

        # 4. Scenes
        scenes = uow.scenes.get_by_video_id(id)
        scene_list = [
            {
                "segment_index": s.scene_number,
                "start": (s.start_time_ms or 0) / 1000.0,
                "end": (s.end_time_ms or 0) / 1000.0,
                "title": f"Scene {s.scene_number}",
                "summary": f"Scene cut between {(s.start_time_ms or 0)/1000.0:.1f}s and {(s.end_time_ms or 0)/1000.0:.1f}s."
            }
            for s in scenes
        ]

        # 5. Keyframes list
        frames = uow.frames.get_by_video_id(id)
        frame_list = [
            {
                "id": f.id,
                "frame_number": f.frame_number,
                "timestamp": (f.timestamp_offset_ms or 0.0) / 1000.0,
                "image_url": f.filepath if (f.filepath and f.filepath.startswith("http")) else f"/api/v1/videos/{id}/frames/{f.id}/image",
                "width": f.width or video.width or 1280,
                "height": f.height or video.height or 720
            }
            for f in frames
        ]

        # Dedicated streaming URL bypassing file name issues
        stream_url = f"/api/v1/videos/{id}/stream"

        data = {
            "video_id": id,
            "filename": video.filename,
            "duration": video.duration or 0.0,
            "stream_url": stream_url,
            "transcripts": transcript_list,
            "objects": object_list,
            "ocr_results": ocr_list,
            "scenes": scene_list,
            "frames": frame_list
        }

    return ResponseEnvelope(
        success=True,
        message="Video insights retrieved successfully.",
        data=data,
        request_id=request_id
    )


class DetectCustomClassesRequest(BaseModel):
    classes: List[str]
    threshold: Optional[float] = 0.28


@router.post("/{id}/detect-custom", response_model=ResponseEnvelope[Dict[str, Any]])
def detect_custom_classes(
    id: str,
    payload: DetectCustomClassesRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Runs on-demand Grounding DINO detection for user-specified custom classes on video keyframes.
    Saves new detections to the database and returns the detected objects.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    classes = [c.strip() for c in payload.classes if len(c.strip()) > 1]
    if not classes:
        raise ValidationError("Please provide at least one valid object class to detect.")

    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not own this video.")
        frames = sorted(uow.frames.get_by_video_id(id), key=lambda f: f.frame_number)
        frame_map = {f.filepath: f.id for f in frames}
        frame_paths = [f.filepath for f in frames if os.path.exists(f.filepath)]

    if not frame_paths:
        raise ValidationError(f"No keyframes found on disk for video {id}.")

    detector = Container.get_vision_service()
    if payload.threshold:
        detector.conf_threshold = payload.threshold

    init_res = detector.initialize()
    if not init_res.success:
        raise HTTPException(status_code=500, detail=f"Detector initialization failed: {init_res.error}")

    det_res = detector.detect_objects(frame_paths)
    if not det_res.success:
        raise HTTPException(status_code=500, detail=f"Detection failed: {det_res.error}")

    target_classes_lower = {c.lower() for c in classes}
    new_objects = [
        obj for obj in det_res.value
        if obj["class_label"].lower() in target_classes_lower or not classes
    ]
    added_count = 0
    with UnitOfWork() as uow:
        for obj in new_objects:
            fid = frame_map.get(obj["frame_path"])
            if not fid:
                continue
            entity = Object(
                id=str(uuid.uuid4()),
                video_id=id,
                frame_id=fid,
                class_label=obj["class_label"],
                confidence=obj["confidence"],
                box_x_min=obj["box_x_min"],
                box_y_min=obj["box_y_min"],
                box_x_max=obj["box_x_max"],
                box_y_max=obj["box_y_max"],
                tracking_id=None,
                first_seen_timestamp=0.0,
                last_seen_timestamp=0.0
            )
            uow.objects.add(entity)
            added_count += 1
        uow.commit()

    return ResponseEnvelope(
        success=True,
        message=f"Successfully detected and saved {added_count} custom objects.",
        data={
            "classes": classes,
            "detected_count": added_count,
            "sample_detections": new_objects[:10]
        },
        request_id=request_id
    )

