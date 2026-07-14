from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.processing_config import VideoProcessingConfig
from app.interfaces.repositories import IVideoProcessingConfigRepository

class VideoProcessingConfigRepository(IVideoProcessingConfigRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[VideoProcessingConfig]:
        return self.db.query(VideoProcessingConfig).filter(VideoProcessingConfig.id == id).first()

    def list(self) -> List[VideoProcessingConfig]:
        return self.db.query(VideoProcessingConfig).all()

    def add(self, entity: VideoProcessingConfig) -> VideoProcessingConfig:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> Optional[VideoProcessingConfig]:
        return self.db.query(VideoProcessingConfig).filter(VideoProcessingConfig.video_id == video_id).first()
