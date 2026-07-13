import os
from app.core.config import settings

class PathManager:
    """Manages secure and isolated sub-folders configurations for each uploaded video UUID."""
    @staticmethod
    def get_video_dir(video_id: str) -> str:
        return os.path.abspath(os.path.join(settings.storage.upload_dir, video_id))

    @staticmethod
    def get_stage_dir(video_id: str, stage_name: str) -> str:
        video_dir = PathManager.get_video_dir(video_id)
        # Ensure stage name is sanitized against path traversal injection
        sanitized_stage = os.path.basename(stage_name)
        return os.path.join(video_dir, sanitized_stage)

    @staticmethod
    def get_original_path(video_id: str, filename: str) -> str:
        stage_dir = PathManager.get_stage_dir(video_id, "original")
        sanitized_filename = os.path.basename(filename)
        return os.path.join(stage_dir, sanitized_filename)

    @staticmethod
    def get_manifest_path(video_id: str) -> str:
        return os.path.join(PathManager.get_video_dir(video_id), "manifest.json")

    @staticmethod
    def get_metrics_path(video_id: str) -> str:
        return os.path.join(PathManager.get_video_dir(video_id), "processing_metrics.json")
