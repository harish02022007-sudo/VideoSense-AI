import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy import or_, and_, desc, func
from sqlalchemy.orm import Session

import app.models.user
import app.models.otp
import app.models.embedding
import app.models.summary
from app.database.session import SessionLocal
from app.models.notification import Notification, NotificationPreference
from app.models.analysis import Video, Job, Frame, Object, OCRResult, Transcript
from app.core.logging import get_logger

logger = get_logger("app.services.notifications")


def format_relative_time(dt: Optional[datetime]) -> str:
    """Format datetime into human-friendly relative string."""
    if not dt:
        return "Just now"
    now = datetime.utcnow()
    diff = now - dt

    if diff.total_seconds() < 45:
        return "Just now"
    elif diff.total_seconds() < 3600:
        mins = max(1, int(diff.total_seconds() // 60))
        return f"{mins} min{'s' if mins != 1 else ''} ago"
    elif diff.total_seconds() < 86400:
        hours = max(1, int(diff.total_seconds() // 3600))
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif diff.total_seconds() < 172800:
        return "Yesterday"
    else:
        days = int(diff.total_seconds() // 86400)
        if days < 7:
            return f"{days} days ago"
        return dt.strftime("%b %d, %Y")


class NotificationService:
    """Centralized service for managing persistent, real-time application notifications."""

    @classmethod
    def create_notification(
        cls,
        event_id: str,
        event_type: str,
        title: str,
        message: str,
        category: str = "processing",
        severity: str = "info",
        status: str = "active",
        user_id: Optional[str] = None,
        resource_type: Optional[str] = "video",
        resource_id: Optional[str] = None,
        action_tab: Optional[str] = None,
        action_label: Optional[str] = None,
        model_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Creates a persistent notification with deduplication on event_id.
        If an event with event_id already exists, returns the existing record.
        """
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            # Check for existing notification with same event_id to prevent duplicates
            existing = db.query(Notification).filter(Notification.event_id == event_id).first()
            if existing:
                return cls._serialize_notification(existing, db)

            metadata_str = json.dumps(metadata) if metadata is not None else None

            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=user_id,
                event_id=event_id,
                event_type=event_type,
                category=category,
                title=title,
                message=message,
                severity=severity,
                status=status,
                is_read=False,
                resource_type=resource_type,
                resource_id=resource_id,
                action_tab=action_tab,
                action_label=action_label,
                model_name=model_name,
                metadata_json=metadata_str,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            db.add(notif)
            db.commit()
            db.refresh(notif)

            logger.info(
                f"Dispatched notification [{category.upper()}][{severity.upper()}]: {title} (event: {event_id})"
            )
            return cls._serialize_notification(notif, db)

        except Exception as e:
            if db:
                db.rollback()
            logger.error(f"Failed to create notification for event {event_id}: {e}", exc_info=True)
            return {}
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def get_notifications(
        cls,
        user_id: Optional[str] = None,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        db: Optional[Session] = None
    ) -> List[Dict[str, Any]]:
        """Query persistent notifications with filtering and search."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            # If notifications table is completely empty, optionally backfill genuine history
            count = db.query(func.count(Notification.id)).scalar()
            if count == 0:
                cls._backfill_genuine_history(db, user_id=user_id)

            query = db.query(Notification)

            if user_id:
                query = query.filter(Notification.user_id == user_id)
            else:
                query = query.filter(Notification.user_id.is_(None))

            if category and category.lower() != "all":
                query = query.filter(Notification.category == category.lower().strip())

            if severity and severity.lower() != "all":
                query = query.filter(Notification.severity == severity.lower().strip())

            if status:
                s = status.lower().strip()
                if s == "unread":
                    query = query.filter(Notification.is_read.is_(False))
                elif s == "read":
                    query = query.filter(Notification.is_read.is_(True))
                elif s in ["active", "resolved"]:
                    query = query.filter(Notification.status == s)

            if search and search.strip():
                term = f"%{search.strip().lower()}%"
                query = query.filter(
                    or_(
                        func.lower(Notification.title).like(term),
                        func.lower(Notification.message).like(term),
                        func.lower(Notification.model_name).like(term),
                        func.lower(Notification.category).like(term),
                        func.lower(Notification.metadata_json).like(term),
                    )
                )

            records = (
                query.order_by(desc(Notification.created_at))
                .offset(offset)
                .limit(limit)
                .all()
            )

            # Pre-fetch videos to populate videoTitle without N+1 query
            video_ids = [r.resource_id for r in records if r.resource_id]
            video_title_map = {}
            if video_ids:
                vids = db.query(Video.id, Video.filename).filter(Video.id.in_(video_ids)).all()
                video_title_map = {v.id: v.filename for v in vids}

            return [cls._serialize_notification(r, db, video_title_map) for r in records]

        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def get_stats(
        cls,
        user_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Calculates dynamic real-time counts across notifications."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            # Check if backfill needed on empty table
            count = db.query(func.count(Notification.id)).scalar()
            if count == 0:
                cls._backfill_genuine_history(db)

            query = db.query(Notification)
            if user_id:
                query = query.filter(Notification.user_id == user_id)
            else:
                query = query.filter(Notification.user_id.is_(None))

            total = query.count()
            unread = query.filter(Notification.is_read.is_(False)).count()
            critical = query.filter(Notification.severity == "critical").count()
            warning = query.filter(Notification.severity == "warning").count()
            success = query.filter(Notification.severity == "success").count()
            info = query.filter(Notification.severity == "info").count()
            resolved = query.filter(Notification.status == "resolved").count()

            # By category
            cat_query = db.query(Notification.category, func.count(Notification.id))
            if user_id:
                cat_query = cat_query.filter(Notification.user_id == user_id)
            else:
                cat_query = cat_query.filter(Notification.user_id.is_(None))
            cat_rows = cat_query.group_by(Notification.category).all()
            by_category = {cat: c for cat, c in cat_rows}

            return {
                "total": total,
                "unread": unread,
                "critical": critical,
                "warning": warning,
                "success": success,
                "info": info,
                "resolved": resolved,
                "by_category": by_category
            }

        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def mark_as_read(cls, notification_id: str, db: Optional[Session] = None) -> bool:
        """Mark single notification as read."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            notif = db.query(Notification).filter(Notification.id == notification_id).first()
            if not notif:
                return False
            notif.is_read = True
            notif.read_at = datetime.utcnow()
            db.commit()
            return True
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def mark_as_unread(cls, notification_id: str, db: Optional[Session] = None) -> bool:
        """Mark single notification as unread."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            notif = db.query(Notification).filter(Notification.id == notification_id).first()
            if not notif:
                return False
            notif.is_read = False
            notif.read_at = None
            db.commit()
            return True
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def mark_all_read(cls, user_id: Optional[str] = None, db: Optional[Session] = None) -> int:
        """Marks all unread notifications as read."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            query = db.query(Notification).filter(Notification.is_read.is_(False))
            if user_id:
                query = query.filter(Notification.user_id == user_id)
            else:
                query = query.filter(Notification.user_id.is_(None))

            count = query.update(
                {"is_read": True, "read_at": datetime.utcnow()},
                synchronize_session=False
            )
            db.commit()
            return count
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def resolve_notification(cls, notification_id: str, db: Optional[Session] = None) -> bool:
        """Mark notification status as resolved."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            notif = db.query(Notification).filter(Notification.id == notification_id).first()
            if not notif:
                return False
            notif.status = "resolved"
            notif.resolved_at = datetime.utcnow()
            db.commit()
            return True
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def delete_notification(cls, notification_id: str, db: Optional[Session] = None) -> bool:
        """Delete notification by ID."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            notif = db.query(Notification).filter(Notification.id == notification_id).first()
            if not notif:
                return False
            db.delete(notif)
            db.commit()
            return True
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def clear_read_notifications(cls, user_id: Optional[str] = None, db: Optional[Session] = None) -> int:
        """Delete all read notifications."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            query = db.query(Notification).filter(Notification.is_read.is_(True))
            if user_id:
                query = query.filter(Notification.user_id == user_id)
            else:
                query = query.filter(Notification.user_id.is_(None))
            deleted = query.delete(synchronize_session=False)
            db.commit()
            return deleted
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def get_preferences(cls, user_id: Optional[str] = None, db: Optional[Session] = None) -> Dict[str, Any]:
        """Fetch user preferences or defaults."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        default_prefs = {
            "soundEnabled": True,
            "browserPushEnabled": False,
            "categories": {
                "security": True,
                "processing": True,
                "delivery": True,
                "system": True,
                "reports": True
            },
            "minSeverity": "all",
            "autoArchiveDays": 7
        }

        try:
            if not user_id:
                return default_prefs

            pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
            if not pref:
                return default_prefs

            cat_dict = {}
            if pref.categories_json:
                try:
                    cat_dict = json.loads(pref.categories_json)
                except Exception:
                    pass

            return {
                "soundEnabled": pref.sound_enabled,
                "browserPushEnabled": pref.browser_push_enabled,
                "categories": cat_dict or default_prefs["categories"],
                "minSeverity": pref.min_severity,
                "autoArchiveDays": 7
            }
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def update_preferences(
        cls,
        user_id: str,
        sound_enabled: Optional[bool] = None,
        browser_push_enabled: Optional[bool] = None,
        categories: Optional[Dict[str, bool]] = None,
        min_severity: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Update or create user preferences."""
        owns_db = False
        if db is None:
            db = SessionLocal()
            owns_db = True

        try:
            pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
            if not pref:
                pref = NotificationPreference(user_id=user_id)
                db.add(pref)

            if sound_enabled is not None:
                pref.sound_enabled = sound_enabled
            if browser_push_enabled is not None:
                pref.browser_push_enabled = browser_push_enabled
            if categories is not None:
                pref.categories_json = json.dumps(categories)
            if min_severity is not None:
                pref.min_severity = min_severity

            pref.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(pref)

            return cls.get_preferences(user_id, db)
        finally:
            if owns_db and db:
                db.close()

    @classmethod
    def _serialize_notification(
        cls,
        notif: Notification,
        db: Session,
        video_title_cache: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Serializes notification entity into UI-compatible dictionary format."""
        meta_dict = {}
        if notif.metadata_json:
            try:
                meta_dict = json.loads(notif.metadata_json)
            except Exception:
                meta_dict = {}

        # Resolve video title if referencing video resource
        video_title = None
        video_id = notif.resource_id if notif.resource_type == "video" else None
        if video_id:
            if video_title_cache and video_id in video_title_cache:
                video_title = video_title_cache[video_id]
            else:
                v = db.query(Video.filename).filter(Video.id == video_id).first()
                if v:
                    video_title = v[0]

        return {
            "id": notif.id,
            "type": notif.category,       # Supported for legacy frontend UI
            "category": notif.category,
            "eventType": notif.event_type,
            "title": notif.title,
            "desc": notif.message,        # Supported for legacy frontend UI
            "message": notif.message,
            "time": format_relative_time(notif.created_at),
            "timestamp": notif.created_at.isoformat() if notif.created_at else datetime.utcnow().isoformat(),
            "severity": notif.severity,
            "read": notif.is_read,        # Supported for legacy frontend UI
            "isRead": notif.is_read,
            "status": notif.status,
            "resourceType": notif.resource_type,
            "videoId": video_id,
            "videoTitle": video_title,
            "model": notif.model_name,
            "actionLabel": notif.action_label,
            "actionTab": notif.action_tab,
            "metadata": meta_dict
        }

    @classmethod
    def _backfill_genuine_history(cls, db: Session, user_id: Optional[str] = None, limit: int = 15) -> None:
        """
        Backfills honest, genuine notifications from existing completed videos/jobs in the database for the given user.
        Never fabricates alerts. All counts and metadata are read directly from actual DB rows.
        """
        try:
            if not user_id:
                return

            # Query recent videos that have completed analysis jobs for this specific user
            recent_jobs = (
                db.query(Job)
                .join(Video, Video.id == Job.video_id)
                .filter(Video.user_id == user_id)
                .filter(Job.status.in_(["completed", "embedding_pending"]))
                .order_by(desc(Job.created_at))
                .limit(limit)
                .all()
            )

            for job in recent_jobs:
                video = db.query(Video).filter(Video.id == job.video_id).first()
                if not video:
                    continue

                # Query actual frame count and detected objects
                frame_count = db.query(func.count(Frame.id)).filter(Frame.video_id == video.id).scalar() or 0
                obj_count = db.query(func.count(Object.id)).filter(Object.video_id == video.id).scalar() or 0
                ocr_count = db.query(func.count(OCRResult.id)).filter(OCRResult.video_id == video.id).scalar() or 0
                transcript_count = db.query(func.count(Transcript.id)).filter(Transcript.video_id == video.id).scalar() or 0

                # 1. Video Upload Event
                upload_event_id = f"video_{video.id}_uploaded"
                if not db.query(Notification).filter(Notification.event_id == upload_event_id).first():
                    size_mb = round((video.size_bytes or 0) / (1024 * 1024), 2)
                    cls.create_notification(
                        event_id=upload_event_id,
                        event_type="video_uploaded",
                        category="processing",
                        title="Video Uploaded Successfully",
                        message=f'Video "{video.filename}" was successfully uploaded and registered ({size_mb} MB).',
                        severity="info",
                        resource_type="video",
                        resource_id=video.id,
                        user_id=video.user_id,
                        action_tab="player",
                        action_label="Open Video",
                        metadata={
                            "filename": video.filename,
                            "sizeMB": size_mb,
                            "durationSec": round(video.duration or 0.0, 1),
                            "fps": video.fps
                        },
                        db=db
                    )

                # 2. Object Detection & Pipeline Completion Event
                complete_event_id = f"job_{job.id}_completed"
                if not db.query(Notification).filter(Notification.event_id == complete_event_id).first():
                    # Check top class labels
                    top_classes = (
                        db.query(Object.class_label, func.count(Object.id))
                        .filter(Object.video_id == video.id)
                        .group_by(Object.class_label)
                        .order_by(desc(func.count(Object.id)))
                        .limit(3)
                        .all()
                    )
                    class_summary = ", ".join([f"{count} {label}" for label, count in top_classes]) if top_classes else "0 object detections"

                    cls.create_notification(
                        event_id=complete_event_id,
                        event_type="pipeline_completed",
                        category="processing",
                        title="Video Analysis Completed",
                        message=f'Multimodal analysis concluded for "{video.filename}". Extracted {frame_count} keyframes with {obj_count} detections ({class_summary}).',
                        severity="success",
                        resource_type="video",
                        resource_id=video.id,
                        user_id=video.user_id,
                        action_tab="summary",
                        action_label="View Summary",
                        model_name="YOLOv11 + Whisper",
                        metadata={
                            "framesExtracted": frame_count,
                            "totalDetections": obj_count,
                            "ocrRegions": ocr_count,
                            "transcripts": transcript_count,
                            "jobId": job.id
                        },
                        db=db
                    )

            logger.info("Honest notification backfill from existing database records complete.")
        except Exception as e:
            logger.warning(f"Notification backfill encountered non-critical error: {e}")
