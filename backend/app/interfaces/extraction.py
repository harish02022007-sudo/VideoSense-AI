from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.types.results import Result

class IFrameExtractor(ABC):
    """Abstract interface definition for OpenCV/FFmpeg frame slicing domains."""
    @abstractmethod
    def extract_frames(self, video_path: str, output_dir: str, interval_sec: float) -> Result[List[str]]:
        """Slices frames at configurable second intervals, saving target keyframes on disk."""
        pass


class IAudioExtractor(ABC):
    """Abstract interface definition for FFmpeg audio channel extraction domains."""
    @abstractmethod
    def extract_audio(self, video_path: str, output_wav_path: str) -> Result[str]:
        """Strips audio channels into 16kHz mono WAV formats required for transcribing."""
        pass


class IPreviewGenerator(ABC):
    """Abstract interface definition for preview asset generators."""
    @abstractmethod
    def generate_preview(self, video_id: str, video_path: str) -> Result[Dict[str, Any]]:
        """Produces a thumbnail, a preview contact sheet, and a short preview video clip."""
        pass
