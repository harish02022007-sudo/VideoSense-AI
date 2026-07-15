import asyncio
import uuid
import os
from typing import Dict, Any

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    Request
)

from app.core.container import Container
from app.db.unit_of_work import UnitOfWork

from app.models.analysis import Video, Job
from app.models.processing_config import VideoProcessingConfig

from app.utils.validators import VideoValidator
from app.utils.hashing import calculate_sha256

from app.core.logging import get_logger
from app.core.exceptions import (
    ValidationError,
    StorageError,
    DatabaseError
)

from app.schemas.common import ResponseEnvelope
from app.schemas.video import (
    VideoUploadResponse,
    VideoDetailsDTO,
    VideoProcessingConfigDTO
)

from app.workers.worker_manager import WorkerManager


router = APIRouter()                        

logger = get_logger("app.api.videos")



# ============================================================
# METADATA EXTRACTION BACKGROUND TASK
# ============================================================

def run_metadata_extraction_task(
    video_id: str,
    job_id: str,
    video_path: str
) -> None:

    logger.info(
        f"Starting metadata extraction for {video_id}",
        extra={
            "video_id": video_id,
            "job_id": job_id
        }
    )


    metadata_service = Container.get_metadata_service()


    with UnitOfWork() as uow:


        job = uow.jobs.get(job_id)


        if not job:

            logger.error(
                "Job not found during metadata extraction"
            )

            return



        # -----------------------------
        # VALIDATING STATE
        # -----------------------------

        job.status = "validating"
        job.current_stage = "metadata_validation"
        job.progress = 5

        uow.commit()



        # -----------------------------
        # EXTRACT METADATA
        # -----------------------------

        result = metadata_service.extract_metadata(
            video_path
        )



        video = uow.videos.get(video_id)


        if not video:

            logger.error(
                "Video record missing"
            )

            return



        if result.success:


            meta = result.value


            video.duration = meta.get("duration")
            video.fps = meta.get("fps")
            video.width = meta.get("width")
            video.height = meta.get("height")
            video.codec = meta.get("codec")



            # -----------------------------
            # METADATA COMPLETE
            # -----------------------------

            job.status = "metadata"
            job.current_stage = "metadata_completed"
            job.progress = 10


            uow.commit()



            logger.info(
                f"Metadata completed for {video_id}"
            )



            # -----------------------------
            # QUEUE AI PIPELINE
            # -----------------------------

            pipeline_config = {

                "correlation_id":
                    "metadata_completed",

                "enable_ocr": True,

                "enable_audio": True,

                "enable_objects": True,

                "enable_scene_detection": True,

                "frame_interval": 1,

                "whisper_model":
                    "whisper-tiny",

                "yolo_model":
                    "yolov8"
            }



            try:
                if WorkerManager._loop is None:
                    raise RuntimeError(
                        "Worker event loop is not initialized."
                    )

                future = asyncio.run_coroutine_threadsafe(
                    WorkerManager.enqueue_job(
                        video_id,
                        job_id,
                        pipeline_config
                    ),
                    WorkerManager._loop
                )

                future.result()

                logger.info(
                    f"Pipeline queued {job_id}"
                )

            except Exception as e:

                logger.error(
                    f"Pipeline queue failed: {str(e)}"
                )



        else:


            job.status = "failed"

            job.current_stage = (
                "metadata_failed"
            )

            job.failure_reason = result.error


            uow.commit()



            logger.error(
                f"Metadata extraction failed: {result.error}"
            )




# ============================================================
# UPLOAD VIDEO
# ============================================================


@router.post(
    "/upload",
    response_model=ResponseEnvelope[VideoUploadResponse]
)
async def upload_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(None)
):


    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )


    content = await file.read()


    size_bytes = len(content)



    validation = VideoValidator.validate(
        file.filename,
        size_bytes,
        file.content_type
    )


    if not validation.success:

        raise ValidationError(
            validation.error
        )



    checksum = calculate_sha256(
        content
    )


    filename = os.path.basename(
        file.filename
    )



    video_id = str(uuid.uuid4())

    job_id = str(uuid.uuid4())



    storage = Container.get_storage_manager()



    save_result = storage.save_original(
        video_id,
        filename,
        content
    )


    if not save_result.success:

        raise StorageError(
            save_result.error
        )



    saved_path = save_result.value




    try:


        with UnitOfWork() as uow:



            video = Video(

                id=video_id,

                filename=filename,

                filepath=saved_path,

                mime_type=file.content_type,

                size_bytes=size_bytes,

                sha256_hash=checksum
            )


            uow.videos.add(video)



            job = Job(

                id=job_id,

                video_id=video_id,

                status="queued",

                progress=0

            )


            uow.jobs.add(job)



            uow.commit()



    except Exception as e:


        raise DatabaseError(
            str(e)
        )




    background_tasks.add_task(

        run_metadata_extraction_task,

        video_id,

        job_id,

        saved_path

    )



    return ResponseEnvelope(

        success=True,

        message=
        "Video uploaded successfully.",

        data=VideoUploadResponse(

            video_id=video_id,

            job_id=job_id,

            filename=filename,

            status="queued",

            progress=0
        ),

        request_id=request_id

    )



# ============================================================
# VIDEO DETAILS
# ============================================================


@router.get(
    "/{id}",
    response_model=ResponseEnvelope[VideoDetailsDTO]
)
async def get_video_details(
    id: str,
    request: Request
):


    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )



    with UnitOfWork() as uow:


        video = uow.videos.get(id)



        if not video:

            raise ValidationError(
                f"Video {id} not found"
            )



        status = "unknown"

        progress = 0



        if video.job:

            status = video.job.status

            progress = video.job.progress



        result = VideoDetailsDTO(

            id=video.id,

            filename=video.filename,

            size_bytes=video.size_bytes,

            uploaded_at=video.uploaded_at,

            status=status,

            progress=progress

        )



    return ResponseEnvelope(

        success=True,

        message=
        "Video details retrieved successfully.",

        data=result,

        request_id=request_id

    )

# ============================================================
# CONFIGURE PROCESSING
# ============================================================


@router.post(
    "/{id}/configure",
    response_model=ResponseEnvelope[Dict[str, str]]
)
async def configure_processing(
    id: str,
    config: VideoProcessingConfigDTO,
    request: Request
):

    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )


    with UnitOfWork() as uow:


        video = uow.videos.get(id)


        if not video:

            raise ValidationError(
                f"Video {id} not found"
            )



        existing = (
            uow.processing_configs
            .get_by_video_id(id)
        )



        if existing:


            existing.enable_ocr = (
                config.enable_ocr
            )

            existing.enable_audio = (
                config.enable_audio
            )

            existing.enable_objects = (
                config.enable_objects
            )

            existing.enable_scene_detection = (
                config.enable_scene_detection
            )

            existing.frame_rate = (
                config.frame_rate
            )

            existing.whisper_model = (
                config.whisper_model
            )

            existing.yolo_model = (
                config.yolo_model
            )



        else:


            cfg = VideoProcessingConfig(

                id=str(uuid.uuid4()),

                video_id=id,

                enable_ocr=config.enable_ocr,

                enable_audio=config.enable_audio,

                enable_objects=config.enable_objects,

                enable_scene_detection=
                    config.enable_scene_detection,

                frame_rate=config.frame_rate,

                whisper_model=
                    config.whisper_model,

                yolo_model=
                    config.yolo_model
            )


            uow.processing_configs.add(cfg)



        uow.commit()



    return ResponseEnvelope(

        success=True,

        message=
        "Processing configuration saved.",

        data={
            "video_id": id
        },

        request_id=request_id

    )




# ============================================================
# START PROCESSING MANUALLY
# ============================================================


@router.post(
    "/{id}/process",
    response_model=ResponseEnvelope[Dict[str, str]]
)
async def start_processing(
    id: str,
    request: Request
):


    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )



    with UnitOfWork() as uow:


        video = uow.videos.get(id)



        if not video:

            raise ValidationError(
                f"Video {id} not found"
            )



        if not video.job:

            raise ValidationError(
                "No job attached"
            )



        job_id = video.job.id



        video.job.status = "queued"

        video.job.current_stage = "queued"

        video.job.progress = 0



        cfg = {}



        db_cfg = (
            uow.processing_configs
            .get_by_video_id(id)
        )


        if db_cfg:


            cfg = {

                "enable_ocr":
                    db_cfg.enable_ocr,

                "enable_audio":
                    db_cfg.enable_audio,

                "enable_objects":
                    db_cfg.enable_objects,

                "enable_scene_detection":
                    db_cfg.enable_scene_detection,

                "frame_interval":
                    db_cfg.frame_rate,

                "whisper_model":
                    db_cfg.whisper_model,

                "yolo_model":
                    db_cfg.yolo_model

            }



        uow.commit()




    cfg["correlation_id"] = request_id



    await WorkerManager.enqueue_job(

        id,

        job_id,

        cfg

    )



    return ResponseEnvelope(

        success=True,

        message=
        "Video queued successfully.",

        data={

            "video_id": id,

            "job_id": job_id

        },

        request_id=request_id

    )




# ============================================================
# PROCESSING STATUS
# ============================================================


@router.get(
    "/{id}/processing",
    response_model=ResponseEnvelope[Dict[str, Any]]
)
async def get_processing_status(
    id: str,
    request: Request
):


    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )


    with UnitOfWork() as uow:


        video = uow.videos.get(id)



        if not video:

            raise ValidationError(
                f"Video {id} not found"
            )



        job = video.job



        if not job:

            raise ValidationError(
                "Job missing"
            )



        data = {


            "video_id": id,

            "job_id": job.id,

            "status": job.status,

            "current_stage":
                job.current_stage
                or "queued",

            "progress":
                job.progress,

            "worker_id":
                job.worker_id,

            "estimated_completion_time":
                job.estimated_completion_time,

            "error_message":
                job.error_message

        }




    return ResponseEnvelope(

        success=True,

        message=
        "Video processing status retrieved successfully.",

        data=data,

        request_id=request_id

    )





# ============================================================
# ARTIFACTS
# ============================================================


@router.get(
    "/{id}/artifacts",
    response_model=ResponseEnvelope[Dict[str, Any]]
)
async def get_video_artifacts(
    id: str,
    request: Request
):


    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )


    from app.infrastructure.storage.artifact_manager import (
        ArtifactManager
    )



    with UnitOfWork() as uow:


        video = uow.videos.get(id)


        if not video:

            raise ValidationError(
                "Video not found"
            )



    frames = (
        ArtifactManager
        .list_artifacts(id, "frames")
        .value
        or []
    )


    thumbnails = (
        ArtifactManager
        .list_artifacts(id, "thumbnails")
        .value
        or []
    )


    audio = (
        ArtifactManager
        .list_artifacts(id, "audio")
        .value
        or []
    )


    analysis = (
        ArtifactManager
        .list_artifacts(id, "analysis")
        .value
        or []
    )



    return ResponseEnvelope(

        success=True,

        message=
        "Artifacts retrieved successfully.",

        data={

            "video_id": id,

            "frames": frames,

            "thumbnails": thumbnails,

            "audio": audio,

            "analysis": analysis

        },

        request_id=request_id

    )





# ============================================================
# ANALYTICS
# ============================================================


@router.get(
    "/{id}/analytics",
    response_model=ResponseEnvelope[Dict[str, Any]]
)
async def get_video_analytics(
    id: str,
    request: Request
):


    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )



    with UnitOfWork() as uow:


        video = uow.videos.get(id)


        if not video:

            raise ValidationError(
                "Video not found"
            )



        analytics = {


            "video_id": id,


            "detected_objects_count":
                len(
                    uow.objects
                    .get_by_video_id(id)
                ),


            "ocr_hits_count":
                len(
                    uow.ocr_results
                    .get_by_video_id(id)
                ),


            "scene_cuts_count":
                len(
                    uow.scenes
                    .get_by_video_id(id)
                ),


            "processing_statistics": {


                "file_size_mb":
                    video.size_bytes /
                    (1024 * 1024),


                "fps":
                    video.fps,


                "duration_sec":
                    video.duration

            }

        }



    return ResponseEnvelope(

        success=True,

        message=
        "Analytics generated.",

        data=analytics,

        request_id=request_id

    )




# ============================================================
# PREVIEW GENERATION
# ============================================================


@router.post(
    "/{id}/preview/generate",
    response_model=ResponseEnvelope[Dict[str, Any]]
)
async def generate_preview(
    id: str,
    request: Request
):


    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )



    with UnitOfWork() as uow:


        video = uow.videos.get(id)



        if not video:

            raise ValidationError(
                "Video not found"
            )


        path = video.filepath



    service = Container.get_preview_generator()



    result = service.generate_preview(
        id,
        path
    )



    if not result.success:

        raise StorageError(
            result.error
        )



    return ResponseEnvelope(

        success=True,

        message=
        "Preview generated.",

        data=result.value,

        request_id=request_id

    )




# ============================================================
# GET PREVIEW
# ============================================================


@router.get(
    "/{id}/preview",
    response_model=ResponseEnvelope[Dict[str, Any]]
)
async def get_preview(
    id: str,
    request: Request
):


    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )


    from app.infrastructure.storage.artifact_manager import (
        ArtifactManager
    )


    thumb = ArtifactManager.get_artifact_path(
        id,
        "thumbnails",
        "thumbnail.jpg"
    )


    preview = ArtifactManager.get_artifact_path(
        id,
        "analysis",
        "preview.mp4"
    )



    data = {


        "video_id": id,


        "thumbnail":

            "/uploads/"
            f"{id}/thumbnails/thumbnail.jpg"

            if os.path.exists(thumb)

            else None,



        "preview_video":

            "/uploads/"
            f"{id}/analysis/preview.mp4"

            if os.path.exists(preview)

            else None

    }




    return ResponseEnvelope(

        success=True,

        message=
        "Preview data retrieved.",

        data=data,

        request_id=request_id

    )