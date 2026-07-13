import os
import shutil
from app.interfaces.storage import IStorageManager
from app.types.results import Result
from app.infrastructure.storage.path_manager import PathManager

class FileManager(IStorageManager):
    """Concrete implementation of IStorageManager interface handling physical disk operations."""
    def save_original(self, video_id: str, filename: str, content: bytes) -> Result[str]:
        try:
            target_path = PathManager.get_original_path(video_id, filename)
            parent_dir = os.path.dirname(target_path)
            os.makedirs(parent_dir, exist_ok=True)
            
            with open(target_path, "wb") as f:
                f.write(content)
                
            return Result.Success(target_path)
        except Exception as e:
            return Result.Failure(f"Failed to write original video content to disk: {str(e)}")

    def get_stage_dir(self, video_id: str, stage_name: str) -> str:
        target_dir = PathManager.get_stage_dir(video_id, stage_name)
        os.makedirs(target_dir, exist_ok=True)
        return target_dir

    def cleanup_video(self, video_id: str) -> Result[None]:
        try:
            video_dir = PathManager.get_video_dir(video_id)
            if os.path.exists(video_dir):
                shutil.rmtree(video_dir)
            return Result.Success(None)
        except Exception as e:
            return Result.Failure(f"Failed to clean up video storage directory: {str(e)}")
