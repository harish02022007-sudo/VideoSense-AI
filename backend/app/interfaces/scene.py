from abc import ABC, abstractmethod
from typing import List, Any
from app.types.results import Result

class ISceneDetector(ABC):
    """Abstract interface definition for PySceneDetect boundary cuts locator."""
    @abstractmethod
    def detect_scenes(self, video_path: str) -> Result[List[Any]]:
        """Splits the target video stream into chronological scene boundary limits."""
        pass
