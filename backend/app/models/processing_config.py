from sqlalchemy import Column, String, Boolean, Float, ForeignKey
from app.database.session import Base

class VideoProcessingConfig(Base):
    __tablename__ = "processing_configs"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    enable_ocr = Column(Boolean, default=True, nullable=False)
    enable_audio = Column(Boolean, default=True, nullable=False)
    enable_objects = Column(Boolean, default=True, nullable=False)
    enable_scene_detection = Column(Boolean, default=True, nullable=False)
    frame_rate = Column(Float, default=1.0, nullable=False)
    whisper_model = Column(String, default="tiny", nullable=False)
    yolo_model = Column(String, default="yolo11m.pt", nullable=False)
