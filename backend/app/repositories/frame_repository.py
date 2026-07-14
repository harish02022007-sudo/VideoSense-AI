from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import Frame
from app.interfaces.repositories import IFrameRepository

class FrameRepository(IFrameRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[Frame]:
        return self.db.query(Frame).filter(Frame.id == id).first()

    def list(self) -> List[Frame]:
        return self.db.query(Frame).all()

    def add(self, entity: Frame) -> Frame:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        frame = self.get(id)
        if frame:
            self.db.delete(frame)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> List[Frame]:
        return self.db.query(Frame).filter(Frame.video_id == video_id).order_by(Frame.frame_number).all()
