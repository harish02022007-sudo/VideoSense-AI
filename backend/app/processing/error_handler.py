import uuid
from datetime import datetime
from typing import Optional
from app.db.unit_of_work import UnitOfWork
from app.models.processing_log import ProcessingLog
from app.processing.pipeline_context import PipelineContext
from app.processing.checkpoints import CheckpointManager
from app.core.constants import PipelineStage
from app.core.logging import get_logger
from app.processing.events import PipelineEventBus, ProcessingFailedEvent

logger = get_logger("app.processing.errors")

class PipelineErrorHandler:
    """Logs pipeline execution failures, writes persistent debug diagnostics, and updates Job DB states."""
    @staticmethod
    def handle_stage_failure(
        context: PipelineContext,
        stage: PipelineStage,
        stage_order: int,
        error_code: str,
        error_message: str,
        execution_time_ms: int = 0
    ) -> None:
        # Append error to context
        context.add_error(error_code, error_message)

        # Persistence inside database transaction context
        with UnitOfWork() as uow:
            # 1. Update Job Entity State
            job = uow.jobs.get(context.job_id)
            if job:
                job.status = "failed"
                job.failure_reason = f"[{stage.value}] {error_message}"
                job.error_code = error_code
                job.error_message = error_message
                job.completed_at = datetime.utcnow()

            # 2. Add Persistent Debug Logging Entity
            new_log = ProcessingLog(
                id=str(uuid.uuid4()),
                job_id=context.job_id,
                video_id=context.video_id,
                stage=stage.value,
                level="ERROR",
                message=error_message,
                log_metadata={
                    "correlation_id": context.correlation_id,
                    "error_code": error_code,
                    "execution_time_ms": execution_time_ms
                }
            )
            uow.processing_logs.add(new_log)
            uow.commit()

        # 3. Log Checkpoint State
        CheckpointManager.save_checkpoint(
            context=context,
            stage=stage,
            stage_order=stage_order,
            status="FAILED",
            progress_start=context.progress,
            progress_end=context.progress,
            duration_ms=execution_time_ms,
            error_message=error_message
        )

        # 4. Structured console JSON logging
        logger.error(
            f"Pipeline execution failed in stage '{stage.value}': {error_message}",
            extra={
                "video_id": context.video_id,
                "job_id": context.job_id,
                "stage": stage.value,
                "error_code": error_code,
                "elapsed_time": execution_time_ms / 1000.0
            }
        )

        # 5. Broadcast pipeline failure event
        PipelineEventBus.publish(ProcessingFailedEvent(
            correlation_id=context.correlation_id,
            video_id=context.video_id,
            job_id=context.job_id,
            stage=stage.value,
            error_code=error_code,
            error_message=error_message
        ))
