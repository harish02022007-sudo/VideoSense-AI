from abc import ABC, abstractmethod
from typing import List, Any
from app.types.results import Result

class IOCRService(ABC):
    """Abstract interface definition for frame text extraction (EasyOCR) domains."""
    @abstractmethod
    def extract_text(self, frame_paths: List[str]) -> Result[List[Any]]:
        """Scans image arrays to extract and index any text overlays found."""
        pass
