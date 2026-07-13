from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel
from datetime import datetime

T = TypeVar('T')

class ResponseEnvelope(BaseModel, Generic[T]):
    """Standardized wrapper returned by all API endpoints."""
    success: bool
    message: str
    data: Optional[T] = None
    request_id: str
    timestamp: str = datetime.utcnow().isoformat()


class PaginatedResponse(BaseModel, Generic[T]):
    """Standardized paginated list response wrapper."""
    items: List[T]
    total_count: int
    page: int
    page_size: int
    total_pages: int


class ProblemDetails(BaseModel):
    """Standardized RFC7807 error format returned on exceptions."""
    type: str
    title: str
    status: int
    detail: str
    instance: str
    error_code: str
    request_id: str
    timestamp: str = datetime.utcnow().isoformat()
