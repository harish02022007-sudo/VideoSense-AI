from enum import Enum

# API Paths
API_PREFIX = "/api/v1"
UPLOAD_FOLDER = "./uploads"

# Job Statuses
class JobStatus(str, Enum):
    QUEUED = "queued"
    VALIDATING = "validating"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLING = "cancelling"
    CANCELLED = "cancelled"

# Pipeline Stages
class PipelineStage(str, Enum):
    METADATA = "metadata"
    FRAME_EXTRACTION = "frame_extraction"
    AUDIO_EXTRACTION = "audio_extraction"
    SCENE_DETECTION = "scene_detection"
    OCR = "ocr"
    SPEECH = "speech"
    OBJECT_DETECTION = "object_detection"
    FACE_DETECTION = "face_detection"
    PREVIEW_GENERATION = "preview_generation"
    EMBEDDING_GENERATION = "embedding_generation"
    COMPLETED = "completed"

# Embedding Types
class EmbeddingType(str, Enum):
    VIDEO = "VIDEO"
    FRAME = "FRAME"
    TEXT = "TEXT"
    AUDIO = "AUDIO"
    VIDEO_METADATA = "VIDEO_METADATA"

# Embedding Statuses
EMBEDDING_PENDING = "embedding_pending"
EMBEDDING_PROCESSING = "embedding_processing"
EMBEDDING_COMPLETED = "completed"
EMBEDDING_FAILED = "failed"

# Unified Error Codes
class ErrorCodes(str, Enum):
    VIDEO_NOT_FOUND = "VIDEO_NOT_FOUND"
    JOB_NOT_FOUND = "JOB_NOT_FOUND"
    INVALID_VIDEO_FORMAT = "INVALID_VIDEO_FORMAT"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    UPLOAD_FAILED = "UPLOAD_FAILED"
    DATABASE_ERROR = "DATABASE_ERROR"
    PIPELINE_FAILED = "PIPELINE_FAILED"
    AI_PROVIDER_UNAVAILABLE = "AI_PROVIDER_UNAVAILABLE"
    FFMPEG_NOT_FOUND = "FFMPEG_NOT_FOUND"
    OPENCV_NOT_FOUND = "OPENCV_NOT_FOUND"
    MODEL_LOAD_FAILED = "MODEL_LOAD_FAILED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    TIMEOUT = "TIMEOUT"
