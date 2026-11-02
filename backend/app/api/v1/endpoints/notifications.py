import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, Request, Response
from pydantic import BaseModel

from app.schemas.common import ResponseEnvelope
from app.services.notification_service import NotificationService
from app.core.dependencies import get_optional_current_user
from app.models.user import User
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("app.api.notifications")


class NotificationPreferencesUpdateDTO(BaseModel):
    soundEnabled: Optional[bool] = None
    browserPushEnabled: Optional[bool] = None
    categories: Optional[Dict[str, bool]] = None
    minSeverity: Optional[str] = None


@router.get("", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def list_notifications(
    request: Request,
    category: Optional[str] = Query(None, description="Category filter (processing, security, delivery, system, reports)"),
    severity: Optional[str] = Query(None, description="Severity filter (info, success, warning, critical)"),
    status: Optional[str] = Query(None, description="Status filter (all, unread, read, active, resolved)"),
    search: Optional[str] = Query(None, description="Text search term"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """List persistent notifications with filtering, pagination, and text search."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    user_id = current_user.id if current_user else None

    notifications = NotificationService.get_notifications(
        user_id=user_id,
        category=category,
        severity=severity,
        status=status,
        search=search,
        limit=limit,
        offset=offset
    )

    return ResponseEnvelope(
        success=True,
        message=f"Retrieved {len(notifications)} notifications.",
        data=notifications,
        request_id=req_id
    )


@router.get("/stats", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_notification_stats(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve dynamic aggregated notification statistics."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    user_id = current_user.id if current_user else None

    stats = NotificationService.get_stats(user_id=user_id)

    return ResponseEnvelope(
        success=True,
        message="Notification statistics retrieved successfully.",
        data=stats,
        request_id=req_id
    )


@router.get("/export")
async def export_notifications(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Export the entire notification history as JSON for compliance audit trails."""
    user_id = current_user.id if current_user else None
    notifications = NotificationService.get_notifications(
        user_id=user_id,
        limit=500
    )
    import json
    content = json.dumps(notifications, indent=2)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=videosense_notifications.json"}
    )


@router.patch("/read-all", response_model=ResponseEnvelope[Dict[str, int]])
async def mark_all_notifications_read(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Marks all unread notifications as read."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    user_id = current_user.id if current_user else None

    updated_count = NotificationService.mark_all_read(user_id=user_id)

    return ResponseEnvelope(
        success=True,
        message=f"Marked {updated_count} notifications as read.",
        data={"updatedCount": updated_count},
        request_id=req_id
    )


@router.delete("/clear-read", response_model=ResponseEnvelope[Dict[str, int]])
async def clear_read_notifications(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Purges all read notifications."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    user_id = current_user.id if current_user else None

    cleared = NotificationService.clear_read_notifications(user_id=user_id)

    return ResponseEnvelope(
        success=True,
        message=f"Cleared {cleared} read notifications.",
        data={"clearedCount": cleared},
        request_id=req_id
    )


@router.get("/preferences", response_model=ResponseEnvelope[Dict[str, Any]])
async def get_preferences(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve notification preferences."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    user_id = current_user.id if current_user else None
    prefs = NotificationService.get_preferences(user_id=user_id)

    return ResponseEnvelope(
        success=True,
        message="Preferences retrieved successfully.",
        data=prefs,
        request_id=req_id
    )


@router.put("/preferences", response_model=ResponseEnvelope[Dict[str, Any]])
async def update_preferences(
    payload: NotificationPreferencesUpdateDTO,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Update notification preferences."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    user_id = current_user.id if current_user else "guest"

    prefs = NotificationService.update_preferences(
        user_id=user_id,
        sound_enabled=payload.soundEnabled,
        browser_push_enabled=payload.browserPushEnabled,
        categories=payload.categories,
        min_severity=payload.minSeverity
    )

    return ResponseEnvelope(
        success=True,
        message="Notification preferences updated successfully.",
        data=prefs,
        request_id=req_id
    )


@router.patch("/{notification_id}/read", response_model=ResponseEnvelope[Dict[str, bool]])
async def mark_single_read(notification_id: str, request: Request):
    """Mark a notification as read."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    success = NotificationService.mark_as_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")

    return ResponseEnvelope(
        success=True,
        message="Notification marked as read.",
        data={"read": True},
        request_id=req_id
    )


@router.patch("/{notification_id}/unread", response_model=ResponseEnvelope[Dict[str, bool]])
async def mark_single_unread(notification_id: str, request: Request):
    """Mark a notification as unread."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    success = NotificationService.mark_as_unread(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")

    return ResponseEnvelope(
        success=True,
        message="Notification marked as unread.",
        data={"read": False},
        request_id=req_id
    )


@router.patch("/{notification_id}/resolve", response_model=ResponseEnvelope[Dict[str, bool]])
async def resolve_notification_endpoint(notification_id: str, request: Request):
    """Mark a notification as resolved."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    success = NotificationService.resolve_notification(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")

    return ResponseEnvelope(
        success=True,
        message="Notification resolved successfully.",
        data={"resolved": True},
        request_id=req_id
    )


@router.delete("/{notification_id}", response_model=ResponseEnvelope[Dict[str, bool]])
async def delete_notification_endpoint(notification_id: str, request: Request):
    """Delete a notification."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    success = NotificationService.delete_notification(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")

    return ResponseEnvelope(
        success=True,
        message="Notification dismissed successfully.",
        data={"deleted": True},
        request_id=req_id
    )

