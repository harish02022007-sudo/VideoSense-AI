import uuid
import os
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks, Request
from app.core.container import Container
from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video, Job
from app.models.processing_config import VideoProcessingConfig
from app.utils.validators import VideoValidator
from app.utils.hashing import calculate_sha256
from app.utils.file_utils import is_safe_path
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import ValidationError, StorageError, DatabaseError
from app.schemas.common import ResponseEnvelope
from app.schemas.video import VideoUploadResponse, VideoDetailsDTO, VideoProcessingConfigDTO
from app.workers.worker_manager import WorkerManager

router = APIRouter()
logger = get_logger("app.api.videos")

def run_metadata_extraction_task(video_id: str, job_id: str, video_path: str) -> None:
    """Background task resolving video file dimensions, FPS, and durations using ffprobe."""
    logger.info(f"Triggering background metadata extraction for video: {video_id}", extra={"video_id": video_id, "job_id": job_id})
    metadata_service = Container.get_metadata_service()
    
    with UnitOfWork() as uow:
        # Update state to validating
        job = uow.jobs.get(job_id)
        if not job:
            logger.error(f"Job {job_id} not found during metadata extraction.", extra={"video_id": video_id, "job_id": job_id})
            return
            
        job.status = "validating"
        job.progress = 5
        uow.commit()

        # Run extraction
        result = metadata_service.extract_metadata(video_path)
        
        video = uow.videos.get(video_id)
        if not video:
            logger.error(f"Video {video_id} not found during metadata extraction.", extra={"video_id": video_id, "job_id": job_id})
            return

        if result.success:
            meta = result.value
            video.duration = meta.get("duration")
            video.fps = meta.get("fps")
            video.width = meta.get("width")
            video.height = meta.get("height")
            video.codec = meta.get("codec")
            
            job.status = "metadata"
            job.progress = 10
            uow.commit()
            logger.info(f"Metadata extracted successfully for video: {video_id}", extra={"video_id": video_id, "job_id": job_id})
        else:
            job.status = "failed"
            job.failure_reason = result.error
            uow.commit()
            logger.error(f"Metadata extraction failed: {result.error}", extra={"video_id": video_id, "job_id": job_id})


@router.post("/upload", response_model=ResponseEnvelope[VideoUploadResponse])
async def upload_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(None)
):
    """
    Ingests an incoming video, runs security validations, computes SHA256 checksums, 
    registers Video/Job DB records, and dispatches background metadata extractions.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    
    content = await file.read()
    size_bytes = len(content)
    
    val_result = VideoValidator.validate(file.filename, size_bytes, file.content_type)
    if not val_result.success:
        raise ValidationError(val_result.error)

    checksum = calculate_sha256(content)
    sanitized_filename = os.path.basename(file.filename)
    
    video_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    logger.info(f"Ingesting file: {sanitized_filename} (size: {size_bytes} bytes)", extra={"request_id": request_id})

    storage_manager = Container.get_storage_manager()
    save_result = storage_manager.save_original(video_id, sanitized_filename, content)
    if not save_result.success:
        raise StorageError(save_result.error)
        
    saved_filepath = save_result.value

    try:
        with UnitOfWork() as uow:
            existing_video = uow.videos.get_by_hash(checksum)
            if existing_video:
                logger.info(f"Video checksum match found. Reusing metadata from video ID: {existing_video.id}", extra={"request_id": request_id})
                saved_filepath = existing_video.filepath

            new_video = Video(
                id=video_id,
                filename=sanitized_filename,
                filepath=saved_filepath,
                mime_type=file.content_type,
                size_bytes=size_bytes,
                sha256_hash=checksum
            )
            uow.videos.add(new_video)

            new_job = Job(
                id=job_id,
                video_id=video_id,
                status="queued",
                progress=0
            )
            uow.jobs.add(new_job)
            uow.commit()
    except Exception as e:
        logger.error(f"Database insertion failed during upload: {str(e)}", extra={"request_id": request_id})
        raise DatabaseError(f"Database transaction failed: {str(e)}")

    background_tasks.add_task(
        run_metadata_extraction_task,
        video_id=video_id,
        job_id=job_id,
        video_path=saved_filepath
    )

    response_data = VideoUploadResponse(
        video_id=video_id,
        job_id=job_id,
        filename=sanitized_filename,
        status="queued",
        progress=0
    )

    return ResponseEnvelope(
        success=True,
        message="Video uploaded successfully and queued for processing.",
        data=response_data,
        request_id=request_id
    )


@router.get("/{id}", response_model=ResponseEnvelope[VideoDetailsDTO])
async def get_video_details(id: str, request: Request):
    """Retrieves basic details and processing progress of the video."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        
        job_status = "unknown"
        job_progress = 0
        if video.job:
            job_status = video.job.status
            job_progress = video.job.progress

        details = VideoDetailsDTO(
            id=video.id,
            filename=video.filename,
            size_bytes=video.size_bytes,
            uploaded_at=video.uploaded_at,
            status=job_status,
            progress=job_progress
        )

    return ResponseEnvelope(
        success=True,
        message="Video details retrieved successfully.",
        data=details,
        request_id=request_id
    )


@router.post("/{id}/configure", response_model=ResponseEnvelope[Dict[str, str]])
async def configure_processing(id: str, config: VideoProcessingConfigDTO, request: Request):
    """Sets customized pipeline processing preferences for a specific video."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        
        # Check if configuration already exists, otherwise create it
        existing_cfg = uow.processing_configs.get_by_video_id(id)
        if existing_cfg:
            existing_cfg.enable_ocr = config.enable_ocr
            existing_cfg.enable_audio = config.enable_audio
            existing_cfg.enable_objects = config.enable_objects
            existing_cfg.enable_scene_detection = config.enable_scene_detection
            existing_cfg.frame_rate = config.frame_rate
            existing_cfg.whisper_model = config.whisper_model
            existing_cfg.yolo_model = config.yolo_model
        else:
            new_cfg = VideoProcessingConfig(
                id=str(uuid.uuid4()),
                video_id=id,
                enable_ocr=config.enable_ocr,
                enable_audio=config.enable_audio,
                enable_objects=config.enable_objects,
                enable_scene_detection=config.enable_scene_detection,
                frame_rate=config.frame_rate,
                whisper_model=config.whisper_model,
                yolo_model=config.yolo_model
            )
            uow.processing_configs.add(new_cfg)
        uow.commit()

    return ResponseEnvelope(
        success=True,
        message="Video processing configuration saved successfully.",
        data={"video_id": id},
        request_id=request_id
    )


@router.post("/{id}/process", response_model=ResponseEnvelope[Dict[str, str]])
async def start_processing(id: str, request: Request):
    """Enqueues the video processing pipeline execution task."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        
        if not video.job:
            raise ValidationError(f"No job associated with video {id}.")
        
        job_id = video.job.id
        video.job.status = "queued"
        video.job.progress = 0
        uow.commit()

        # Load video configure values or default
        db_cfg = uow.processing_configs.get_by_video_id(id)
        cfg_dict = {}
        if db_cfg:
            cfg_dict = {
                "enable_ocr": db_cfg.enable_ocr,
                "enable_audio": db_cfg.enable_audio,
                "enable_objects": db_cfg.enable_objects,
                "enable_scene_detection": db_cfg.enable_scene_detection,
                "frame_interval": db_cfg.frame_rate,
                "whisper_model": db_cfg.whisper_model,
                "yolo_model": db_cfg.yolo_model
            }

    # Queue job inside WorkerManager
    cfg_dict["correlation_id"] = request_id
    await WorkerManager.enqueue_job(id, job_id, cfg_dict)

    return ResponseEnvelope(
        success=True,
        message="Video enqueued successfully for pipeline processing.",
        data={"job_id": job_id, "video_id": id},
        request_id=request_id
    )


@router.get("/{id}/processing", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_processing_status(id: str, request: Request):
    """Returns active job parameters (progress metrics, current stage, and worker updates)."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        
        if not video.job:
            raise ValidationError(f"No job associated with video {id}.")
            
        status_data = {
            "video_id": id,
            "job_id": video.job.id,
            "status": video.job.status,
            "current_stage": video.job.current_stage or "queued",
            "progress": video.job.progress,
            "worker_id": video.job.worker_id,
            "estimated_completion_time": video.job.estimated_completion_time,
            "error_message": video.job.error_message
        }

    return ResponseEnvelope(
        success=True,
        message="Video processing status retrieved successfully.",
        data=status_data,
        request_id=request_id
    )


@router.get("/{id}/artifacts", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_video_artifacts(id: str, request: Request):
    """Lists generated filenames stored in the storage directory categories."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        
    # List filenames in subfolders
    from app.infrastructure.storage.artifact_manager import ArtifactManager
    frames = ArtifactManager.list_artifacts(id, "frames").value or []
    thumbnails = ArtifactManager.list_artifacts(id, "thumbnails").value or []
    audio = ArtifactManager.list_artifacts(id, "audio").value or []
    analysis = ArtifactManager.list_artifacts(id, "analysis").value or []

    artifacts_data = {
        "video_id": id,
        "frames": [f"/uploads/{id}/frames/{f}" for f in frames],
        "thumbnails": [f"/uploads/{id}/thumbnails/{t}" for t in thumbnails],
        "audio": [f"/uploads/{id}/audio/{a}" for a in audio],
        "analysis": [f"/uploads/{id}/analysis/{an}" for an in analysis]
    }

    return ResponseEnvelope(
        success=True,
        message="Video artifacts list resolved successfully.",
        data=artifacts_data,
        request_id=request_id
    )


@router.get("/{id}/analytics", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_video_analytics(id: str, request: Request):
    """Returns aggregated metadata counts of detected OCR matches, YOLO objects, and scenes cuts."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
            
        ocr_count = len(uow.ocr_results.get_by_video_id(id))
        objects_count = len(uow.objects.get_by_video_id(id))
        scenes_count = len(uow.scenes.get_by_video_id(id))
        
        audio = uow.audio.get_by_video_id(id)
        speech_duration = audio.duration if audio else 0.0

        analytics_data = {
            "video_id": id,
            "detected_objects_count": objects_count,
            "ocr_hits_count": ocr_count,
            "scene_cuts_count": scenes_count,
            "speech_duration_sec": speech_duration,
            "processing_statistics": {
                "file_size_mb": video.size_bytes / (1024 * 1024),
                "fps": video.fps,
                "duration_sec": video.duration
            }
        }

    return ResponseEnvelope(
        success=True,
        message="Video analytics summary compiled successfully.",
        data=analytics_data,
        request_id=request_id
    )


@router.post("/{id}/preview/generate", response_model=ResponseEnvelope[Dict[str, Any]])
async def generate_preview(id: str, request: Request):
    """Triggers the FFmpeg preview sheet and short video clip generation."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        video_path = video.filepath

    preview_service = Container.get_preview_generator()
    preview_res = preview_service.generate_preview(id, video_path)
    if not preview_res.success:
        raise StorageError(preview_res.error)

    return ResponseEnvelope(
        success=True,
        message="Video previews generated successfully.",
        data=preview_res.value,
        request_id=request_id
    )


@router.get("/{id}/preview", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_preview(id: str, request: Request):
    """Retrieves preview asset URLs if generated."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")
        
    # Check if thumbnail exists on disk
    from app.infrastructure.storage.artifact_manager import ArtifactManager
    thumb_path = ArtifactManager.get_artifact_path(id, "thumbnails", "thumbnail.jpg")
    preview_path = ArtifactManager.get_artifact_path(id, "analysis", "preview.mp4")

    preview_data = {
        "video_id": id,
        "thumbnail": f"/uploads/{id}/thumbnails/thumbnail.jpg" if os.path.exists(thumb_path) else None,
        "preview_video": f"/uploads/{id}/analysis/preview.mp4" if os.path.exists(preview_path) else None,
        "duration": 5.0
    }

    return ResponseEnvelope(
        success=True,
        message="Preview data resolved successfully.",
        data=preview_data,
        request_id=request_id
    )
