from pydantic import BaseModel, Field
from typing import Dict

class StageWeightConfig(BaseModel):
    """Configuration mapping for progress weights assigned to each pipeline stage."""
    weights: Dict[str, float] = Field(
        default={
            "validating": 5.0,
            "metadata": 5.0,
            "frame_extraction": 15.0,
            "audio_extraction": 10.0,
            "object_detection": 25.0,
            "ocr": 10.0,
            "face_detection": 5.0,
            "transcription": 15.0,
            "scene_detection": 5.0,
            "timeline": 5.0,
            "summary": 5.0
        }
    )

    def calculate_progress(self, completed_stages: Dict[str, bool]) -> int:
        total = 0.0
        for stage, completed in completed_stages.items():
            if completed and stage in self.weights:
                total += self.weights[stage]
        return min(int(total), 100)
