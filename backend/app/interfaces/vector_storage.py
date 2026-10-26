from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import numpy as np

class IVectorStorageService(ABC):
    """Abstract interface definition for numpy vector storage filesystem mappings."""
    @abstractmethod
    def save_vector(
        self,
        video_id: str,
        modality: str,
        vector: np.ndarray,
        metadata: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Saves a numpy vector array and optional frame metadata to filesystem. Returns filepath."""
        pass

    @abstractmethod
    def load_vector(self, video_id: str, modality: str) -> np.ndarray:
        """Loads a numpy vector array for a given video and modality."""
        pass

    @abstractmethod
    def load_frame_metadata(self, video_id: str) -> List[Dict[str, Any]]:
        """Loads frame mapping JSON metadata (index, timestamp, frame path)."""
        pass

    @abstractmethod
    def delete_vector(self, video_id: str, modality: str) -> bool:
        """Deletes vector arrays and frame metadata records for a given video and modality."""
        pass

    @abstractmethod
    def vector_exists(self, video_id: str, modality: str) -> bool:
        """Returns True if the specified modality vector exists on the disk."""
        pass
