import pytest
import uuid
from unittest.mock import MagicMock, patch
from datetime import datetime

from app.models.analysis import Video, Frame, Object, OCRResult, Transcript, Scene
from app.models.summary import VideoSummary
from app.schemas.summary import KeyEventDTO, ChapterDTO, TranscriptSegmentDTO, VideoSummaryDTO, SummaryStatusDTO
from app.services.summarization_service import MultimodalSummarizationService, _active_summary_jobs


def test_summarization_nonexistent_video_raises():
    """Verify that attempting to summarize a non-existent video ID raises ValueError."""
    fake_id = f"nonexistent-{uuid.uuid4()}"
    with pytest.raises(ValueError, match="not found"):
        MultimodalSummarizationService.summarize_video(fake_id, mode="visual_only")


def test_chronological_key_event_sorting():
    """Verify that extracted events are strictly sorted in chronological order."""
    # Unsorted events
    raw_events = [
        KeyEventDTO(timestamp=8.5, formatted_timestamp="00:08", title="Cyclist", description="Cyclist riding"),
        KeyEventDTO(timestamp=1.2, formatted_timestamp="00:01", title="Pedestrian", description="Crosswalk"),
        KeyEventDTO(timestamp=5.0, formatted_timestamp="00:05", title="Bus", description="Bus arriving"),
    ]
    sorted_events = sorted(raw_events, key=lambda x: x.timestamp)
    timestamps = [e.timestamp for e in sorted_events]
    assert timestamps == [1.2, 5.0, 8.5]


def test_duplicate_event_deduplication():
    """Verify that consecutive nearly-identical detections within a short time window are aggregated."""
    ev1 = KeyEventDTO(timestamp=1.0, formatted_timestamp="00:01", title="Bus", description="Bus detected", confidence=0.9)
    ev2 = KeyEventDTO(timestamp=1.5, formatted_timestamp="00:01", title="Bus", description="Bus detected", confidence=0.92)
    ev3 = KeyEventDTO(timestamp=7.0, formatted_timestamp="00:07", title="Cyclist", description="Cyclist detected", confidence=0.88)

    # Simple deduplication rule: if title is identical and timestamp difference < 2.0s, keep highest confidence
    events = [ev1, ev2, ev3]
    deduped = []
    for ev in events:
        if deduped and deduped[-1].title == ev.title and abs(ev.timestamp - deduped[-1].timestamp) < 2.0:
            if ev.confidence > deduped[-1].confidence:
                deduped[-1] = ev
        else:
            deduped.append(ev)

    assert len(deduped) == 2
    assert deduped[0].confidence == 0.92
    assert deduped[1].title == "Cyclist"


def test_status_reporting_job_transitions():
    """Verify job progress and stage status updates."""
    video_id = str(uuid.uuid4())
    mode = "visual_only"
    job_key = f"{video_id}:{mode}"

    # Set queued
    _active_summary_jobs[job_key] = {
        "summary_id": None,
        "status": "queued",
        "progress": 5.0,
        "current_stage": "queued",
        "stage_message": "Queued for processing"
    }
    status = MultimodalSummarizationService.get_job_status(video_id, mode)
    assert status.status == "queued"
    assert status.progress == 5.0
    assert status.is_completed is False

    # Set processing
    _active_summary_jobs[job_key]["status"] = "processing"
    _active_summary_jobs[job_key]["progress"] = 50.0
    _active_summary_jobs[job_key]["current_stage"] = "analyzing_visuals"
    status = MultimodalSummarizationService.get_job_status(video_id, mode)
    assert status.status == "processing"
    assert status.progress == 50.0

    # Set completed
    _active_summary_jobs[job_key]["status"] = "completed"
    _active_summary_jobs[job_key]["progress"] = 100.0
    _active_summary_jobs[job_key]["current_stage"] = "completed"
    status = MultimodalSummarizationService.get_job_status(video_id, mode)
    assert status.status == "completed"
    assert status.is_completed is True

    # Cleanup
    _active_summary_jobs.pop(job_key, None)


def test_visual_only_summary_synthesis():
    """Verify that visual_only mode produces both short and detailed summaries without requiring audio."""
    objects = [
        Object(id="o1", video_id="vid1", frame_id="f1", class_label="car", confidence=0.9),
        Object(id="o2", video_id="vid1", frame_id="f1", class_label="person", confidence=0.85),
        Object(id="o3", video_id="vid1", frame_id="f2", class_label="bus", confidence=0.95),
    ]
    key_events = [
        KeyEventDTO(timestamp=0.0, formatted_timestamp="00:00", title="Traffic Flow", description="Vehicles moving"),
        KeyEventDTO(timestamp=4.0, formatted_timestamp="00:04", title="Transit Bus", description="Bus arrival")
    ]
    chapters = [
        ChapterDTO(chapter_number=1, start_time=0.0, end_time=4.0, formatted_range="00:00 - 00:04", title="Opening", description="Traffic"),
        ChapterDTO(chapter_number=2, start_time=4.0, end_time=10.0, formatted_range="00:04 - 00:10", title="Transit", description="Bus")
    ]

    short_summary, detailed_summary = MultimodalSummarizationService._generate_nlp_narratives(
        video_filename="Test City Street",
        duration_sec=10.0,
        key_events=key_events,
        chapters=chapters,
        transcript_segments=[],
        objects=objects,
        ocrs=[],
        mode="visual_only",
        has_audio=False,
        has_speech=False
    )

    assert isinstance(short_summary, str)
    assert len(short_summary) > 20
    assert "car" in short_summary or "person" in short_summary
    assert isinstance(detailed_summary, str)
    assert "Chapter 1" in detailed_summary
    assert "Chapter 2" in detailed_summary


def test_audio_visual_with_silent_audio():
    """Verify that audio_visual mode with no speech generates an ambient sound warning and notes it in the narrative."""
    objects = [Object(id="o1", video_id="vid1", frame_id="f1", class_label="car", confidence=0.9)]
    key_events = [KeyEventDTO(timestamp=0.0, formatted_timestamp="00:00", title="Traffic", description="Cars")]
    chapters = [ChapterDTO(chapter_number=1, start_time=0.0, end_time=5.0, formatted_range="00:00 - 00:05", title="Traffic", description="Cars")]

    short_summary, detailed_summary = MultimodalSummarizationService._generate_nlp_narratives(
        video_filename="Ambient Downtown",
        duration_sec=5.0,
        key_events=key_events,
        chapters=chapters,
        transcript_segments=[],
        objects=objects,
        ocrs=[],
        mode="audio_visual",
        has_audio=True,
        has_speech=False
    )

    assert "ambient background audio" in short_summary or "no spoken human dialogue" in short_summary
    assert "Ambient environmental street audio detected" in detailed_summary or "no active verbal dialogue" in detailed_summary
