from fastapi import APIRouter
from app.api.v1.endpoints import health, videos

api_router = APIRouter()

# Register sub-routers
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(videos.router, prefix="/videos", tags=["Videos"])

# Add placeholder endpoints for future phases (chat, search, analytics, products)
# These will be expanded in Phases 4, 5, and 6
@api_router.get("/chat/placeholder")
def chat_placeholder():
    return {"message": "Chat endpoint placeholder"}

@api_router.get("/search/placeholder")
def search_placeholder():
    return {"message": "Search endpoint placeholder"}

@api_router.get("/analytics/placeholder")
def analytics_placeholder():
    return {"message": "Analytics endpoint placeholder"}
