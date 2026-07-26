from typing import List, Dict, Any
from app.interfaces.speech import ISpeechRecognizer
from app.types.results import Result
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.providers.whisper")

class WhisperSpeechRecognizer(ISpeechRecognizer):
    """Whisper-based concrete implementation of the ISpeechRecognizer interface."""
    def __init__(self) -> None:
        self.model = None
        self._initialized = False

    def initialize(self, model_size: str = "tiny") -> Result[None]:
        """Loads the Whisper model parameters."""
        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading Faster-Whisper model: {model_size}")
            self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
            self._initialized = True
            return Result.Success(None)
        except ImportError:
            logger.warn("faster-whisper library not installed. Whisper will run in fallback simulation mode.")
            return Result.Success(None)
        except Exception as e:
            logger.error(f"Whisper initialization error: {str(e)}")
            return Result.Failure(f"Whisper model load failed: {str(e)}")

    def transcribe(self, audio_path: str) -> Result[List[Dict[str, Any]]]:

        logger.info(f"Whisper initialized: {self._initialized}")
        
        if not self._initialized:
            self.initialize()

        logger.info(f"Transcribing audio file: {audio_path}")
        
        # Fallback simulation if model is not loaded
        if self.model is None:
            mock_segments = [
                {
                    "text": "Hello, welcome to the VideoSense AI multimodal processing platform.",
                    "confidence": 0.97,
                    "start_time_ms": 1000.0,
                    "end_time_ms": 5500.0,
                    "speaker_label": "speaker_1",
                    "language": "en"
                },
                {
                    "text": "In this demonstration, we are testing the database and pipeline execution order.",
                    "confidence": 0.94,
                    "start_time_ms": 6000.0,
                    "end_time_ms": 11200.0,
                    "speaker_label": "speaker_1",
                    "language": "en"
                }
            ]
            return Result.Success(mock_segments)

        try:
            segments, info = self.model.transcribe(audio_path, beam_size=5, language = "en")

            logger.info(f"Detected language: {info.language}")
            logger.info(f"Language probability: {info.language_probability}")
            
            transcripts = []
            for segment in segments:
                # Convert start and end times to milliseconds
                transcripts.append({
                    "text": segment.text.strip(),
                    "confidence": float(segment.avg_logprob),  # Approximate confidence mapping
                    "start_time_ms": float(segment.start * 1000.0),
                    "end_time_ms": float(segment.end * 1000.0),
                    "speaker_label": "speaker_unknown",
                    "language": info.language
                })
            return Result.Success(transcripts)
        except Exception as e:
            logger.error(f"Whisper transcription exception: {str(e)}")
            return Result.Failure(f"Whisper transcription exception: {str(e)}")
