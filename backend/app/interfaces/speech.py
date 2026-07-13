from abc import ABC, abstractmethod
from typing import Any
from app.types.results import Result

class ISpeechRecognizer(ABC):
    """Abstract interface definition for Whisper speech transcription domains."""
    @abstractmethod
    def transcribe(self, audio_path: str) -> Result[Any]:
        """Converts audio streams into structured timestamped dialogue transcripts."""
        pass
