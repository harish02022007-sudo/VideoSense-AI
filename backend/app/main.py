import time
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.utils.logger import logger, set_correlation_id
from app.database.session import Base, engine

# Create relational tables on startup (especially useful for SQLite fallback)
try:
    logger.info("Initializing database schemas...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas initialized successfully.")
except Exception as e:
    logger.error(f"Error during database initialization: {e}")

# Instantiate FastAPI App
app = FastAPI(
    title=settings.app.title,
    description="Intelligent Multimodal Video Understanding, Search, Analytics, and Visual Product Discovery Platform",
    version="1.0.0",
    debug=settings.app.debug
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to specific origins in production configurations
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware for tracing and latency measurement
@app.middleware("http")
async def add_correlation_id_and_log(request: Request, call_next):
    # Retrieve existing Correlation-ID or generate a new UUID
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    set_correlation_id(correlation_id)
    
    start_time = time.perf_counter()
    logger.info(f"Incoming Request: {request.method} {request.url.path}")
    
    try:
        response: Response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000
        
        # Inject correlation ID in response headers for client verification
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Response-Time-Ms"] = f"{process_time_ms:.2f}"
        
        logger.info(
            f"Completed Request: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Latency: {process_time_ms:.2f}ms"
        )
        return response
    except Exception as e:
        process_time_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            f"Failed Request: {request.method} {request.url.path} - "
            f"Error: {str(e)} - "
            f"Latency: {process_time_ms:.2f}ms",
            exc_info=True
        )
        # Ensure we return a structured error response in case of failure
        raise e

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
