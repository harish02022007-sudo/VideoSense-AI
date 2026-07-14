from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.pipeline import PipelineExecution
from app.interfaces.repositories import IPipelineExecutionRepository

class PipelineExecutionRepository(IPipelineExecutionRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[PipelineExecution]:
        return self.db.query(PipelineExecution).filter(PipelineExecution.id == id).first()

    def list(self) -> List[PipelineExecution]:
        return self.db.query(PipelineExecution).all()

    def add(self, entity: PipelineExecution) -> PipelineExecution:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_job_id(self, job_id: str) -> List[PipelineExecution]:
        return self.db.query(PipelineExecution).filter(PipelineExecution.job_id == job_id).order_by(PipelineExecution.stage_order).all()
