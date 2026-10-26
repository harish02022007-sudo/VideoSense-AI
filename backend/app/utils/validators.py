import os
import mimetypes
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

        if size_bytes <= 0:
            return Result.Failure("Uploaded file is empty (0 bytes).")

        # Validate file extension
        ext = os.path.splitext(filename or "")[1].replace(".", "").lower()
        if not ext or ext not in settings.security.allowed_extensions:
            return Result.Failure(
                f"Unsupported file extension '.{ext}'. Supported video formats: {', '.join(settings.security.allowed_extensions)}"
            )

        # Validate MIME type (resilient against browser/OS header variations)
        norm_mime = (content_type or "").lower().strip()
        guessed_type, _ = mimetypes.guess_type(filename or "")
        guessed_type = (guessed_type or "").lower()

        is_valid_mime = (
            norm_mime.startswith("video/") or
            guessed_type.startswith("video/") or
            norm_mime in settings.security.allowed_mime_types or
            guessed_type in settings.security.allowed_mime_types or
            (norm_mime in ["application/octet-stream", "binary/octet-stream", ""] and ext in settings.security.allowed_extensions)
        )

        if not is_valid_mime:
            return Result.Failure(
                f"Invalid file MIME type '{content_type}'. Expected video content."
            )

        return Result.Success(None)
