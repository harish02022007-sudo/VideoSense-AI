from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import Job
from app.repositories.base import IRepository

class JobRepository(IRepository[Job]):
    """SQLAlchemy implementation of the Job repository interface."""
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[Job]:
        return self.db.query(Job).filter(Job.id == id).first()

    def list(self) -> List[Job]:
        return self.db.query(Job).all()

    def add(self, entity: Job) -> Job:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        job = self.get(id)
        if job:
            self.db.delete(job)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> Optional[Job]:
        """Fetch a job related to a specific video ID."""
        return self.db.query(Job).filter(Job.video_id == video_id).first()
