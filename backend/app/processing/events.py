from datetime import datetime
from typing import Dict, Any, List, Callable
from pydantic import BaseModel

class BasePipelineEvent(BaseModel):
    correlation_id: str
    video_id: str
    job_id: str
    timestamp: datetime = datetime.utcnow()


class VideoUploadedEvent(BasePipelineEvent):
    filename: str
    size_bytes: int


class ProcessingStartedEvent(BasePipelineEvent):
    priority: int
    processing_config: Dict[str, Any]


class StageStartedEvent(BasePipelineEvent):
    stage: str
    stage_order: int
    progress_start: int


class StageCompletedEvent(BasePipelineEvent):
    stage: str
    progress_end: int
    duration_ms: int
    stage_metadata: Dict[str, Any] = {}


class ProcessingFailedEvent(BasePipelineEvent):
    stage: str
    error_code: str
    error_message: str


class ProcessingCancelledEvent(BasePipelineEvent):
    cancelled_at: datetime = datetime.utcnow()


class PipelineEventBus:
    """In-memory Event Bus managing pipeline subscription events and publishes."""
    _listeners: Dict[str, List[Callable[[BasePipelineEvent], None]]] = {}

    @classmethod
    def subscribe(cls, event_type: str, handler: Callable[[Any], None]) -> None:
        if event_type not in cls._listeners:
            cls._listeners[event_type] = []
        cls._listeners[event_type].append(handler)

    @classmethod
    def publish(cls, event: BasePipelineEvent) -> None:
        event_name = event.__class__.__name__
        handlers = cls._listeners.get(event_name, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                # Log handler execution exceptions without crashing the main thread
                print(f"Error executing event handler {handler} for {event_name}: {e}")
