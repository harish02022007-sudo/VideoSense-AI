import uuid
from typing import Optional, List
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Query, Depends

from app.schemas.common import ResponseEnvelope
from app.schemas.summary import (
    SummarizeRequest,
    VideoSummaryDTO,
    SummaryStatusDTO
)
from app.services.summarization_service import MultimodalSummarizationService
from app.db.unit_of_work import UnitOfWork
from app.models.user import User
from app.core.dependencies import get_optional_current_user
from app.core.logging import get_logger

logger = get_logger("app.api.summary")
router = APIRouter()


@router.post("/{video_id}/summarize", response_model=ResponseEnvelope)
async def summarize_video(
    video_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    body: Optional[SummarizeRequest] = None,
    async_run: bool = Query(True, description="Whether to execute asynchronously in the background"),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Initiates AI multimodal video summarization for the specified video.
    Supports 'visual_only' and 'audio_visual' modes.
    If cached and force_regenerate is False, returns completed summary immediately.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    req_body = body or SummarizeRequest()
    mode = req_body.mode.lower().strip()
    if mode not in ["visual_only", "audio_visual"]:
        mode = "audio_visual"

    # Verify video existence and access
    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to summarize this video.")

    # Check cache if not forcing regeneration
    if not req_body.force_regenerate:
        cached = MultimodalSummarizationService.get_summary(video_id, mode)
        if cached:
            logger.info(f"Returning cached summary for video={video_id} mode={mode}")
            return ResponseEnvelope(
                success=True,
                message="Video summary retrieved from cache.",
                data=cached.model_dump(),
                request_id=request_id
            )

    if async_run:
        # Launch background processing task
        background_tasks.add_task(
            MultimodalSummarizationService.summarize_video,
            video_id=video_id,
            mode=mode,
            force_regenerate=req_body.force_regenerate
        )

        status_dto = SummaryStatusDTO(
            video_id=video_id,
            mode=mode,
            status="queued",
            progress=5.0,
            current_stage="queued",
            stage_message=f"Summarization job queued for mode '{mode}'.",
            is_completed=False
        )

        return ResponseEnvelope(
            success=True,
            message=f"Summarization job initiated for mode '{mode}'.",
            data=status_dto.model_dump(),
            request_id=request_id
        )
    else:
        # Synchronous execution
        summary_dto = MultimodalSummarizationService.summarize_video(
            video_id=video_id,
            mode=mode,
            force_regenerate=req_body.force_regenerate
        )
        return ResponseEnvelope(
            success=True,
            message="Video summary generated successfully.",
            data=summary_dto.model_dump(),
            request_id=request_id
        )


@router.get("/{video_id}/summary/status", response_model=ResponseEnvelope)
async def get_summary_status(
    video_id: str,
    request: Request,
    mode: str = Query("audio_visual", description="Summary mode: visual_only or audio_visual"),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Checks the real-time processing status and stage progress of a summarization job.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this video's summary status.")

    clean_mode = mode.lower().strip()
    if clean_mode not in ["visual_only", "audio_visual"]:
        clean_mode = "audio_visual"

    status_dto = MultimodalSummarizationService.get_job_status(video_id, clean_mode)
    return ResponseEnvelope(
        success=True,
        message="Summary status retrieved.",
        data=status_dto.model_dump(),
        request_id=request_id
    )


@router.get("/{video_id}/summary", response_model=ResponseEnvelope)
async def get_video_summary(
    video_id: str,
    request: Request,
    mode: Optional[str] = Query(None, description="Optional mode filter: visual_only or audio_visual"),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Retrieves the completed AI summary for a video.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this video's summary.")

    clean_mode = mode.lower().strip() if mode else None
    if clean_mode and clean_mode not in ["visual_only", "audio_visual"]:
        clean_mode = None

    summary_dto = MultimodalSummarizationService.get_summary(video_id, clean_mode)
    if summary_dto:
        data_dict = summary_dto.model_dump()
        data_dict["aggregated_summary"] = summary_dto.short_summary
        return ResponseEnvelope(
            success=True,
            message="Video summary retrieved successfully.",
            data=data_dict,
            request_id=request_id
        )

    # Fallback compilation if full summary hasn't been generated yet
    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(
                status_code=404,
                detail=f"Video '{video_id}' not found."
            )
        objects = uow.objects.get_by_video_id(video_id)
        ocrs = uow.ocr_results.get_by_video_id(video_id)
        transcripts = uow.transcripts.get_by_video_id(video_id)
        unique_objects = list(set([obj.class_label for obj in objects]))
        full_dialogue = " ".join([t.text for t in transcripts])

        fallback_payload = {
            "video_id": video_id,
            "filename": video.filename,
            "video_title": video.filename,
            "mode": clean_mode or "visual_only",
            "status": "not_generated",
            "progress": 0.0,
            "current_stage": None,
            "stage_message": "Multimodal summary has not been generated yet. Click 'Generate Summary' to run analysis.",
            "short_summary": f"Video analysis indexed with {len(objects)} object detections and {len(ocrs)} on-screen text regions.",
            "detailed_summary": f"Video '{video.filename}' contains {len(objects)} detected objects across {len(unique_objects)} classes.",
            "aggregated_summary": f"Video analysis completed with {len(objects)} object detections and {len(ocrs)} on-screen text regions.",
            "detected_keywords": unique_objects,
            "dialogue_snippet": full_dialogue[:200] + "..." if len(full_dialogue) > 200 else full_dialogue,
            "ocr_hits_count": len(ocrs),
            "objects_count": len(objects),
            "key_events": [],
            "chapters": [],
            "transcript_segments": [],
            "warnings": ["AI Multimodal Summary not yet computed. Click 'Generate Summary' to begin."],
            "models_used": ["YOLOv11"]
        }

    return ResponseEnvelope(
        success=True,
        message="Basic video summary retrieved (multimodal summary not yet triggered).",
        data=fallback_payload,
        request_id=request_id
    )


@router.get("/{video_id}/summaries", response_model=ResponseEnvelope)
async def list_video_summaries(
    video_id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Lists all available summaries across modes for a given video.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    with UnitOfWork() as uow:
        video = uow.videos.get(video_id)
        if not video:
            raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found.")
        if video.user_id and (not current_user or video.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this video's summaries.")

        summaries = uow.summaries.list_by_video_id(video_id)
        results = [
            MultimodalSummarizationService._summary_entity_to_dto(s).model_dump()
            for s in summaries
            if s.status in ["completed", "partially_completed"]
        ]

    return ResponseEnvelope(
        success=True,
        message=f"Retrieved {len(results)} summaries.",
        data=results,
        request_id=request_id
    )
