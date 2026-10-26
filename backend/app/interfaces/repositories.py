from abc import ABC, abstractmethod
from typing import List, Optional, Any
from app.repositories.base import IRepository

class IFrameRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> List[Any]:
        pass

class IOCRRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> List[Any]:
        pass

class ITranscriptRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> List[Any]:
        pass

class ISceneRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> List[Any]:
        pass

class IObjectRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> List[Any]:
        pass

class IAudioRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> Optional[Any]:
        pass

class IFaceDetectionRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> List[Any]:
        pass

class IVideoEmbeddingRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> List[Any]:
        pass

    @abstractmethod
    def create_embedding(self, entity: Any) -> Any:
        pass

    @abstractmethod
    def get_by_video_and_type(self, video_id: str, embedding_type: str) -> Optional[Any]:
        pass

    @abstractmethod
    def delete_by_video_id(self, video_id: str) -> bool:
        pass

class IModelRegistryRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_name(self, model_name: str) -> Optional[Any]:
        pass

class IWorkerRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_active_workers(self) -> List[Any]:
        pass

class IPipelineExecutionRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_job_id(self, job_id: str) -> List[Any]:
        pass

class IVideoProcessingConfigRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_video_id(self, video_id: str) -> Optional[Any]:
        pass

class IProcessingLogRepository(IRepository[Any], ABC):
    @abstractmethod
    def get_by_job_id(self, job_id: str) -> List[Any]:
        pass
