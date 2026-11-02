from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    ForeignKey
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(
        String,
        primary_key=True,
        index=True
    )

    filename = Column(
        String,
        nullable=False,
        index=True  # Index for future search queries
    )

    filepath = Column(
        String,
        nullable=False
    )

    mime_type = Column(
        String,
        nullable=False
    )

    duration = Column(
        Float,
        nullable=True
    )

    fps = Column(
        Integer,
        nullable=True
    )

    width = Column(
        Integer,
        nullable=True
    )

    height = Column(
        Integer,
        nullable=True
    )

    codec = Column(
        String,
        nullable=True
    )

    size_bytes = Column(
        Integer,
        nullable=False
    )

    sha256_hash = Column(
        String,
        nullable=False
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True  # Index for timeline sorting queries
    )

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    user = relationship("User", back_populates="videos")
    job = relationship(
        "Job",
        back_populates="video",
        uselist=False,
        cascade="all, delete-orphan"
    )

    frames = relationship("Frame", back_populates="video", cascade="all, delete-orphan")
    ocr_results = relationship("OCRResult", back_populates="video", cascade="all, delete-orphan")
    transcripts = relationship("Transcript", back_populates="video", cascade="all, delete-orphan")
    scenes = relationship("Scene", back_populates="video", cascade="all, delete-orphan")
    objects = relationship("Object", back_populates="video", cascade="all, delete-orphan")
    audio = relationship("Audio", back_populates="video", cascade="all, delete-orphan")
    face_detections = relationship("FaceDetection", back_populates="video", cascade="all, delete-orphan")
    embeddings = relationship("VideoEmbedding", back_populates="video", cascade="all, delete-orphan")
    summaries = relationship("VideoSummary", back_populates="video", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(
        String,
        primary_key=True,
        index=True
    )

    video_id = Column(
        String,
        ForeignKey("videos.id"),
        nullable=False
    )

    status = Column(
        String,
        default="queued",
        nullable=False
    )

    progress = Column(
        Integer,
        default=0,
        nullable=False
    )

    failure_reason = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # v6.1 Job lifecycle fields
    priority = Column(Integer, default=0, nullable=False)
    worker_id = Column(String, nullable=True)
    heartbeat_at = Column(DateTime, nullable=True)
    estimated_completion_time = Column(DateTime, nullable=True)
    processing_version = Column(String, nullable=True)
    pipeline_version = Column(String, nullable=True)
    current_stage = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    error_code = Column(String, nullable=True)
    error_message = Column(String, nullable=True)

    # Link back to video
    video = relationship(
        "Video",
        back_populates="job"
    )


class Frame(Base):
    __tablename__ = "frames"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    timestamp_offset_ms = Column(Float, nullable=False)
    filepath = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    extraction_status = Column(String, nullable=True)
    frame_hash = Column(String, nullable=True)
    perceptual_hash = Column(String, nullable=True)
    is_keyframe = Column(Boolean, default=False, nullable=False)
    quality_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="frames")
    ocr_results = relationship("OCRResult", back_populates="frame")
    objects = relationship("Object", back_populates="frame")
    face_detections = relationship("FaceDetection", back_populates="frame")


class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    frame_id = Column(String, ForeignKey("frames.id"), nullable=True)
    text = Column(String, nullable=False, index=True)  # Indexed search text
    confidence = Column(Float, nullable=False)
    box_x_min = Column(Float, nullable=False)
    box_y_min = Column(Float, nullable=False)
    box_x_max = Column(Float, nullable=False)
    box_y_max = Column(Float, nullable=False)
    language = Column(String, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    frame_timestamp = Column(Float, nullable=True)

    # Relationships
    video = relationship("Video", back_populates="ocr_results")
    frame = relationship("Frame", back_populates="ocr_results")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    text = Column(String, nullable=False, index=True)  # Indexed search transcript
    confidence = Column(Float, nullable=False)
    start_time_ms = Column(Float, nullable=False)
    end_time_ms = Column(Float, nullable=False)
    speaker_label = Column(String, nullable=True)
    language = Column(String, nullable=True)
    emotion_score = Column(Float, nullable=True)
    keywords = Column(String, nullable=True)  # Comma-separated keyword list
    timestamp_embedding_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="transcripts")


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    scene_number = Column(Integer, nullable=False)
    start_time_ms = Column(Float, nullable=False)
    end_time_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="scenes")


class Object(Base):
    __tablename__ = "objects"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    frame_id = Column(String, ForeignKey("frames.id"), nullable=True)
    class_label = Column(String, nullable=False, index=True)  # Indexed object class label
    confidence = Column(Float, nullable=False)
    box_x_min = Column(Float, nullable=False)
    box_y_min = Column(Float, nullable=False)
    box_x_max = Column(Float, nullable=False)
    box_y_max = Column(Float, nullable=False)
    tracking_id = Column(String, nullable=True)
    first_seen_timestamp = Column(Float, nullable=True)
    last_seen_timestamp = Column(Float, nullable=True)
    movement_metadata = Column(String, nullable=True)  # JSON metadata representation
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="objects")
    frame = relationship("Frame", back_populates="objects")


class Audio(Base):
    __tablename__ = "audio"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    filepath = Column(String, nullable=False)
    duration = Column(Float, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    channels = Column(Integer, nullable=True)
    language = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="audio")


class FaceDetection(Base):
    __tablename__ = "face_detections"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    frame_id = Column(String, ForeignKey("frames.id"), nullable=True)
    confidence = Column(Float, nullable=False)
    box_coordinates = Column(String, nullable=False)  # Mapped JSON details
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="face_detections")
    frame = relationship("Frame", back_populates="face_detections")