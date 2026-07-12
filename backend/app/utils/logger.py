import contextvars
import json
import logging
import os
import sys
import time
from datetime import datetime
from logging.handlers import RotatingFileHandler
from app.core.config import settings

# Context variable for tracking correlation IDs across threads / async tasks
correlation_id_ctx = contextvars.ContextVar("correlation_id", default="-")

def get_correlation_id() -> str:
    return correlation_id_ctx.get()

def set_correlation_id(cid: str) -> None:
    correlation_id_ctx.set(cid)

class StructuredFormatter(logging.Formatter):
    """
    Custom formatter that outputs log events in JSON or standard readable text
    and appends correlation IDs.
    """
    def __init__(self, use_json: bool = True):
        super().__init__()
        self.use_json = use_json

    def format(self, record: logging.LogRecord) -> str:
        record.asctime = self.formatTime(record, self.datefmt)
        correlation_id = get_correlation_id()
        
        # Build log record attributes
        log_data = {
            "timestamp": record.asctime,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id,
            "file": f"{record.filename}:{record.lineno}",
            "function": record.funcName
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        if self.use_json:
            return json.dumps(log_data)
        else:
            exc_part = f"\n{log_data['exception']}" if "exception" in log_data else ""
            return f"[{log_data['timestamp']}] [{log_data['level']}] [{log_data['correlation_id']}] ({log_data['file']}) {log_data['message']}{exc_part}"

def setup_logger(name: str = "videosense") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.logging.level.upper(), logging.INFO))
    
    # Avoid duplicate handlers if setup is called multiple times
    if logger.handlers:
        return logger
        
    use_json = settings.logging.format.lower() == "json"
    formatter = StructuredFormatter(use_json=use_json)
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Rotating File Handler
    if settings.logging.save_to_file:
        file_path = settings.logging.file_path
        # Ensure parent folder exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        file_handler = RotatingFileHandler(
            file_path,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger

# Initialize application logger instance
logger = setup_logger()
