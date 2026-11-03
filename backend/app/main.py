import os
import gc
import time
from dotenv import load_dotenv

# Enforce single-threaded execution to prevent memory fragmentation on multi-core cloud containers
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("TORCH_NUM_THREADS", "1")
os.environ.setdefault("MALLOC_ARENA_MAX", "2")
os.environ.setdefault("PYTHONMALLOC", "malloc")

try:
    import torch
    torch.set_num_threads(1)
except ImportError:
    pass

load_dotenv()

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
    import asyncio
    from app.database.session import engine, Base
    import app.models.user
    import app.models.otp
    import app.models.analysis
    import app.models.summary
    import app.models.embedding
    import app.models.processing_config
    import app.models.pipeline
    import app.models.processing_log
    import app.models.worker
    import app.models.notification

    # Resilient table creation with retries for cloud-managed PostgreSQL cold start
    for attempt in range(5):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database schema initialized successfully")
            break
        except Exception as e:
            if attempt == 4:
                logger.error(f"Failed to initialize database tables after 5 attempts: {e}")
                raise
            logger.warning(f"Database connection attempt {attempt + 1}/5 failed ({e}). Retrying in 2 seconds...")
            await asyncio.sleep(2)

    try:
        initialize_model_registry()
        logger.info("Model registry initialized")
    except Exception as e:
        logger.warning(f"Model registry initialization deferred: {e}")

    try:
        await WorkerManager.start_worker()
        logger.info("WorkerManager started")
    except Exception as e:
        logger.warning(f"WorkerManager startup deferred: {e}")

    # Recover any jobs left pending across cloud server restarts
    try:
        from app.db.unit_of_work import UnitOfWork
        from app.models.analysis import Job
        from datetime import datetime
        with UnitOfWork() as uow:
            stalled_jobs = (
                uow.jobs.session.query(Job)
                .filter(Job.status.in_(["processing", "embedding_pending", "validating"]))
                .all()
            )
            for j in stalled_jobs:
                has_frames = len(uow.frames.get_by_video_id(j.video_id)) > 0
                if has_frames:
                    logger.info(f"Auto-completing previously stalled job {j.id} for video {j.video_id}")
                    j.status = "completed"
                    j.current_stage = "completed"
                    j.progress = 100
                    j.completed_at = datetime.utcnow()
                    from app.workers.embedding_worker import EmbeddingWorker
                    EmbeddingWorker.start_embedding_task(j.video_id, j.id, "recovery")
                else:
                    j.status = "failed"
                    j.error_message = "Server restarted before frames could be processed. Please re-upload video."
                    j.completed_at = datetime.utcnow()
            # Restore any sample videos whose files were cleared on ephemeral container restart
            try:
                from app.models.analysis import Video
                from app.infrastructure.storage.path_manager import PathManager
                all_vids = uow.session.query(Video).all()
                for v in all_vids:
                    PathManager.resolve_video_file(v.id, v.filename, v.filepath)
                logger.info(f"Verified/restored storage assets for {len(all_vids)} registered videos.")
            except Exception as res_err:
                logger.warning(f"Video file asset restoration deferred: {res_err}")

            uow.commit()
    except Exception as rec_err:
        logger.warning(f"Orphaned job recovery deferred: {rec_err}")

    # Verify Supabase Cloud Storage connection if configured
    try:
        from app.infrastructure.storage.supabase_storage import supabase_storage
        if supabase_storage.is_enabled:
            logger.info("Supabase Cloud Storage active. Checking storage bucket...")
            supabase_storage.ensure_bucket_exists()
    except Exception as sb_err:
        logger.warning(f"Supabase storage startup check deferred: {sb_err}")

    # Reclaim startup memory
    gc.collect()
    logger.info("Startup complete - Garbage collection completed")

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_origins=["*"],
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