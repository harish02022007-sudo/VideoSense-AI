import subprocess
import os
import glob
from typing import List
from app.interfaces.extraction import IFrameExtractor
from app.types.results import Result
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.ffmpeg")

class FFmpegFrameExtractor(IFrameExtractor):
    """FFmpeg-based concrete implementation of the IFrameExtractor interface."""
    def extract_frames(self, video_path: str, output_dir: str, interval_sec: float) -> Result[List[str]]:
        if not os.path.exists(video_path):
            return Result.Failure(f"Video file not found at: {video_path}")

        os.makedirs(output_dir, exist_ok=True)
        # Output pattern: frame_00001.jpg
        output_pattern = os.path.join(output_dir, "frame_%05d.jpg")
        
        # FFmpeg filter to slice at interval_sec frequency
        fps_filter = f"fps=1/{interval_sec}"
        cmd = [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-vf", fps_filter,
            "-qscale:v", "2",  # High quality jpg
            output_pattern
        ]

        logger.info(f"Extracting frames using FFmpeg command: {' '.join(cmd)}")
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            # Find all matched files in directory
            frame_files = sorted(glob.glob(os.path.join(output_dir, "frame_*.jpg")))
            return Result.Success(frame_files)
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg frame extraction failed: {e.stderr or str(e)}")
            return Result.Failure(f"FFmpeg frame extraction failed: {e.stderr or str(e)}")
        except Exception as e:
            logger.error(f"Exception during frame extraction: {str(e)}")
            return Result.Failure(f"Exception during frame extraction: {str(e)}")
