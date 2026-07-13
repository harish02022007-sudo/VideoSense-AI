from abc import ABC, abstractmethod
from typing import List, Tuple
from app.types.results import Result

class IStorageManager(ABC):
    """Abstract interface definition for standardized file/directory storage structures."""
    @abstractmethod
    def save_original(self, video_id: str, filename: str, content: bytes) -> Result[str]:
        """Saves a raw uploaded video file on disk in a secure folder layout."""
        pass

    @abstractmethod
    def get_stage_dir(self, video_id: str, stage_name: str) -> str:
        """Resolves target absolute folder paths on the system for custom processing stages."""
        pass

    @abstractmethod
    def cleanup_video(self, video_id: str) -> Result[None]:
        """Deletes all processing folders, manifests, and videos relating to a specific ID."""
        pass
