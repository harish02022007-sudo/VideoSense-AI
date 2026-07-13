from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar('T')

class PaginatedResult(BaseModel, Generic[T]):
    """Standardized response schema for returned paginated lists."""
    items: List[T]
    total_count: int
    page: int
    page_size: int
    total_pages: int
