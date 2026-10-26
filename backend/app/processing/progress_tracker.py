from datetime import datetime
from app.core.constants import PipelineStage
from app.db.unit_of_work import UnitOfWork
from app.processing.pipeline_context import PipelineContext
from app.processing.events import PipelineEventBus, StageStartedEvent, StageCompletedEvent

class ProgressTracker:
    """Updates job progress percentages, database state records, and broadcasts pipeline stage transition events."""
    _STAGE_PROGRESS_MAP = {
        PipelineStage.METADATA: 10,
        PipelineStage.FRAME_EXTRACTION: 25,
        PipelineStage.AUDIO_EXTRACTION: 40,
        PipelineStage.SCENE_DETECTION: 55,
        PipelineStage.OCR: 70,
        PipelineStage.SPEECH: 82,
        PipelineStage.OBJECT_DETECTION: 94,
        PipelineStage.FACE_DETECTION: 96,
        PipelineStage.EMBEDDING_GENERATION: 98,
        PipelineStage.COMPLETED: 100
    }

    @classmethod
    def get_progress_for_stage(cls, stage: PipelineStage) -> int:
        return cls._STAGE_PROGRESS_MAP.get(stage, 0)

    @classmethod
    def update_stage_progress(
        cls,
        context: PipelineContext,
        stage: PipelineStage,
        stage_order: int,
        duration_ms: int = 0
    ) -> None:
        new_progress = cls.get_progress_for_stage(stage)
        old_progress = context.progress
        
        # Update in-memory context state
        context.update_stage(stage, new_progress)

        # Update database persistence status parameters inside transaction
        with UnitOfWork() as uow:
            job = uow.jobs.get(context.job_id)
            if job:
                job.current_stage = stage.value
                job.progress = new_progress
                if stage == PipelineStage.COMPLETED:
                    job.status = "completed"
                    job.completed_at = datetime.utcnow() if "datetime" in globals() else None
                uow.commit()

        # Publish Event Triggers
        if stage != PipelineStage.COMPLETED:
            # Publish Stage Started Event
            PipelineEventBus.publish(StageStartedEvent(
                correlation_id=context.correlation_id,
                video_id=context.video_id,
                job_id=context.job_id,
                stage=stage.value,
                stage_order=stage_order,
                progress_start=old_progress
            ))
        else:
            # Publish Stage Completed Event
            PipelineEventBus.publish(StageCompletedEvent(
                correlation_id=context.correlation_id,
                video_id=context.video_id,
                job_id=context.job_id,
                stage=stage.value,
                progress_end=100,
                duration_ms=duration_ms
            ))
