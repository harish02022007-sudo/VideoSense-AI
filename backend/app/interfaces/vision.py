from abc import ABC, abstractmethod
from typing import List, Any
from app.types.results import Result

class IObjectDetector(ABC):
    """Abstract interface definition for YOLO11 / Grounding DINO object classification domains."""
    @abstractmethod
    def detect_objects(self, frame_paths: List[str], caption: str = None, custom_only: bool = False) -> Result[List[Any]]:
        """Processes keyframes to locate, label, and return classification bounding boxes."""
        pass


class IFaceDetector(ABC):
    """Abstract interface definition for vision face matching & metrics tracking."""
    @abstractmethod
    def detect_faces(self, frame_paths: List[str]) -> Result[List[Any]]:
        """Maps facial coordinates and registers tracking ids over matching video frames."""
        pass
