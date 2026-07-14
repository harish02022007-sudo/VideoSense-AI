from typing import Optional, Any
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.repositories.video_repository import VideoRepository
from app.repositories.job_repository import JobRepository
from app.repositories.frame_repository import FrameRepository
from app.repositories.ocr_repository import OCRRepository
from app.repositories.transcript_repository import TranscriptRepository
from app.repositories.scene_repository import SceneRepository
from app.repositories.object_repository import ObjectRepository
from app.repositories.audio_repository import AudioRepository
from app.repositories.face_detection_repository import FaceDetectionRepository
from app.repositories.embedding_repository import VideoEmbeddingRepository
from app.repositories.model_registry_repository import ModelRegistryRepository
from app.repositories.config_repository import VideoProcessingConfigRepository
from app.repositories.processing_log_repository import ProcessingLogRepository
from app.repositories.worker_repository import WorkerRepository
from app.repositories.pipeline_repository import PipelineExecutionRepository

class UnitOfWork:
    """Coordinates database transactions across repository layers."""
    def __init__(self) -> None:
        self.session_factory = SessionLocal
        self.session: Optional[Session] = None

    def __enter__(self) -> 'UnitOfWork':
        self.session = self.session_factory()
        self.videos = VideoRepository(self.session)
        self.jobs = JobRepository(self.session)
        self.frames = FrameRepository(self.session)
        self.ocr_results = OCRRepository(self.session)
        self.transcripts = TranscriptRepository(self.session)
        self.scenes = SceneRepository(self.session)
        self.objects = ObjectRepository(self.session)
        self.audio = AudioRepository(self.session)
        self.face_detections = FaceDetectionRepository(self.session)
        self.video_embeddings = VideoEmbeddingRepository(self.session)
        self.model_registry = ModelRegistryRepository(self.session)
        self.processing_configs = VideoProcessingConfigRepository(self.session)
        self.processing_logs = ProcessingLogRepository(self.session)
        self.workers = WorkerRepository(self.session)
        self.pipeline_executions = PipelineExecutionRepository(self.session)
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if self.session:
            if exc_type:
                self.rollback()
            self.session.close()

    def commit(self) -> None:
        if self.session:
            self.session.commit()

    def rollback(self) -> None:
        if self.session:
            self.session.rollback()
