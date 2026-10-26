from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the sender: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Content of the chat message")
    timestamp: Optional[float] = Field(None, description="Optional video timestamp associated with this message")

class CitationItem(BaseModel):
    timestamp: float = Field(..., description="Timestamp in seconds in the video")
    label: str = Field(..., description="Object label, OCR text, or dialogue snippet")
    modality: str = Field(..., description="Modality source: OBJECT, TEXT, AUDIO, FRAME, or SCENE")
    confidence: Optional[float] = Field(None, description="Confidence score of the detection")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL for the keyframe")
    box: Optional[List[float]] = Field(None, description="Optional bounding box [x1, y1, x2, y2]")
    video_id: Optional[str] = Field(None, description="Video UUID")
    video_title: Optional[str] = Field(None, description="Human-readable video title")

class ChatRequest(BaseModel):
    message: str = Field(..., description="The user query or prompt about the video")
    video_id: Optional[str] = Field(None, description="Target video UUID, or null for cross-video RAG")
    persona: Optional[str] = Field("analyst", description="Analysis persona: 'analyst', 'traffic', 'executive', 'general'")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Previous conversation turns for context")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="Markdown-formatted intelligent response")
    citations: List[CitationItem] = Field(default=[], description="Concrete timestamped visual/textual citations")
    suggested_prompts: List[str] = Field(default=[], description="Contextual follow-up suggestions")
    video_id: Optional[str] = Field(None, description="Target video ID")
    video_title: Optional[str] = Field(None, description="Video title")
    persona: str = Field("analyst", description="Active persona")
    modality_sources: List[str] = Field(default=[], description="List of modalities used: Object, OCR, Audio, Scene")
