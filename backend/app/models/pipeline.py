from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.sqlite import JSON
from app.database.session import Base

class PipelineExecution(Base):
    __tablename__ = "pipeline_executions"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    stage_name = Column(String, nullable=False)
    stage_order = Column(Integer, nullable=False)
    status = Column(String, nullable=False)  # SUCCESS, FAILED, RUNNING
    progress_start = Column(Integer, nullable=False)
    progress_end = Column(Integer, nullable=False)
    retry_attempt = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, default=0, nullable=False)
    execution_metadata = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)
