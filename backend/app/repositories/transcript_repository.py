from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.analysis import Transcript
from app.interfaces.repositories import ITranscriptRepository

class TranscriptRepository(ITranscriptRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id: str) -> Optional[Transcript]:
        return self.db.query(Transcript).filter(Transcript.id == id).first()

    def list(self) -> List[Transcript]:
        return self.db.query(Transcript).all()

    def add(self, entity: Transcript) -> Transcript:
        self.db.add(entity)
        return entity

    def delete(self, id: str) -> bool:
        res = self.get(id)
        if res:
            self.db.delete(res)
            return True
        return False

    def get_by_video_id(self, video_id: str) -> List[Transcript]:
        return self.db.query(Transcript).filter(Transcript.video_id == video_id).order_by(Transcript.start_time_ms).all()
