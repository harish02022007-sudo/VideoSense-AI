from typing import Generic, TypeVar, Optional, Any

T = TypeVar('T')

class Result(Generic[T]):
    """Standardized result wrapper to encapsulate success payloads or failures."""
    def __init__(self, success: bool, value: Optional[T] = None, error: Optional[str] = None) -> None:
        self.success = success
        self.value = value
        self.error = error

    @classmethod
    def Success(cls, value: T) -> 'Result[T]':
        return cls(success=True, value=value)

    @classmethod
    def Failure(cls, error: str) -> 'Result[T]':
        return cls(success=False, error=error)

    def is_success(self) -> bool:
        return self.success

    def is_failure(self) -> bool:
        return not self.success
