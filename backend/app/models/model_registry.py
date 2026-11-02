from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.database.session import Base

class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id = Column(String, primary_key=True, index=True)
    model_name = Column(String, nullable=False, index=True)
    model_type = Column(String, nullable=False)
    version = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    loaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String, nullable=False)  # ACTIVE, INACTIVE, FAILED
    
    # Extensions from v6.1 Section 5
    model_path = Column(String, nullable=True)
    model_size = Column(String, nullable=True)
    hardware_requirement = Column(String, nullable=True)
    memory_requirement = Column(String, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
