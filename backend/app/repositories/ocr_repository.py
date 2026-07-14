from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import OCRResult
from app.interfaces.repositories import IOCRRepository

class OCRRepository(IOCRRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[OCRResult]:
        return self.db.query(OCRResult).filter(OCRResult.id == id).first()

    def list(self) -> List[OCRResult]:
        return self.db.query(OCRResult).all()

    def add(self, entity: OCRResult) -> OCRResult:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> List[OCRResult]:
        return self.db.query(OCRResult).filter(OCRResult.video_id == video_id).order_by(OCRResult.frame_timestamp).all()
