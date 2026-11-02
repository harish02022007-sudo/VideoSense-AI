import os
import json
from typing import List, Dict, Any, Optional
import numpy as np
from app.core.config import settings
from app.interfaces.vector_storage import IVectorStorageService
from app.core.logging import get_logger

logger = get_logger("app.infrastructure.storage.vector_storage")

class VectorStorageService(IVectorStorageService):
    """Concrete implementation of IVectorStorageService storing numpy arrays on disk."""

    def __init__(self) -> None:
        # Resolve base embeddings path as an absolute path
        self.base_dir = os.path.abspath(settings.embeddings.storage_path)
        os.makedirs(self.base_dir, exist_ok=True)
        logger.info(f"Initialized VectorStorageService at base path: {self.base_dir}")

    def _get_video_dir(self, video_id: str) -> str:
        video_dir = os.path.join(self.base_dir, video_id)
        os.makedirs(video_dir, exist_ok=True)
        return video_dir

    def _get_vector_path(self, video_id: str, modality: str) -> str:
        video_dir = self._get_video_dir(video_id)
        filename = f"{modality.lower()}.npy"
        return os.path.join(video_dir, filename)

    def _get_metadata_path(self, video_id: str) -> str:
        video_dir = self._get_video_dir(video_id)
        return os.path.join(video_dir, "frame_metadata.json")

    def save_vector(
        self,
        video_id: str,
        modality: str,
        vector: np.ndarray,
        metadata: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Saves a numpy vector array and optional frame metadata to filesystem. Returns absolute path."""
        try:
            filepath = self._get_vector_path(video_id, modality)
            with open(filepath, "wb") as f:
                np.save(f, vector)
            logger.info(f"Saved {modality} embedding vector to: {filepath}")

            if modality.upper() == "FRAME" and metadata is not None:
                meta_path = self._get_metadata_path(video_id)
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)
                logger.info(f"Saved frame timestamp mappings metadata to: {meta_path}")

            # Return path relative to project root or configured relative path consistently
            # Let's return standard relative path reference for video embedding DB column
            return f"storage/embeddings/{video_id}/{modality.lower()}.npy"
        except Exception as e:
            logger.error(f"Error saving vector for video {video_id} modality {modality}: {str(e)}")
            raise

    def load_vector(self, video_id: str, modality: str) -> np.ndarray:
        """Loads a numpy vector array for a given video and modality."""
        filepath = self._get_vector_path(video_id, modality)
        if not os.path.exists(filepath):
            logger.error(f"Vector file not found at: {filepath}")
            raise FileNotFoundError(f"Vector file not found at: {filepath}")
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            import io
            return np.load(io.BytesIO(data))
        except Exception as e:
            logger.error(f"Error loading vector from {filepath}: {str(e)}")
            raise

    def load_frame_metadata(self, video_id: str) -> List[Dict[str, Any]]:
        """Loads frame mapping JSON metadata (index, timestamp, frame path)."""
        filepath = self._get_metadata_path(video_id)
        if not os.path.exists(filepath):
            logger.warning(f"Frame metadata mapping file not found at: {filepath}")
            return []
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading frame metadata from {filepath}: {str(e)}")
            return []

    def delete_vector(self, video_id: str, modality: str) -> bool:
        """Deletes vector arrays and frame metadata records for a given video and modality."""
        import time
        try:
            filepath = self._get_vector_path(video_id, modality)
            deleted = False
            
            # Retry deletion loop to handle Windows indexer/AV sharing violations
            if os.path.exists(filepath):
                for attempt in range(5):
                    try:
                        os.remove(filepath)
                        logger.info(f"Deleted vector path: {filepath}")
                        deleted = True
                        break
                    except PermissionError:
                        if attempt == 4:
                            raise
                        time.sleep(0.1)

            if modality.upper() == "FRAME":
                meta_path = self._get_metadata_path(video_id)
                if os.path.exists(meta_path):
                    for attempt in range(5):
                        try:
                            os.remove(meta_path)
                            logger.info(f"Deleted metadata path: {meta_path}")
                            deleted = True
                            break
                        except PermissionError:
                            if attempt == 4:
                                raise
                            time.sleep(0.1)
            
            # If the directory is now empty, delete it (with retries)
            video_dir = self._get_video_dir(video_id)
            if os.path.exists(video_dir) and not os.listdir(video_dir):
                for attempt in range(5):
                    try:
                        os.rmdir(video_dir)
                        logger.info(f"Removed empty video embeddings folder: {video_dir}")
                        break
                    except PermissionError:
                        if attempt == 4:
                            raise
                        time.sleep(0.1)
                
            return deleted
        except Exception as e:
            logger.error(f"Error deleting vector for video {video_id} modality {modality}: {str(e)}")
            return False

    def vector_exists(self, video_id: str, modality: str) -> bool:
        """Returns True if the specified modality vector exists on the disk."""
        filepath = self._get_vector_path(video_id, modality)
        return os.path.exists(filepath)
