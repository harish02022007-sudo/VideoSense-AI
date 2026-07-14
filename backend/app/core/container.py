from typing import List, Any, Dict
from app.infrastructure.storage.file_manager import FileManager
from app.infrastructure.ffmpeg.metadata_extractor import MetadataExtractor
from app.interfaces.storage import IStorageManager
from app.interfaces.metadata import IMetadataService
from app.interfaces.extraction import IFrameExtractor, IAudioExtractor, IPreviewGenerator
from app.interfaces.vision import IObjectDetector, IFaceDetector
from app.interfaces.speech import ISpeechRecognizer
from app.interfaces.ocr import IOCRService
from app.interfaces.scene import ISceneDetector
from app.types.results import Result
from app.processing.progress_tracker import ProgressTracker
from app.processing.error_handler import PipelineErrorHandler

from app.infrastructure.ffmpeg.frame_extractor import FFmpegFrameExtractor
from app.infrastructure.ffmpeg.audio_extractor import FFmpegAudioExtractor
from app.infrastructure.ffmpeg.preview_generator import FFmpegPreviewGenerator
from app.infrastructure.providers.yolo_detector import YoloObjectDetector
from app.infrastructure.providers.easyocr_service import EasyOCRService
from app.infrastructure.providers.whisper_service import WhisperSpeechRecognizer
from app.infrastructure.ffmpeg.scene_detector import PySceneDetector

class StubFaceDetector(IFaceDetector):
    def detect_faces(self, frame_paths: List[str]) -> Result[List[Any]]:
        return Result.Success([])


class Container:
    """Dependency Injection container class to resolve backend services concrete implementations."""
    _storage_manager: IStorageManager = FileManager()
    _metadata_service: IMetadataService = MetadataExtractor()
    _frame_extractor: IFrameExtractor = FFmpegFrameExtractor()
    _audio_extractor: IAudioExtractor = FFmpegAudioExtractor()
    _preview_generator: IPreviewGenerator = FFmpegPreviewGenerator()
    _ocr_service: IOCRService = EasyOCRService()
    _speech_service: ISpeechRecognizer = WhisperSpeechRecognizer()
    _vision_service: IObjectDetector = YoloObjectDetector()
    _face_detector: IFaceDetector = StubFaceDetector()
    _scene_detector: ISceneDetector = PySceneDetector()

    @classmethod
    def get_storage_manager(cls) -> IStorageManager:
        return cls._storage_manager

    @classmethod
    def get_metadata_service(cls) -> IMetadataService:
        return cls._metadata_service

    @classmethod
    def get_frame_extractor(cls) -> IFrameExtractor:
        return cls._frame_extractor

    @classmethod
    def get_audio_extractor(cls) -> IAudioExtractor:
        return cls._audio_extractor

    @classmethod
    def get_preview_generator(cls) -> IPreviewGenerator:
        return cls._preview_generator

    @classmethod
    def get_ocr_service(cls) -> IOCRService:
        return cls._ocr_service

    @classmethod
    def get_speech_service(cls) -> ISpeechRecognizer:
        return cls._speech_service

    @classmethod
    def get_vision_service(cls) -> IObjectDetector:
        return cls._vision_service

    @classmethod
    def get_face_detector(cls) -> IFaceDetector:
        return cls._face_detector

    @classmethod
    def get_scene_detector(cls) -> ISceneDetector:
        return cls._scene_detector

    @classmethod
    def get_progress_tracker(cls) -> type[ProgressTracker]:
        return ProgressTracker

    @classmethod
    def get_error_handler(cls) -> type[PipelineErrorHandler]:
        return PipelineErrorHandler
