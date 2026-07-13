import os
from app.core.config import settings
from app.types.results import Result

class VideoValidator:
    """Validates incoming uploaded media files against security specifications."""
    @staticmethod
    def validate(filename: str, size_bytes: int, content_type: str) -> Result[None]:
        # Validate file size
        max_bytes = settings.security.max_upload_size_mb * 1024 * 1024
        if size_bytes > max_bytes:
            return Result.Failure(
                f"File size exceeds maximum upload limit of {settings.security.max_upload_size_mb}MB."
            )

        # Validate file extension
        ext = os.path.splitext(filename)[1].replace(".", "").lower()
        if ext not in settings.security.allowed_extensions:
            return Result.Failure(
                f"Unsupported file extension '.{ext}'. Supported: {', '.join(settings.security.allowed_extensions)}"
            )

        # Validate MIME type
        if content_type not in settings.security.allowed_mime_types:
            return Result.Failure(
                f"Invalid file MIME type '{content_type}'. Expected video content."
            )

        return Result.Success(None)
