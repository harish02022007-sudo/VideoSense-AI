import subprocess
import os
from typing import Dict, Any
from app.interfaces.extraction import IPreviewGenerator
from app.types.results import Result
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.ffmpeg")

class FFmpegPreviewGenerator(IPreviewGenerator):
    """FFmpeg-based concrete implementation of the IPreviewGenerator interface."""
    def generate_preview(self, video_id: str, video_path: str) -> Result[Dict[str, Any]]:
        if not os.path.exists(video_path):
            return Result.Failure(f"Video file not found at: {video_path}")

        # Setup paths inside artifact thumbnails and analysis folders
        thumbnails_dir = os.path.join(settings.storage.upload_dir, video_id, "thumbnails")
        analysis_dir = os.path.join(settings.storage.upload_dir, video_id, "analysis")
        
        os.makedirs(thumbnails_dir, exist_ok=True)
        os.makedirs(analysis_dir, exist_ok=True)

        thumbnail_jpg = os.path.join(thumbnails_dir, "thumbnail.jpg")
        preview_mp4 = os.path.join(analysis_dir, "preview.mp4")

        # 1. Command to extract a single high-quality frame at 1s timestamp
        thumb_cmd = [
            "ffmpeg",
            "-y",
            "-ss", "00:00:01.00",
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            thumbnail_jpg
        ]

        # 2. Command to compile a 5-second visual clip beginning at 1s offset
        clip_cmd = [
            "ffmpeg",
            "-y",
            "-ss", "00:00:01.00",
            "-i", video_path,
            "-t", "5.00",
            "-c:v", "libx264",
            "-an",  # Strip audio channels to save memory footprint
            "-preset", "veryfast",
            preview_mp4
        ]

        try:
            logger.info("Generating preview thumbnail...")
            subprocess.run(thumb_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            
            logger.info("Generating preview video clip...")
            subprocess.run(clip_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)

            preview_details = {
                "thumbnail": f"/uploads/{video_id}/thumbnails/thumbnail.jpg",
                "preview_video": f"/uploads/{video_id}/analysis/preview.mp4",
                "duration": 5.0
            }
            return Result.Success(preview_details)

        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg preview generation failed: {e.stderr or str(e)}")
            return Result.Failure(f"FFmpeg preview generation failed: {e.stderr or str(e)}")
        except Exception as e:
            logger.error(f"Exception during preview generation: {str(e)}")
            return Result.Failure(f"Exception during preview generation: {str(e)}")
