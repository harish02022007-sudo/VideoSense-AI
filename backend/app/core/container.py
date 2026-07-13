from app.infrastructure.storage.file_manager import FileManager
from app.infrastructure.ffmpeg.metadata_extractor import MetadataExtractor
from app.interfaces.storage import IStorageManager
from app.interfaces.metadata import IMetadataService

class Container:
    """Dependency Injection container class to resolve backend services concrete implementations."""
    _storage_manager: IStorageManager = FileManager()
    _metadata_service: IMetadataService = MetadataExtractor()

    @classmethod
    def get_storage_manager(cls) -> IStorageManager:
        return cls._storage_manager

    @classmethod
    def get_metadata_service(cls) -> IMetadataService:
        return cls._metadata_service
