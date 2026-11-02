from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class VideoSummary(Base):
    __tablename__ = "video_summaries"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False, index=True)
    mode = Column(String, nullable=False, default="audio_visual")  # visual_only, audio_visual
    status = Column(String, nullable=False, default="queued")  # queued, processing, completed, partially_completed, failed
    progress = Column(Float, default=0.0, nullable=False)
    current_stage = Column(String, nullable=True)  # validating, extracting_frames, analyzing_visuals, extracting_audio, transcribing_audio, extracting_events, generating_summary, completed
    stage_message = Column(String, nullable=True)
    
    short_summary = Column(Text, nullable=True)
    detailed_summary = Column(Text, nullable=True)
    key_events_json = Column(Text, nullable=True)  # JSON-serialized list of key events
    chapters_json = Column(Text, nullable=True)  # JSON-serialized list of chapter segments
    transcript_segments_json = Column(Text, nullable=True)  # JSON-serialized list of transcript segments
    metadata_json = Column(Text, nullable=True)  # JSON-serialized metadata, models used, metrics, warnings
    
    error_message = Column(String, nullable=True)
    processing_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    video = relationship("Video", back_populates="summaries")
