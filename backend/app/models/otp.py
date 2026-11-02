import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    identifier = Column(
        String(255),
        nullable=False,
        index=True  # Email or phone number
    )

    purpose = Column(
        String(50),
        nullable=False,
        index=True  # "email_verification", "password_reset", "phone_verification"
    )

    otp_hash = Column(
        String(255),
        nullable=False
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    is_used = Column(
        Boolean,
        default=False,
        nullable=False
    )

    attempts = Column(
        Integer,
        default=0,
        nullable=False
    )

    resend_available_at = Column(
        DateTime,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    user = relationship(
        "User",
        back_populates="otp_verifications"
    )

