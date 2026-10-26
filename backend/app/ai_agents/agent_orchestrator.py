from typing import Dict, Any, List, Optional
from app.core.container import Container
from app.core.logging import get_logger

logger = get_logger("app.ai_agents.agent_orchestrator")

class AgentOrchestrator:
    """Retrieval controller that parses natural language queries and coordinates semantic context searches."""

    def analyze_query(self, query: str) -> Dict[str, Any]:
        """Heuristically determines query intent and selects the optimal modality target."""
        q = query.lower()
        
        # Heuristic rules for keyword classification
        text_keywords = ["ocr", "text", "write", "writing", "subtitle", "word", "letters", "screen", "overlay"]
        audio_keywords = ["say", "saying", "speak", "talking", "whisper", "audio", "voice", "sound", "dialogue", "speech"]
        metadata_keywords = ["fps", "duration", "length", "codec", "resolution", "dimension", "width", "height", "size", "bytes", "metadata"]

        if any(w in q for w in text_keywords):
            modality = "TEXT"
            reasoning = "Query targets screen text overlays or OCR concepts."
        elif any(w in q for w in audio_keywords):
            modality = "AUDIO"
            reasoning = "Query targets spoken dialogue or dialog transcripts."
        elif any(w in q for w in metadata_keywords):
            modality = "METADATA"
            reasoning = "Query targets video file properties or codec metadata descriptors."
        else:
            # Default to FRAME for visual query target matching (cooking, playing, etc.)
            modality = "FRAME"
            reasoning = "Query defaults to visual frame search matching."

        logger.info(f"Analyzed query='{query}' -> selected modality={modality} reasoning='{reasoning}'")
        return {
            "modality": modality,
            "reasoning": reasoning
        }

    def retrieve_context(
        self,
        query: str,
        video_id: Optional[str] = None,
        modality: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Parses query modality and resolves similarity ranks from SearchService."""
        # 1. Resolve modality: default to ALL for complete hybrid multimodal search
        if not modality or modality.upper() == "ALL":
            selected_mod = "ALL"
        else:
            selected_mod = modality

        # 2. Query similarity searches via SearchService
        search_service = Container.get_search_service()
        results = search_service.search(
            query=query,
            video_id=video_id,
            modality=selected_mod,
            top_k=top_k
        )

        logger.info(f"Retrieved {len(results)} contexts matching query '{query}'")
        return results
