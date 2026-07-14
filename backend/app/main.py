import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.middleware.correlation import CorrelationIdMiddleware
from app.middleware.exception_handler import global_exception_handler
from app.core.logging import get_logger
from app.workers.worker_manager import WorkerManager

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
    await WorkerManager.start_worker()

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

@app.get("/")
def read_root():
    return {
        "app": settings.app.title,
        "version": "1.0.0",
        "docs_url": "/docs",
        "status": "online"
    }
