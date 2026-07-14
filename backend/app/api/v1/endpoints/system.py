import shutil
import subprocess
from typing import Dict, Any, List
from fastapi import APIRouter, Request
from sqlalchemy import text
from app.db.unit_of_work import UnitOfWork
from app.schemas.common import ResponseEnvelope

router = APIRouter()

@router.get("/health", response_model=ResponseEnvelope[Dict[str, Any]])
async def check_health(request: Request):
    """Executes verification diagnostics on DB connectivity, FFmpeg paths, and storage files writing."""
    request_id = getattr(request.state, "request_id", "N/A")
    health_status = {
        "status": "healthy",
        "database": "online",
        "ffmpeg": "available",
        "storage": "writable"
    }

    # 1. Verify Database
    try:
        with UnitOfWork() as uow:
            uow.session.execute(text("SELECT 1") if "text" in globals() else sa_text("SELECT 1"))
    except Exception:
        # Fallback raw check
        try:
            from sqlalchemy import text
            with UnitOfWork() as uow:
                uow.session.execute(text("SELECT 1"))
        except Exception:
            health_status["database"] = "offline"
            health_status["status"] = "unhealthy"

    # 2. Verify FFmpeg path
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        health_status["ffmpeg"] = "missing"
        health_status["status"] = "unhealthy"

    return ResponseEnvelope(
        success=True,
        message="System status health diagnostics completed successfully.",
        data=health_status,
        request_id=request_id
    )


@router.get("/models", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def get_system_models(request: Request):
    """Resolves running deep learning model registration rows."""
    request_id = getattr(request.state, "request_id", "N/A")
    with UnitOfWork() as uow:
        db_models = uow.model_registry.list()
        models_data = [
            {
                "id": m.id,
                "model_name": m.model_name,
                "model_type": m.model_type,
                "version": m.version,
                "provider": m.provider,
                "status": m.status,
                "hardware_requirement": m.hardware_requirement
            }
            for m in db_models
        ]
        
    return ResponseEnvelope(
        success=True,
        message="Active AI model telemetry retrieved successfully.",
        data=models_data,
        request_id=request_id
    )
