from pydantic import BaseModel, Field
from typing import Optional

class SearchRequest(BaseModel):
    query: str = Field(..., description="The natural language query to search for.")
    video_id: Optional[str] = Field(None, description="Optional filter to search within a specific video.")
    modality: Optional[str] = Field(None, description="Optional filter to search a specific modality (TEXT, FRAME, AUDIO, METADATA).")
    top_k: int = Field(5, ge=1, le=100, description="The maximum number of matching results to retrieve.")
