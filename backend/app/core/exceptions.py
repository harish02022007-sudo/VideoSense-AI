from app.core.constants import ErrorCodes

class BaseAppException(Exception):
    """Base exception for all domain and API failures in VideoSense AI."""
    def __init__(self, message: str, error_code: ErrorCodes, status_code: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code


class ValidationError(BaseAppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, ErrorCodes.VALIDATION_ERROR, 400)


class StorageError(BaseAppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, ErrorCodes.UPLOAD_FAILED, 500)


class PipelineError(BaseAppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, ErrorCodes.PIPELINE_FAILED, 500)


class MetadataError(BaseAppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, ErrorCodes.VALIDATION_ERROR, 400)


class OCRProcessingError(BaseAppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, ErrorCodes.PIPELINE_FAILED, 500)


class SpeechProcessingError(BaseAppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, ErrorCodes.PIPELINE_FAILED, 500)


class DatabaseError(BaseAppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, ErrorCodes.DATABASE_ERROR, 500)


class TimeoutError(BaseAppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, ErrorCodes.TIMEOUT, 408)
