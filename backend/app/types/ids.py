import uuid
from typing import Any

class VideoID:
    """Type-safe wrapper for Video UUIDs with automatic string validation."""
    def __init__(self, val: str) -> None:
        try:
            uuid.UUID(val)
            self._value = val
        except ValueError:
            raise ValueError(f"Invalid Video ID: '{val}' is not a valid UUIDv4.")

    def __str__(self) -> str:
        return self._value

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, VideoID):
            return self._value == other._value
        return False


class JobID:
    """Type-safe wrapper for Job UUIDs with automatic string validation."""
    def __init__(self, val: str) -> None:
        try:
            uuid.UUID(val)
            self._value = val
        except ValueError:
            raise ValueError(f"Invalid Job ID: '{val}' is not a valid UUIDv4.")

    def __str__(self) -> str:
        return self._value

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, JobID):
            return self._value == other._value
        return False
