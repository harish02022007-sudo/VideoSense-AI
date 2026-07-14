from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.model_registry import ModelRegistry
from app.interfaces.repositories import IModelRegistryRepository

class ModelRegistryRepository(IModelRegistryRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[ModelRegistry]:
        return self.db.query(ModelRegistry).filter(ModelRegistry.id == id).first()

    def list(self) -> List[ModelRegistry]:
        return self.db.query(ModelRegistry).all()

    def add(self, entity: ModelRegistry) -> ModelRegistry:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_name(self, model_name: str) -> Optional[ModelRegistry]:
        return self.db.query(ModelRegistry).filter(ModelRegistry.model_name == model_name).first()
