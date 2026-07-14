from typing import Dict, Any, List
from fastapi import APIRouter, Request
from app.db.unit_of_work import UnitOfWork
from app.core.exceptions import ValidationError
from app.schemas.common import ResponseEnvelope

router = APIRouter()

@router.get("/{id}/summary", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_video_summary(id: str, request: Request):
    """Compiles intelligence summaries from processed transcripts, OCR matches, and YOLO objects list."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")

        # Aggregate metrics
        ocr_count = len(uow.ocr_results.get_by_video_id(id))
        objects = uow.objects.get_by_video_id(id)
        unique_objects = list(set([obj.class_label for obj in objects]))
        transcripts = uow.transcripts.get_by_video_id(id)
        full_dialogue = " ".join([t.text for t in transcripts])

        summary_payload = {
            "video_id": id,
            "filename": video.filename,
            "detected_keywords": unique_objects,
            "dialogue_snippet": full_dialogue[:200] + "..." if len(full_dialogue) > 200 else full_dialogue,
            "ocr_hits_count": ocr_count,
            "aggregated_summary": "The processed video covers dialogues relating to technical details with objects detected matching " + ", ".join(unique_objects[:5]) + "."
        }

    return ResponseEnvelope(
        success=True,
        message="AI processing summary compiled successfully.",
        data=summary_payload,
        request_id=request_id
    )


@router.get("/{id}/timeline", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def get_video_timeline(id: str, request: Request):
    """Returns chronological timeline segment mapping records."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        video = uow.videos.get(id)
        if not video:
            raise ValidationError(f"Video with ID {id} not found.")

        # Pull segments cuts from scenes
        scenes = uow.scenes.get_by_video_id(id)
        timeline_segments = []
        for s in scenes:
            timeline_segments.append({
                "segment_index": s.scene_number,
                "start_time_ms": s.start_time_ms,
                "end_time_ms": s.end_time_ms,
                "title": f"Scene Segment {s.scene_number}",
                "description": f"Scene segment cut detected between {s.start_time_ms/1000.0:.2f}s and {s.end_time_ms/1000.0:.2f}s."
            })

    return ResponseEnvelope(
        success=True,
        message="Timeline segments compiled successfully.",
        data=timeline_segments,
        request_id=request_id
    )
