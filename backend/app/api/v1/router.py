from fastapi import APIRouter
from app.api.v1.endpoints import health, videos, jobs, system, analysis, search, analytics, mlops, chat, summary, products, auth, notifications, activity

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(system.router, prefix="/system", tags=["System"])
api_router.include_router(videos.router, prefix="/videos", tags=["Videos"])
api_router.include_router(summary.router, prefix="/videos", tags=["AI Video Summary"])
api_router.include_router(analysis.router, prefix="/videos", tags=["Analysis"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(mlops.router, prefix="/mlops", tags=["MLOps"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI Chat"])
api_router.include_router(products.router, prefix="/products", tags=["Product Discovery & Delivery"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(activity.router, prefix="/activity", tags=["Activity Logs & Audit Trail"])

