from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.sqlite import JSON  # SQLite JSON dialect fallback support
from app.database.session import Base

class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    stage = Column(String, nullable=False)
    level = Column(String, nullable=False)  # INFO, WARNING, ERROR
    message = Column(String, nullable=False)
    # Storing execution metadata maps securely
    log_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
