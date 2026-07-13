from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobLogDTO(BaseModel):
    timestamp: datetime
    stage: str
    level: str
    message: str


class JobStatusDTO(BaseModel):
    id: str
    video_id: str
    status: str
    progress: int
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
