from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.processing_log import ProcessingLog
from app.interfaces.repositories import IProcessingLogRepository

class ProcessingLogRepository(IProcessingLogRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[ProcessingLog]:
        return self.db.query(ProcessingLog).filter(ProcessingLog.id == id).first()

    def list(self) -> List[ProcessingLog]:
        return self.db.query(ProcessingLog).all()

    def add(self, entity: ProcessingLog) -> ProcessingLog:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_job_id(self, job_id: str) -> List[ProcessingLog]:
        return self.db.query(ProcessingLog).filter(ProcessingLog.job_id == job_id).order_by(ProcessingLog.created_at).all()
