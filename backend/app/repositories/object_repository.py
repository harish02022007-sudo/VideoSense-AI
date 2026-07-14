from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import Object
from app.interfaces.repositories import IObjectRepository

class ObjectRepository(IObjectRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[Object]:
        return self.db.query(Object).filter(Object.id == id).first()

    def list(self) -> List[Object]:
        return self.db.query(Object).all()

    def add(self, entity: Object) -> Object:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> List[Object]:
        return self.db.query(Object).filter(Object.video_id == video_id).order_by(Object.first_seen_timestamp).all()
