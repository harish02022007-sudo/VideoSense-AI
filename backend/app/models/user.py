import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    Text,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )

    full_name = Column(
        String(120),
        nullable=False
    )

    username = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    phone_number = Column(
        String(30),
        nullable=True,
        index=True
    )

    country_code = Column(
        String(10),
        nullable=True,
        default="+1"
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    is_email_verified = Column(
        Boolean,
        default=False,
        nullable=False
    )

    is_phone_verified = Column(
        Boolean,
        default=False,
        nullable=False
    )

    account_status = Column(
        String(30),
        default="active",  # "pending_verification", "active", "suspended", "disabled"
        nullable=False
    )

    role = Column(
        String(30),
        default="user",  # "user", "admin", "analyst"
        nullable=False
    )

    auth_provider = Column(
        String(30),
        default="local",  # "local", "google"
        nullable=False
    )

    avatar_url = Column(
        String(500),
        nullable=True
    )

    failed_login_attempts = Column(
        Integer,
        default=0,
        nullable=False
    )

    lockout_until = Column(
        DateTime,
        nullable=True
    )

    last_login_at = Column(
        DateTime,
        nullable=True
    )

    last_password_change_at = Column(
        DateTime,
        nullable=True
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

    # Relationships
    otp_verifications = relationship(
        "OTPVerification",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    videos = relationship(
        "Video",
        back_populates="user",
        foreign_keys="Video.user_id"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "username": self.username,
            "email": self.email,
            "phone_number": self.phone_number,
            "country_code": self.country_code,
            "is_email_verified": self.is_email_verified,
            "is_phone_verified": self.is_phone_verified,
            "account_status": self.account_status,
            "role": self.role,
            "auth_provider": self.auth_provider,
            "avatar_url": self.avatar_url,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

