from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import Scene
from app.interfaces.repositories import ISceneRepository

class SceneRepository(ISceneRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[Scene]:
        return self.db.query(Scene).filter(Scene.id == id).first()

    def list(self) -> List[Scene]:
        return self.db.query(Scene).all()

    def add(self, entity: Scene) -> Scene:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> List[Scene]:
        return self.db.query(Scene).filter(Scene.video_id == video_id).order_by(Scene.scene_number).all()
