import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.middleware.correlation import CorrelationIdMiddleware
from app.middleware.exception_handler import global_exception_handler
from app.core.logging import get_logger
from app.workers.worker_manager import WorkerManager
from app.mlops.model_registry import initialize_model_registry

logger = get_logger("app")

# Instantiate FastAPI App
app = FastAPI(
    title=settings.app.title,
    description="Intelligent Multimodal Video Understanding, Search, Analytics, and Visual Product Discovery Platform",
    version="1.0.0",
    debug=settings.app.debug
)

@app.on_event("startup")
async def startup_event() -> None:

    initialize_model_registry()
    logger.info(
        "Model registry initialized"
    )

    await WorkerManager.start_worker()
    logger.info(
        "WorkerManager started"
    )

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Correlation ID Middleware
app.add_middleware(CorrelationIdMiddleware)

# Register Global Exception Handler
from app.core.exceptions import BaseAppException
app.add_exception_handler(BaseAppException, global_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Mount API version 1 Router
app.include_router(api_router, prefix="/api/v1")

# Mount static uploads directory for video streaming, previews, and thumbnails
import os
from fastapi.staticfiles import StaticFiles
uploads_path = os.path.abspath(settings.storage.upload_dir)
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# Mount Sample_Videos directory for sample selection
sample_videos_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Sample_Videos"))
if os.path.exists(sample_videos_path):
    app.mount("/sample_videos", StaticFiles(directory=sample_videos_path), name="sample_videos")

@app.get("/")
def read_root():
    return {
        "app": settings.app.title,
        "version": "1.0.0",
        "docs_url": "/docs",
        "status": "online"
    }