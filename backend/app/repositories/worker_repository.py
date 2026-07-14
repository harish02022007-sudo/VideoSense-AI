from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.worker import Worker
from app.interfaces.repositories import IWorkerRepository

class WorkerRepository(IWorkerRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[Worker]:
        return self.db.query(Worker).filter(Worker.id == id).first()

    def list(self) -> List[Worker]:
        return self.db.query(Worker).all()

    def add(self, entity: Worker) -> Worker:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_active_workers(self) -> List[Worker]:
        return self.db.query(Worker).filter(Worker.status == "active").all()
