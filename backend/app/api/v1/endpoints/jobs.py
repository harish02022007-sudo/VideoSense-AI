import uuid
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Request
from app.db.unit_of_work import UnitOfWork
from app.core.exceptions import ValidationError, DatabaseError
from app.schemas.common import ResponseEnvelope
from app.schemas.job import JobStatusDTO, JobLogDTO
from app.workers.worker_manager import WorkerManager

router = APIRouter()

@router.post("/{id}/cancel", response_model=ResponseEnvelope[Dict[str, str]])
async def cancel_job(id: str, request: Request):
    """Signals cancellation to an active background job."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        job = uow.jobs.get(id)
        if not job:
            raise ValidationError(f"Job with ID {id} not found.")
        
        if job.status not in ["queued", "processing"]:
            raise ValidationError(f"Job is in '{job.status}' state and cannot be cancelled.")
            
        job.status = "cancelled"
        job.cancelled_at = datetime.utcnow() if "datetime" in globals() else None
        uow.commit()

    return ResponseEnvelope(
        success=True,
        message="Job cancellation request received.",
        data={"job_id": id, "status": "cancelled"},
        request_id=request_id
    )


@router.post("/{id}/retry", response_model=ResponseEnvelope[Dict[str, str]])
async def retry_job(id: str, request: Request):
    """Retries a failed or cancelled processing pipeline run."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        job = uow.jobs.get(id)
        if not job:
            raise ValidationError(f"Job with ID {id} not found.")
            
        if job.status not in ["failed", "cancelled"]:
            raise ValidationError(f"Only failed or cancelled jobs can be retried (current: {job.status}).")
            
        # Reset job state parameters
        job.status = "queued"
        job.progress = 0
        job.failure_reason = None
        job.error_code = None
        job.error_message = None
        job.retry_count += 1
        video_id = job.video_id
        uow.commit()

    # Re-queue job task
    await WorkerManager.enqueue_job(video_id, id, {"correlation_id": request_id})

    return ResponseEnvelope(
        success=True,
        message="Job retrying started successfully.",
        data={"job_id": id, "status": "queued"},
        request_id=request_id
    )


@router.get("", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def list_jobs(request: Request, limit: int = 50):
    """Lists recent pipeline jobs with video filenames and current status."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        jobs = uow.jobs.list()
        jobs.sort(key=lambda j: j.started_at or (j.video.uploaded_at if j.video else datetime.min) or datetime.min, reverse=True)
        jobs = jobs[:limit]
        
        results = []
        for j in jobs:
            results.append({
                "id": j.id,
                "video_id": j.video_id,
                "filename": j.video.filename if j.video else "Unknown",
                "status": j.status,
                "current_stage": j.current_stage or "queued",
                "progress": j.progress or 0,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
                "retry_count": j.retry_count,
                "error_message": j.error_message,
                "worker_id": j.worker_id
            })
            
    return ResponseEnvelope(
        success=True,
        message="Jobs retrieved successfully.",
        data=results,
        request_id=request_id
    )


@router.get("/logs/recent", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def get_recent_logs(request: Request, limit: int = 100):
    """Retrieves recent logs across all pipeline jobs."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        logs = uow.processing_logs.list()
        logs.sort(key=lambda l: l.created_at or datetime.min, reverse=True)
        logs = logs[:limit]
        results = [
            {
                "id": l.id,
                "job_id": l.job_id,
                "video_id": l.video_id,
                "stage": l.stage,
                "level": l.level,
                "message": l.message,
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in logs
        ]
    return ResponseEnvelope(
        success=True,
        message="Recent processing logs retrieved.",
        data=results,
        request_id=request_id
    )


@router.get("/{id}/logs", response_model=ResponseEnvelope[List[JobLogDTO]])
async def get_job_logs(id: str, request: Request):
    """Retrieves all debug logging messages recorded by the job run."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        logs = uow.processing_logs.get_by_job_id(id)
        log_dtos = [
            JobLogDTO(
                timestamp=l.created_at,
                stage=l.stage,
                level=l.level,
                message=l.message
            )
            for l in logs
        ]
        
    return ResponseEnvelope(
        success=True,
        message="Job execution logs retrieved successfully.",
        data=log_dtos,
        request_id=request_id
    )
