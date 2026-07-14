import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.db.unit_of_work import UnitOfWork
from app.models.pipeline import PipelineExecution
from app.processing.pipeline_context import PipelineContext
from app.core.constants import PipelineStage

class CheckpointManager:
    """Manages recording checkpoint snapshots in the database to allow pipeline run recovery on failures."""
    @staticmethod
    def save_checkpoint(
        context: PipelineContext,
        stage: PipelineStage,
        stage_order: int,
        status: str,  # SUCCESS, FAILED, RUNNING
        progress_start: int,
        progress_end: int,
        duration_ms: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> None:
        with UnitOfWork() as uow:
            # Query if a pipeline execution record already exists for this stage of the job
            executions = uow.pipeline_executions.get_by_job_id(context.job_id)
            existing = None
            for exe in executions:
                if exe.stage_name == stage.value:
                    existing = exe
                    break

            if not existing:
                existing = PipelineExecution(
                    id=str(uuid.uuid4()),
                    video_id=context.video_id,
                    job_id=context.job_id,
                    stage_name=stage.value,
                    stage_order=stage_order,
                    status=status,
                    progress_start=progress_start,
                    progress_end=progress_end,
                    retry_attempt=0,
                    started_at=datetime.utcnow()
                )
                uow.pipeline_executions.add(existing)
            else:
                existing.status = status
                existing.progress_end = progress_end
                existing.duration_ms = duration_ms
                existing.error_message = error_message
                existing.completed_at = datetime.utcnow()
                if metadata:
                    existing.execution_metadata = metadata

            uow.commit()

    @staticmethod
    def get_resume_stage(job_id: str) -> Optional[PipelineStage]:
        """Scans past execution records and returns the next uncompleted stage name."""
        with UnitOfWork() as uow:
            executions = uow.pipeline_executions.get_by_job_id(job_id)
            if not executions:
                return None
            
            # Sort executions by stage order
            sorted_exe = sorted(executions, key=lambda x: x.stage_order)
            
            # Find the latest successful execution stage
            latest_success = None
            for exe in sorted_exe:
                if exe.status == "SUCCESS":
                    latest_success = exe
                else:
                    break  # Stop at first failed/incomplete run to resume from here

            if not latest_success:
                return None

            # Get the list of stages in order
            stages_list = [
                PipelineStage.METADATA,
                PipelineStage.FRAME_EXTRACTION,
                PipelineStage.AUDIO_EXTRACTION,
                PipelineStage.SCENE_DETECTION,
                PipelineStage.OCR,
                PipelineStage.SPEECH,
                PipelineStage.OBJECT_DETECTION,
                PipelineStage.FACE_DETECTION,
                PipelineStage.EMBEDDING
            ]
            
            try:
                current_enum = PipelineStage(latest_success.stage_name)
                current_idx = stages_list.index(current_enum)
                if current_idx + 1 < len(stages_list):
                    return stages_list[current_idx + 1]
            except ValueError:
                pass
                
            return None
