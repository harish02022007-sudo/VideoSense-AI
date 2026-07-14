from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import FaceDetection
from app.interfaces.repositories import IFaceDetectionRepository

class FaceDetectionRepository(IFaceDetectionRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[FaceDetection]:
        return self.db.query(FaceDetection).filter(FaceDetection.id == id).first()

    def list(self) -> List[FaceDetection]:
        return self.db.query(FaceDetection).all()

    def add(self, entity: FaceDetection) -> FaceDetection:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> List[FaceDetection]:
        return self.db.query(FaceDetection).filter(FaceDetection.video_id == video_id).all()
