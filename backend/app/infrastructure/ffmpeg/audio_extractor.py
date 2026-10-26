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
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if result.returncode == 0:
                logger.info("Audio extracted successfully.")
                return Result.Success(output_wav_path)

            # Video has no audio stream
            if "Output file does not contain any stream" in result.stderr:
                logger.warning("No audio stream found. Skipping audio extraction.")
                return Result.Success(None)

            logger.error(f"FFmpeg audio extraction failed: {result.stderr}")
            return Result.Failure(result.stderr)

        except Exception as e:
            logger.error(f"Exception during audio extraction: {str(e)}")
            return Result.Failure(str(e))