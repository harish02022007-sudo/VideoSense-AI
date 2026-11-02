from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class KeyEventDTO(BaseModel):
    timestamp: float = Field(..., description="Timestamp in seconds")
    formatted_timestamp: str = Field(..., description="Formatted timestamp mm:ss")
    title: str = Field(..., description="Short title of the event")
    description: str = Field(..., description="Natural language description of the observed event")
    modality: str = Field(default="VISUAL", description="VISUAL, AUDIO, or MULTIMODAL")
    confidence: float = Field(default=0.85, description="Detection or event confidence score")
    frame_id: Optional[str] = Field(default=None, description="Associated keyframe ID")
    thumbnail_url: Optional[str] = Field(default=None, description="URL to keyframe thumbnail image")
    labels: List[str] = Field(default_factory=list, description="Associated object or entity labels")


class ChapterDTO(BaseModel):
    chapter_number: int = Field(..., description="Sequential chapter index")
    start_time: float = Field(..., description="Chapter start time in seconds")
    end_time: float = Field(..., description="Chapter end time in seconds")
    formatted_range: str = Field(..., description="Formatted range mm:ss - mm:ss")
    title: str = Field(..., description="Chapter title")
    description: str = Field(..., description="Summary of events occurring within this segment")
    key_entities: List[str] = Field(default_factory=list, description="Primary entities active in this segment")


class TranscriptSegmentDTO(BaseModel):
    start_time: float = Field(..., description="Segment start in seconds")
    end_time: float = Field(..., description="Segment end in seconds")
    formatted_timestamp: str = Field(..., description="Formatted timestamp range")
    text: str = Field(..., description="Transcribed spoken text")
    speaker: Optional[str] = Field(default=None, description="Speaker identification label if known")
    confidence: float = Field(default=0.9, description="Whisper recognition confidence")


class SummarizeRequest(BaseModel):
    mode: str = Field(default="audio_visual", description="Summary mode: 'visual_only' or 'audio_visual'")
    force_regenerate: bool = Field(default=False, description="Whether to bypass cache and recompute summary")


class VideoSummaryDTO(BaseModel):
    id: str = Field(..., description="Unique summary record identifier")
    video_id: str = Field(..., description="Referenced video identifier")
    video_title: str = Field(default="Video Stream", description="Filename or title of the video")
    mode: str = Field(default="audio_visual", description="Mode executed: 'visual_only' or 'audio_visual'")
    status: str = Field(..., description="Processing status: queued, processing, completed, partially_completed, failed")
    progress: float = Field(default=100.0, description="Completion percentage 0.0 to 100.0")
    current_stage: Optional[str] = Field(default="completed", description="Current execution stage")
    stage_message: Optional[str] = Field(default="Summary generated successfully", description="User-facing status message")
    
    short_summary: Optional[str] = Field(default=None, description="Concise 2-4 sentence executive overview")
    detailed_summary: Optional[str] = Field(default=None, description="Chronological, comprehensive narrative")
    key_events: List[KeyEventDTO] = Field(default_factory=list, description="Timestamped chronological events")
    chapters: List[ChapterDTO] = Field(default_factory=list, description="Temporal chapter breakdowns")
    transcript_segments: List[TranscriptSegmentDTO] = Field(default_factory=list, description="Transcribed spoken segments")
    
    has_audio: bool = Field(default=False, description="Whether the video contains an audio stream")
    has_speech: bool = Field(default=False, description="Whether spoken human dialogue was detected")
    warnings: List[str] = Field(default_factory=list, description="Notice of partial results or missing streams")
    processing_time_ms: Optional[float] = Field(default=None, description="Total inference time in milliseconds")
    models_used: List[str] = Field(default_factory=list, description="AI models used for multimodal fusion")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SummaryStatusDTO(BaseModel):
    video_id: str = Field(..., description="Video ID")
    summary_id: Optional[str] = Field(default=None, description="Summary record ID if created")
    mode: str = Field(default="audio_visual")
    status: str = Field(default="queued", description="queued, processing, completed, partially_completed, failed")
    progress: float = Field(default=0.0)
    current_stage: Optional[str] = Field(default=None)
    stage_message: Optional[str] = Field(default=None)
    is_completed: bool = Field(default=False)
    error_message: Optional[str] = Field(default=None)
