import os
from app.core.config import settings
from app.types.results import Result

class VideoProcessingPolicy:
    """Enforces enterprise resource governance, checking file sizes and codecs compatibility checks."""
    @staticmethod
    def validate_processing_eligibility(video_path: str, size_bytes: int) -> Result[None]:
        if not os.path.exists(video_path):
            return Result.Failure(f"Video file not found at: {video_path}")

        # Enforce maximum file sizes
        max_bytes = settings.storage.max_file_size_mb * 1024 * 1024
        if size_bytes > max_bytes:
            return Result.Failure(
                f"Video size ({size_bytes / (1024*1024):.2f}MB) exceeds processing limits of {settings.storage.max_file_size_mb}MB."
            )

        # Enforce supported extensions
        ext = os.path.splitext(video_path)[1].replace(".", "").lower()
        if ext not in settings.storage.allowed_extensions:
            return Result.Failure(
                f"File format '.{ext}' is not supported for pipeline execution."
            )

        return Result.Success(None)
