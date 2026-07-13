from abc import ABC, abstractmethod
from typing import Any
from app.types.results import Result

class ISummarizer(ABC):
    """Abstract interface definition for swappable LLM summarizers."""
    @abstractmethod
    def generate_summary(self, timeline: Any) -> Result[Any]:
        """Processes timeline mapping blocks to generate summaries, topics, and keywords."""
        pass
