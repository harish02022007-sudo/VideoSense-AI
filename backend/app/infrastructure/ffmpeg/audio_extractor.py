import subprocess
import os
from app.interfaces.extraction import IAudioExtractor
from app.types.results import Result
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.ffmpeg")

class FFmpegAudioExtractor(IAudioExtractor):
    """FFmpeg-based concrete implementation of the IAudioExtractor interface."""
    def extract_audio(self, video_path: str, output_wav_path: str) -> Result[str]:
        if not os.path.exists(video_path):
            return Result.Failure(f"Video file not found at: {video_path}")

        # Ensure parent directories exist
        os.makedirs(os.path.dirname(output_wav_path), exist_ok=True)

        # Command to strip audio into mono PCM 16kHz WAV format
        cmd = [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            output_wav_path
        ]

        logger.info(f"Extracting audio using FFmpeg command: {' '.join(cmd)}")
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            return Result.Success(output_wav_path)
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg audio extraction failed: {e.stderr or str(e)}")
            return Result.Failure(f"FFmpeg audio extraction failed: {e.stderr or str(e)}")
        except Exception as e:
            logger.error(f"Exception during audio extraction: {str(e)}")
            return Result.Failure(f"Exception during audio extraction: {str(e)}")
