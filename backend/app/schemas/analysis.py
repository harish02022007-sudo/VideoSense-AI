from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.schemas.video import VideoMetadataDTO
from app.schemas.job import JobStatusDTO

class AnalysisResultDTO(BaseModel):
    video: VideoMetadataDTO
    job: JobStatusDTO
    manifest: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    timeline: Optional[List[Any]] = None
    summary: Optional[Dict[str, Any]] = None
    transcript: Optional[Dict[str, Any]] = None
