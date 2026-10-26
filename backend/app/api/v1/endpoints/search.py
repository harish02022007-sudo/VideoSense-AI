from fastapi import APIRouter, Request
from typing import Dict, Any, List

from app.schemas.common import ResponseEnvelope
from app.schemas.search import SearchRequest
from app.core.logging import get_logger

logger = get_logger("app.api.search")

router = APIRouter()

@router.post(
    "",
    response_model=ResponseEnvelope[List[Dict[str, Any]]]
)
async def search_videos(
    search_req: SearchRequest,
    request: Request
):
    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )
    logger.info(
        f"Search endpoint triggered with query='{search_req.query}' request_id={request_id}"
    )

    # We call AgentOrchestrator to perform retrieval orchestration
    # (Or direct call SearchService - let's resolve AgentOrchestrator from container or import directly)
    from app.ai_agents.agent_orchestrator import AgentOrchestrator
    orchestrator = AgentOrchestrator()
    
    # Run query parsing & retrieve matching contexts
    results = orchestrator.retrieve_context(
        query=search_req.query,
        video_id=search_req.video_id,
        modality=search_req.modality,
        top_k=search_req.top_k
    )

    return ResponseEnvelope(
        success=True,
        message="Search completed successfully.",
        data=results,
        request_id=request_id
    )
