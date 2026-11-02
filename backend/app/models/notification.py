import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Index
)
from app.database.session import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Unique event key for idempotent event dispatch (prevents duplicates)
    event_id = Column(
        String(120),
        unique=True,
        nullable=False,
        index=True
    )

    # Event classification: e.g. video_uploaded, pipeline_started, frames_extracted,
    # objects_detected, summary_generated, pipeline_completed, pipeline_failed, user_login, user_logout
    event_type = Column(
        String(50),
        nullable=False,
        index=True
    )

    # Primary UI category: 'processing', 'security', 'delivery', 'system', 'reports'
    category = Column(
        String(50),
        nullable=False,
        default="processing",
        index=True
    )

    title = Column(
        String(255),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    # Severity: 'info', 'success', 'warning', 'critical'
    severity = Column(
        String(20),
        nullable=False,
        default="info",
        index=True
    )

    # State: 'active', 'resolved'
    status = Column(
        String(20),
        nullable=False,
        default="active",
        index=True
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True
    )

    read_at = Column(
        DateTime,
        nullable=True
    )

    # Resource linking
    resource_type = Column(
        String(50),
        nullable=True,
        default="video"
    )

    resource_id = Column(
        String(100),
        nullable=True,
        index=True
    )

    # Frontend Navigation Action
    action_tab = Column(
        String(50),
        nullable=True
    )

    action_label = Column(
        String(100),
        nullable=True
    )

    # AI Model or sub-engine attribution (e.g., 'YOLOv11m', 'Whisper-tiny', 'EasyOCR')
    model_name = Column(
        String(100),
        nullable=True
    )

    # Structured diagnostic JSON metadata (frame counts, latencies, object counts, etc.)
    metadata_json = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    resolved_at = Column(
        DateTime,
        nullable=True
    )

    __table_args__ = (
        Index("ix_notifications_cat_read", "category", "is_read"),
        Index("ix_notifications_created_desc", "created_at"),
    )


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True
    )

    sound_enabled = Column(
        Boolean,
        default=True,
        nullable=False
    )

    browser_push_enabled = Column(
        Boolean,
        default=False,
        nullable=False
    )

    categories_json = Column(
        Text,
        default='{"processing":true,"security":true,"delivery":true,"system":true,"reports":true}',
        nullable=False
    )

    min_severity = Column(
        String(20),
        default="all",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

