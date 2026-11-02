from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.database.session import Base

class Worker(Base):
    __tablename__ = "workers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="active", nullable=False)  # active, idle, dead
    last_heartbeat_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    current_job_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
