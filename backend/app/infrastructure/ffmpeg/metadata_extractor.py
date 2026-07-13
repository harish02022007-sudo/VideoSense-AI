import subprocess
import json
import os
from typing import Any, Dict
from app.interfaces.metadata import IMetadataService
from app.types.results import Result

class MetadataExtractor(IMetadataService):
    """FFmpeg-based implementation of the IMetadataService interface."""
    def extract_metadata(self, video_path: str) -> Result[Dict[str, Any]]:
        if not os.path.exists(video_path):
            return Result.Failure(f"Video file not found at path: {video_path}")

        try:
            # Query ffprobe in JSON mode for robust parsing
            cmd = [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                video_path
            ]
            
            # Run command
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            probe_data = json.loads(result.stdout)
            
            # Find video stream
            video_stream = None
            for stream in probe_data.get("streams", []):
                if stream.get("codec_type") == "video":
                    video_stream = stream
                    break

            if not video_stream:
                return Result.Failure("No valid video stream found in file.")

            # Extract fields
            fmt = probe_data.get("format", {})
            duration = float(fmt.get("duration", 0.0))
            
            # Calculate average frame rate (FPS)
            fps_str = video_stream.get("avg_frame_rate", "0/1")
            if "/" in fps_str:
                num, den = map(int, fps_str.split("/"))
                fps = int(num / den) if den != 0 else 0
            else:
                fps = int(float(fps_str))

            metadata = {
                "duration": duration,
                "fps": fps,
                "width": int(video_stream.get("width", 0)),
                "height": int(video_stream.get("height", 0)),
                "codec": video_stream.get("codec_name", "unknown"),
                "size_bytes": int(fmt.get("size", 0)),
                "bitrate": int(fmt.get("bit_rate", 0)) if fmt.get("bit_rate") else 0,
                "creation_date": fmt.get("tags", {}).get("creation_time", "unknown")
            }
            return Result.Success(metadata)

        except subprocess.CalledProcessError as e:
            return Result.Failure(f"ffprobe execution failed: {e.stderr or str(e)}")
        except Exception as e:
            return Result.Failure(f"Exception during metadata extraction: {str(e)}")
