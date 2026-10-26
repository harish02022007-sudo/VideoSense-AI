from fastapi import APIRouter, Query

from app.services.search_service import SearchService


router = APIRouter(
    prefix="/api/v1/search",
    tags=["Search"]
)


@router.get("/")
def search_video(
    query: str,
    video_id: str | None = None,
    modality: str | None = None,
    top_k: int = Query(5)
):

    service = SearchService()

    results = service.search(
        query=query,
        video_id=video_id,
        modality=modality,
        top_k=top_k
    )

    return {
        "success": True,
        "query": query,
        "results": results
    }