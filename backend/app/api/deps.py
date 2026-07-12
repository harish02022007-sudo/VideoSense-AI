from typing import Generator
from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db

def get_db_session() -> Generator[Session, None, None]:
    """
    Dependency resolver for SQLAlchemy database sessions.
    """
    yield from get_db()
