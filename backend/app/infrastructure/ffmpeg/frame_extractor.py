import subprocess
import os
import glob
from typing import List, Optional
import cv2
from app.interfaces.extraction import IFrameExtractor
from app.types.results import Result
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.ffmpeg.frames")

class FFmpegFrameExtractor(IFrameExtractor):
    """FFmpeg-based concrete implementation of the IFrameExtractor interface with content-aware keyframe filtering."""

    @staticmethod
    def compute_visual_difference(img_path1: str, img_path2: str) -> float:
        """
        Computes normalized visual difference (0.0 to 1.0) between two frames using HSV color histograms.
        Returns 0.0 for identical frames, and approaches 1.0 for completely distinct scenes.
        """
        try:
            im1 = cv2.imread(img_path1)
            im2 = cv2.imread(img_path2)
            if im1 is None or im2 is None:
                return 1.0

            # Resize to small thumbnail for ultra-fast comparison
            im1_small = cv2.resize(im1, (160, 90))
            im2_small = cv2.resize(im2, (160, 90))

            hsv1 = cv2.cvtColor(im1_small, cv2.COLOR_BGR2HSV)
            hsv2 = cv2.cvtColor(im2_small, cv2.COLOR_BGR2HSV)

            hist1 = cv2.calcHist([hsv1], [0, 1], None, [30, 32], [0, 180, 0, 256])
            hist2 = cv2.calcHist([hsv2], [0, 1], None, [30, 32], [0, 180, 0, 256])

            cv2.normalize(hist1, hist1, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
            cv2.normalize(hist2, hist2, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

            correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
            # Correlation is 1.0 for identical, -1.0 for opposite. Map to [0.0, 1.0] diff:
            diff = max(0.0, min(1.0, 1.0 - correlation))
            return float(diff)
        except Exception:
            return 1.0

    def extract_frames(
        self,
        video_path: str,
        output_dir: str,
        interval_sec: float = 1.0,
        content_aware_filter: bool = True
    ) -> Result[List[str]]:
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
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            frame_files = sorted(glob.glob(os.path.join(output_dir, "frame_*.jpg")))
            
            if not frame_files:
                logger.warn("No frames extracted by FFmpeg.")
                return Result.Success([])

            logger.info(f"FFmpeg sliced {len(frame_files)} initial candidate frames.")

            # Content-Aware Keyframe Pruning: if consecutive frames are virtually identical (>98.5% visual similarity)
            # prune redundant frames to accelerate downstream detection and prevent wasted compute
            if content_aware_filter and len(frame_files) > 4:
                distinct_frames = [frame_files[0]]
                last_kept = frame_files[0]
                pruned_count = 0

                for candidate in frame_files[1:]:
                    diff = self.compute_visual_difference(last_kept, candidate)
                    # If difference is greater than 0.025 (meaning noticeable motion or scene shift), keep as keyframe
                    if diff > 0.025:
                        distinct_frames.append(candidate)
                        last_kept = candidate
                    else:
                        # Static / duplicate frame - remove to save disk and processing bandwidth
                        try:
                            os.remove(candidate)
                            pruned_count += 1
                        except OSError:
                            pass

                logger.info(
                    f"Content-Aware Pruning: Kept {len(distinct_frames)} keyframes, pruned {pruned_count} static redundant frames."
                )
                return Result.Success(distinct_frames)

            return Result.Success(frame_files)
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg frame extraction failed: {e.stderr or str(e)}")
            return Result.Failure(f"FFmpeg frame extraction failed: {e.stderr or str(e)}")
        except Exception as e:
            logger.error(f"Exception during frame extraction: {str(e)}")
            return Result.Failure(f"Exception during frame extraction: {str(e)}")

