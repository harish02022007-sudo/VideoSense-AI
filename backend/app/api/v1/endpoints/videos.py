import uuid
import os
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks, Request
from app.core.container import Container
from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video, Job
from app.utils.validators import VideoValidator
from app.utils.hashing import calculate_sha256
from app.utils.file_utils import is_safe_path
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import ValidationError, StorageError, DatabaseError
from app.schemas.common import ResponseEnvelope
from app.schemas.video import VideoUploadResponse

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
    
    # Read file content for validation
    content = await file.read()
    size_bytes = len(content)
    
    # Validate file size, extension, and content type
    val_result = VideoValidator.validate(file.filename, size_bytes, file.content_type)
    if not val_result.success:
        raise ValidationError(val_result.error)

    # Compute checksum hash
    checksum = calculate_sha256(content)

    # Path traversal check
    sanitized_filename = os.path.basename(file.filename)
    uploads_dir = os.path.abspath(settings.storage.upload_dir)
    target_path = os.path.join(uploads_dir, sanitized_filename) # Temporary path check
    
    # Generate unique UUID identifiers
    video_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    logger.info(f"Ingesting file: {sanitized_filename} (size: {size_bytes} bytes)", extra={"request_id": request_id})

    # Save to disk original folder using storage manager
    storage_manager = Container.get_storage_manager()
    save_result = storage_manager.save_original(video_id, sanitized_filename, content)
    if not save_result.success:
        raise StorageError(save_result.error)
        
    saved_filepath = save_result.value

    # Insert Video and Job entities inside database transaction context
    try:
        with UnitOfWork() as uow:
            # Check if video already exists by checksum hash to avoid duplicate storage
            existing_video = uow.videos.get_by_hash(checksum)
            if existing_video:
                logger.info(f"Video checksum match found. Reusing metadata from video ID: {existing_video.id}", extra={"request_id": request_id})
                # Set path to existing file, but create a new Job
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

    # Dispatch background metadata extraction task
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
