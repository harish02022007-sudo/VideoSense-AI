from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VideoUploadResponse(BaseModel):
    video_id: str
    job_id: str
    filename: str
    status: str
    progress: int


class VideoMetadataDTO(BaseModel):
    id: str
    filename: str
    filepath: str
    mime_type: str
    duration: Optional[float] = None
    fps: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    codec: Optional[str] = None
    size_bytes: int
    sha256_hash: str
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class VideoDetailsDTO(BaseModel):
    id: str
    filename: str
    size_bytes: int
    uploaded_at: datetime
    status: str
    progress: int


class VideoProcessingConfigDTO(BaseModel):
    enable_ocr: bool = True
    enable_audio: bool = True
    enable_objects: bool = True
    enable_scene_detection: bool = True
    frame_rate: float = 1.0
    whisper_model: str = "tiny"
    yolo_model: str = "yolo11m.pt"
