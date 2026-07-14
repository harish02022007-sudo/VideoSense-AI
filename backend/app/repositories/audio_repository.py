from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import Audio
from app.interfaces.repositories import IAudioRepository

class AudioRepository(IAudioRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[Audio]:
        return self.db.query(Audio).filter(Audio.id == id).first()

    def list(self) -> List[Audio]:
        return self.db.query(Audio).all()

    def add(self, entity: Audio) -> Audio:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> Optional[Audio]:
        return self.db.query(Audio).filter(Audio.video_id == video_id).first()
