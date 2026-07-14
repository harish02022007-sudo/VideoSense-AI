from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.embedding import VideoEmbedding
from app.interfaces.repositories import IVideoEmbeddingRepository

class VideoEmbeddingRepository(IVideoEmbeddingRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[VideoEmbedding]:
        return self.db.query(VideoEmbedding).filter(VideoEmbedding.id == id).first()

    def list(self) -> List[VideoEmbedding]:
        return self.db.query(VideoEmbedding).all()

    def add(self, entity: VideoEmbedding) -> VideoEmbedding:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> List[VideoEmbedding]:
        return self.db.query(VideoEmbedding).filter(VideoEmbedding.video_id == video_id).all()
