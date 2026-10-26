import os
from typing import List, Dict, Optional, Any
import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

class AppSettings(BaseModel):
    env: str = "development"
    debug: bool = True
    title: str = "VideoSense AI"
    port: int = 8000
    host: str = "0.0.0.0"


class DatabaseSettings(BaseModel):
    url: str = "sqlite:///C:/Users/Harish/.gemini/antigravity-ide/scratch/videosense_v2.db"
    pool_size: int = 5
    max_overflow: int = 10


class LoggingSettings(BaseModel):
    level: str = "INFO"
    format: str = "json"
    save_to_file: bool = True
    file_path: str = "./logs/app.log"
    rotation_bytes: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5


class SecuritySettings(BaseModel):
    max_upload_size_mb: int = 1000
    allowed_extensions: List[str] = [
        "mp4", "avi", "mov", "mkv", "webm", "m4v", "flv", "wmv", "3gp", "ts", "mpg", "mpeg"
    ]
    allowed_mime_types: List[str] = [
        "video/mp4", "video/quicktime", "video/x-msvideo", "video/avi", "video/msvideo",
        "video/x-matroska", "video/webm", "video/x-m4v", "video/3gpp", "video/mpeg",
        "video/ogg", "video/x-flv", "video/x-ms-wmv", "application/octet-stream"
    ]
    enable_sha256_verification: bool = True


class WorkerSettings(BaseModel):
    max_workers: int = 2
    queue_type: str = "asyncio"  # Future ready for redis/celery
    redis_url: Optional[str] = None


class StageConfig(BaseModel):
    enabled: bool = True
    priority: int = 10
    timeout: int = 60  # seconds
    retry_count: int = 3
    cache_enabled: bool = True
    max_memory_mb: int = 1024
    max_gpu_vram_mb: int = 0


class PipelineSettings(BaseModel):
    validating: StageConfig = StageConfig(timeout=30, retry_count=0)
    metadata: StageConfig = StageConfig(timeout=60, retry_count=3)
    frame_extraction: StageConfig = StageConfig(timeout=300, retry_count=2)
    audio_extraction: StageConfig = StageConfig(timeout=180, retry_count=2)
    object_detection: StageConfig = StageConfig(timeout=1200, retry_count=1)
    ocr: StageConfig = StageConfig(timeout=600, retry_count=1)
    face_detection: StageConfig = StageConfig(timeout=300, retry_count=1)
    transcription: StageConfig = StageConfig(timeout=1800, retry_count=1)
    scene_detection: StageConfig = StageConfig(timeout=300, retry_count=2)
    timeline: StageConfig = StageConfig(timeout=60, retry_count=3)
    summary: StageConfig = StageConfig(timeout=300, retry_count=2)


class AIModelMetadata(BaseModel):
    name: str
    provider: str
    version: str
    gpu_required: bool = False
    vram_allocation_mb: int = 0
    supported_formats: List[str] = []
    average_speed_fps: int = 30


class AIProviderSettings(BaseModel):
    device: str = "cpu"
    object_detection_provider: str = "yolov11m"
    ocr_provider: str = "easyocr"
    speech_provider: str = "whisper"
    summary_provider: str = "mock"
    models: Dict[str, AIModelMetadata] = {
        "whisper": AIModelMetadata(name="Whisper Tiny", provider="faster-whisper", version="1.0.0", supported_formats=["audio"]),
        "easyocr": AIModelMetadata(name="EasyOCR English", provider="easyocr", version="1.7.2", supported_formats=["frames"])
    }


class StorageSettings(BaseModel):
    upload_dir: str = "./uploads"
    cache_dir: str = "./cache"


class EmbeddingSettings(BaseModel):
    storage_path: str = "storage/embeddings"
    text_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    vision_model: str = "openai/clip-vit-base-patch32"


class Settings(BaseSettings):
    app: AppSettings = AppSettings()
    database: DatabaseSettings = DatabaseSettings()
    logging: LoggingSettings = LoggingSettings()
    security: SecuritySettings = SecuritySettings()
    worker: WorkerSettings = WorkerSettings()
    pipeline: PipelineSettings = PipelineSettings()
    providers: AIProviderSettings = AIProviderSettings()
    storage: StorageSettings = StorageSettings()
    embeddings: EmbeddingSettings = EmbeddingSettings()

    class Config:
        env_prefix = "VIDEOSENSE_"
        env_nested_delimiter = "__"
        case_sensitive = False
        extra = "ignore"


def load_settings() -> Settings:
    # Environment profile resolution (.env override compatible)
    env = os.getenv("VIDEOSENSE_ENV", os.getenv("ENV", "development")).lower()
    
    # Path to YAML config file
    config_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "configs"))
    config_path = os.path.join(config_dir, f"{env}.yaml")
    
    if not os.path.exists(config_path):
        # Fallback config resolution
        return Settings()
        
    try:
        with open(config_path, "r") as f:
            config_data = yaml.safe_load(f)
            
        return Settings.model_validate(config_data)
    except Exception as e:
        print(f"Error loading configuration from {config_path}: {e}. Loading default Settings.")
        return Settings()


settings = load_settings()
