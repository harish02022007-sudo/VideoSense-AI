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
