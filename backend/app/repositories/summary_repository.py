from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.summary import VideoSummary

class VideoSummaryRepository:
    """Repository for persistence and retrieval of VideoSummary entities."""
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[VideoSummary]:
        return self.db.query(VideoSummary).filter(VideoSummary.id == id).first()

    def get_by_video_id(self, video_id: str, mode: Optional[str] = None) -> Optional[VideoSummary]:
        query = self.db.query(VideoSummary).filter(VideoSummary.video_id == video_id)
        if mode:
            query = query.filter(VideoSummary.mode == mode)
        return query.order_by(VideoSummary.created_at.desc()).first()

    def list_by_video_id(self, video_id: str) -> List[VideoSummary]:
        return self.db.query(VideoSummary).filter(VideoSummary.video_id == video_id).order_by(VideoSummary.created_at.desc()).all()

    def add(self, entity: VideoSummary) -> VideoSummary:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False
