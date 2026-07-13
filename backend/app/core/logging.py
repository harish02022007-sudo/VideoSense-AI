import logging
import json
import time
import os
from typing import Any, Dict, Optional
from logging.handlers import RotatingFileHandler
from app.core.config import settings

class JSONFormatter(logging.Formatter):
    """Formats log messages as standardized JSON strings for indexing."""
    def format(self, record: logging.LogRecord) -> str:
        log_payload = {
            "timestamp": self.formatTime(record, self.datefmt),
            "log_level": record.levelname,
            "message": record.getMessage(),
            "logger_name": record.name,
            "filename": record.filename,
            "line_number": record.lineno,
            "request_id": getattr(record, "request_id", "N/A"),
            "job_id": getattr(record, "job_id", "N/A"),
            "video_id": getattr(record, "video_id", "N/A"),
            "stage": getattr(record, "stage", "N/A"),
            "elapsed_time": getattr(record, "elapsed_time", 0.0)
        }
        return json.dumps(log_payload)


def get_logger(name: str) -> logging.Logger:
    """Returns a logger instance configured with console and rotating file logs."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.logging.level.upper(), logging.INFO))
    
    # Avoid duplicate handlers if already initialized
    if logger.handlers:
        return logger

    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(JSONFormatter())
    logger.addHandler(console_handler)

    # Rotating File Handler
    if settings.logging.save_to_file:
        log_dir = os.path.dirname(settings.logging.file_path)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
            
        file_handler = RotatingFileHandler(
            settings.logging.file_path,
            maxBytes=settings.logging.rotation_bytes,
            backupCount=settings.logging.backup_count
        )
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)

    return logger

# Helper class to log request execution times dynamically
class ExecutionTimer:
    def __init__(self, logger: logging.Logger, task_name: str, video_id: str = "N/A", job_id: str = "N/A", stage: str = "N/A") -> None:
        self.logger = logger
        self.task_name = task_name
        self.video_id = video_id
        self.job_id = job_id
        self.stage = stage
        self.start_time = 0.0

    def __enter__(self) -> 'ExecutionTimer':
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        elapsed = time.time() - self.start_time
        extra = {
            "video_id": self.video_id,
            "job_id": self.job_id,
            "stage": self.stage,
            "elapsed_time": elapsed
        }
        if exc_type:
            self.logger.error(
                f"Task '{self.task_name}' failed after {elapsed:.4f}s with error: {str(exc_val)}",
                extra=extra
            )
        else:
            self.logger.info(
                f"Task '{self.task_name}' completed successfully in {elapsed:.4f}s.",
                extra=extra
            )
