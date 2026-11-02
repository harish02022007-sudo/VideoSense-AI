from fastapi import APIRouter, Request, Depends
from typing import Dict, Any, List, Optional

from app.schemas.common import ResponseEnvelope
from app.schemas.search import SearchRequest
from app.models.user import User
from app.models.analysis import Video
from app.core.dependencies import get_optional_current_user
from app.db.unit_of_work import UnitOfWork
from app.core.logging import get_logger

logger = get_logger("app.api.search")

router = APIRouter()

@router.post(
    "",
    response_model=ResponseEnvelope[List[Dict[str, Any]]]
)
async def search_videos(
    search_req: SearchRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    request_id = getattr(
        request.state,
        "request_id",
        "N/A"
    )
    logger.info(
        f"Search endpoint triggered with query='{search_req.query}' request_id={request_id}"
    )

    if not current_user:
        return ResponseEnvelope(
            success=True,
            message="No results for unauthenticated search.",
            data=[],
            request_id=request_id
        )

    with UnitOfWork() as uow:
        user_video_ids = set([v[0] for v in uow.session.query(Video.id).filter(Video.user_id == current_user.id).all()])

    if not user_video_ids:
        return ResponseEnvelope(
            success=True,
            message="No videos in your account to search.",
            data=[],
            request_id=request_id
        )

    if search_req.video_id and search_req.video_id not in user_video_ids:
        return ResponseEnvelope(
            success=True,
            message="Target video does not belong to your account.",
            data=[],
            request_id=request_id
        )

    # We call AgentOrchestrator to perform retrieval orchestration
    from app.ai_agents.agent_orchestrator import AgentOrchestrator
    orchestrator = AgentOrchestrator()
    
    # Run query parsing & retrieve matching contexts
    results = orchestrator.retrieve_context(
        query=search_req.query,
        video_id=search_req.video_id,
        modality=search_req.modality,
        top_k=search_req.top_k
    )

    # Filter strictly to user's videos
    filtered_results = [r for r in results if r.get("video_id") in user_video_ids]

    return ResponseEnvelope(
        success=True,
        message="Search completed successfully.",
        data=filtered_results,
        request_id=request_id
    )
