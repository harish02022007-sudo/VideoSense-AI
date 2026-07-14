from fastapi import APIRouter
from app.api.v1.endpoints import health, videos, jobs, system, analysis

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(system.router, prefix="/system", tags=["System"])
api_router.include_router(videos.router, prefix="/videos", tags=["Videos"])
api_router.include_router(analysis.router, prefix="/videos", tags=["Analysis"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])

# Placeholders for future phases (expanded in subsequent milestones)
@api_router.get("/chat/placeholder")
def chat_placeholder():
    return {"message": "Chat endpoint placeholder"}

@api_router.get("/search/placeholder")
def search_placeholder():
    return {"message": "Search endpoint placeholder"}

@api_router.get("/analytics/placeholder")
def analytics_placeholder():
    return {"message": "Analytics endpoint placeholder"}
