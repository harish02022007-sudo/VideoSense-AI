from typing import Dict, Any, List
from app.core.constants import PipelineStage

class PipelineContext:
    """Maintains active state, variables, and path lists throughout a video pipeline run."""
    def __init__(
        self,
        video_id: str,
        job_id: str,
        correlation_id: str,
        initial_config: Dict[str, Any]
    ) -> None:
        self.video_id = video_id
        self.job_id = job_id
        self.correlation_id = correlation_id
        self.config = initial_config
        self.current_stage: PipelineStage = PipelineStage.METADATA
        self.progress: int = 0
        self.generated_artifacts: Dict[str, List[str]] = {
            "original": [],
            "frames": [],
            "thumbnails": [],
            "audio": [],
            "ocr": [],
            "metadata": [],
            "analysis": []
        }
        self.execution_metadata: Dict[str, Any] = {}
        self.errors: List[Dict[str, Any]] = []

    def add_artifact(self, category: str, filepath: str) -> None:
        """Adds a saved file path reference to the context."""
        if category not in self.generated_artifacts:
            self.generated_artifacts[category] = []
        self.generated_artifacts[category].append(filepath)

    def update_stage(self, stage: PipelineStage, progress: int) -> None:
        """Updates the active stage and progress metrics."""
        self.current_stage = stage
        self.progress = progress

    def add_error(self, error_code: str, message: str) -> None:
        """Appends a stage error detail descriptor."""
        self.errors.append({
            "error_code": error_code,
            "error_message": message
        })
