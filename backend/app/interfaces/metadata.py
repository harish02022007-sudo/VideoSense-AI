from abc import ABC, abstractmethod
from typing import Any
from app.types.results import Result

class IMetadataService(ABC):
    """Abstract interface definition for video metadata parsing extraction domains."""
    @abstractmethod
    def extract_metadata(self, video_path: str) -> Result[Any]:
        """Reads attributes (Resolution, duration, codecs, bitrates) from a source video file."""
        pass
