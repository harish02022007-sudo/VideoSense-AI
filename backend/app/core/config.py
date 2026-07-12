import os
from typing import List, Optional
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
    url: str = "sqlite:///./videosense.db"
    pool_size: int = 5
    max_overflow: int = 10

class LoggingSettings(BaseModel):
    level: str = "INFO"
    format: str = "json"
    save_to_file: bool = True
    file_path: str = "./logs/app.log"

class StorageSettings(BaseModel):
    upload_dir: str = "./uploads"
    output_dir: str = "./outputs"
    cache_dir: str = "./cache"
    max_file_size_mb: int = 500
    allowed_extensions: List[str] = ["mp4", "avi", "mov", "mkv"]

class ModelManagerSettings(BaseModel):
    lazy_load: bool = True
    unload_inactive_after_sec: int = 300

class YoloSettings(BaseModel):
    model_name: str = "yolo11n.pt"
    confidence_threshold: float = 0.25

class WhisperSettings(BaseModel):
    model_name: str = "tiny"
    device: str = "cpu"

class OcrSettings(BaseModel):
    lang: str = "en"
    use_gpu: bool = False

class ClipSettings(BaseModel):
    model_name: str = "sentence-transformers/clip-ViT-B-32"

class LlmSettings(BaseModel):
    provider: str = "mock"
    local_model_path: str = "Qwen/Qwen2.5-3B-Instruct"
    api_key: str = ""
    temperature: float = 0.7

class ModelsSettings(BaseModel):
    device: str = "cpu"
    manager: ModelManagerSettings = ModelManagerSettings()
    yolo: YoloSettings = YoloSettings()
    whisper: WhisperSettings = WhisperSettings()
    ocr: OcrSettings = OcrSettings()
    clip: ClipSettings = ClipSettings()
    llm: LlmSettings = LlmSettings()

class CacheSettings(BaseModel):
    ttl_seconds: int = 3600
    enabled: bool = True

class Settings(BaseSettings):
    app: AppSettings = AppSettings()
    database: DatabaseSettings = DatabaseSettings()
    logging: LoggingSettings = LoggingSettings()
    storage: StorageSettings = StorageSettings()
    models: ModelsSettings = ModelsSettings()
    cache: CacheSettings = CacheSettings()

    class Config:
        env_prefix = "VIDEOSENSE_"
        case_sensitive = False

def load_settings() -> Settings:
    # Determine which profile to load (default: development)
    env = os.getenv("VIDEOSENSE_ENV", os.getenv("ENV", "development")).lower()
    
    # Path to YAML config file
    config_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "configs"))
    config_path = os.path.join(config_dir, f"{env}.yaml")
    
    if not os.path.exists(config_path):
        print(f"Warning: Configuration file not found at {config_path}. Falling back to default settings.")
        return Settings()
        
    try:
        with open(config_path, "r") as f:
            config_data = yaml.safe_load(f)
            
        # Parse settings from config data
        return Settings.model_validate(config_data)
    except Exception as e:
        print(f"Error loading configuration from {config_path}: {e}. Loading default Settings.")
        return Settings()

# Singleton configuration instance
settings = load_settings()
