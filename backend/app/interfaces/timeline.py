from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.types.results import Result

class ITimelineGenerator(ABC):
    """Abstract interface definition for merging multimodal extraction channels."""
    @abstractmethod
    def generate_timeline(
        self,
        scenes: List[Any],
        transcript: Dict[str, Any],
        objects: List[Any],
        ocr: List[Any],
        faces: List[Any]
    ) -> Result[List[Any]]:
        """Merges diverse AI segment lists into a single chronological timeline mapping."""
        pass
