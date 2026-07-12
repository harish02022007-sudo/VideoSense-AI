import psutil
import time
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db_session
from app.core.config import settings

router = APIRouter()

@router.get("/")
def check_health(db: Session = Depends(get_db_session)) -> Dict[str, Any]:
    """
    Exposes API, Database, Memory, CPU, and worker pipeline health diagnostics.
    """
    # 1. Test Database Connectivity
    db_status = "healthy"
    db_latency_ms = 0.0
    try:
        start_time = time.perf_counter()
        db.execute(text("SELECT 1"))
        db_latency_ms = (time.perf_counter() - start_time) * 1000
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    # 2. Get Memory & CPU Stats
    try:
        cpu_usage = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        memory_usage_pct = memory.percent
        memory_available_gb = memory.available / (1024 ** 3)
    except Exception:
        cpu_usage = 0.0
        memory_usage_pct = 0.0
        memory_available_gb = 0.0
        
    # 3. Model Loading Health (Stubbed until ModelManager is active)
    model_status = {
        "device": settings.models.device,
        "manager_mode": "lazy" if settings.models.manager.lazy_load else "eager",
        "active_models": [],
        "ram_footprint_mb": 0.0
    }
    
    # 4. Background Worker Diagnostics (Stubbed until Worker is active)
    worker_status = {
        "status": "idle",
        "active_jobs": 0,
        "queue_backlog": 0
    }

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": time.time(),
        "environment": settings.app.env,
        "services": {
            "api": "healthy",
            "database": {
                "status": db_status,
                "latency_ms": round(db_latency_ms, 2)
            },
            "vector_database": {
                "status": "initialized",
                "engine": "FAISS (Offline)"
            },
            "models": model_status,
            "worker": worker_status
        },
        "system": {
            "cpu_usage_percent": cpu_usage,
            "memory_usage_percent": memory_usage_pct,
            "memory_available_gb": round(memory_available_gb, 2)
        }
    }
