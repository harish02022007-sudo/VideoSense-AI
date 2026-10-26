from abc import ABC, abstractmethod
from typing import List

class IEmbeddingService(ABC):
    """Abstract interface for lazy-loaded multimodal embedding generators (MiniLM and CLIP)."""
    @abstractmethod
    def load_models(self) -> None:
        """Loads both text and vision models if they are not already active."""
        pass

    @abstractmethod
    def generate_text_embedding(self, text: str) -> List[float]:
        """Generates semantic text representation vectors."""
        pass

    @abstractmethod
    def generate_frame_embedding(self, frame_path: str) -> List[float]:
        """Generates CLIP vision visual feature vectors."""
        pass

    @abstractmethod
    def generate_audio_embedding(self, transcript_text: str) -> List[float]:
        """Generates transcript-based audio feature vectors."""
        pass

    @abstractmethod
    def generate_metadata_embedding(self, metadata_summary: str) -> List[float]:
        """Generates video metadata feature vectors."""
        pass

    @abstractmethod
    def generate_query_embedding(self, query: str, modality: str) -> List[float]:
        """Generates appropriate text query embedding depending on targeted modality."""
        pass

    @abstractmethod
    def get_dimension(self, modality: str) -> int:
        """Returns the vector size dimension of a given modality."""
        pass
