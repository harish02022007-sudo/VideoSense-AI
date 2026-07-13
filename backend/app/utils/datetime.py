from datetime import datetime, timezone

def get_utc_now() -> datetime:
    """Returns the current date and time in UTC format."""
    return datetime.now(timezone.utc)

def format_iso(dt: datetime) -> str:
    """Converts a datetime object to an ISO format string."""
    return dt.isoformat()
