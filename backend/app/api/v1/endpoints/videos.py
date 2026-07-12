from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db_session

router = APIRouter()

@router.get("/")
def list_videos(db: Session = Depends(get_db_session)) -> List[Dict[str, Any]]:
    """
    Lists metadata for all uploaded videos.
    """
    # Placeholder mock video records for Phase 1 UI testing
    return [
        {
            "id": "mock-uuid-1",
            "filename": "retail_store_camera.mp4",
            "title": "Retail Store Surveillance",
            "duration": 45.5,
            "status": "completed",
            "progress": 100,
            "created_at": "2026-07-11T12:00:00Z",
            "size_bytes": 1024 * 1024 * 12
        },
        {
            "id": "mock-uuid-2",
            "filename": "warehouse_traffic.mp4",
            "title": "Warehouse Traffic Monitoring",
            "duration": 120.0,
            "status": "processing",
            "progress": 45,
            "created_at": "2026-07-11T14:30:00Z",
            "size_bytes": 1024 * 1024 * 38
        }
    ]

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(None),
    db: Session = Depends(get_db_session)
) -> Dict[str, Any]:
    """
    Receives video file upload, registers record in DB, and dispatches background parsing tasks.
    """
    # Enforce file format checks
    filename = file.filename
    ext = filename.split(".")[-1].lower()
    if ext not in ["mp4", "avi", "mov", "mkv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'"
        )
        
    # Phase 1 mock upload successful response
    return {
        "id": "mock-uuid-new",
        "filename": filename,
        "title": title or filename,
        "status": "queued",
        "progress": 0,
        "created_at": "2026-07-11T19:54:00Z"
    }
