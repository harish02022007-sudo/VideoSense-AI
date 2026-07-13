from typing import Optional, Any
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.repositories.video_repository import VideoRepository
from app.repositories.job_repository import JobRepository

class UnitOfWork:
    """Coordinates database transactions across repository layers."""
    def __init__(self) -> None:
        self.session_factory = SessionLocal
        self.session: Optional[Session] = None

    def __enter__(self) -> 'UnitOfWork':
        self.session = self.session_factory()
        self.videos = VideoRepository(self.session)
        self.jobs = JobRepository(self.session)
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if self.session:
            if exc_type:
                self.rollback()
            self.session.close()

    def commit(self) -> None:
        if self.session:
            self.session.commit()

    def rollback(self) -> None:
        if self.session:
            self.session.rollback()
