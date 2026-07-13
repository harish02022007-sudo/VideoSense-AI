from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import Video
from app.repositories.base import IRepository

class VideoRepository(IRepository[Video]):
    """SQLAlchemy implementation of the Video repository interface."""
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[Video]:
        return self.db.query(Video).filter(Video.id == id).first()

    def list(self) -> List[Video]:
        return self.db.query(Video).all()

    def add(self, entity: Video) -> Video:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        video = self.get(id)
        if video:
            self.db.delete(video)
            return True
        return False

    def get_by_hash(self, sha256_hash: str) -> Optional[Video]:
        """Fetch a video by SHA256 checksum to support ingestion caches checks."""
        return self.db.query(Video).filter(Video.sha256_hash == sha256_hash).first()
