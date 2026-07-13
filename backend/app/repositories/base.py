from typing import Generic, TypeVar, List, Optional, Any
from abc import ABC, abstractmethod

T = TypeVar('T')

class IRepository(Generic[T], ABC):
    """Generic interface for Repository CRUD operations to decouple business logic from SQLAlchemy."""
    @abstractmethod
    def get(self, id: str) -> Optional[T]:
        """Fetch a record by unique ID."""
        pass

    @abstractmethod
    def list(self) -> List[T]:
        """Fetch all records."""
        pass

    @abstractmethod
    def add(self, entity: T) -> T:
        """Add a new record to the session context."""
        pass

    @abstractmethod
    def delete(self, id: str) -> bool:
        """Delete a record by unique ID."""
        pass
