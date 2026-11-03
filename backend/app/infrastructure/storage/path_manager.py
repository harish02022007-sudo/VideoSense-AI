import os
import glob
import shutil
from typing import Optional
from app.core.config import settings

class PathManager:
    """Manages secure and isolated sub-folders configurations for each uploaded video UUID."""
    @staticmethod
    def get_video_dir(video_id: str) -> str:
        return os.path.abspath(os.path.join(settings.storage.upload_dir, video_id))

    @staticmethod
    def get_stage_dir(video_id: str, stage_name: str) -> str:
        video_dir = PathManager.get_video_dir(video_id)
        # Ensure stage name is sanitized against path traversal injection
        sanitized_stage = os.path.basename(stage_name)
        return os.path.join(video_dir, sanitized_stage)

    @staticmethod
    def get_original_path(video_id: str, filename: str) -> str:
        stage_dir = PathManager.get_stage_dir(video_id, "original")
        sanitized_filename = os.path.basename(filename)
        return os.path.join(stage_dir, sanitized_filename)

    @staticmethod
    def get_manifest_path(video_id: str) -> str:
        return os.path.join(PathManager.get_video_dir(video_id), "manifest.json")

    @staticmethod
    def get_metrics_path(video_id: str) -> str:
        return os.path.join(PathManager.get_video_dir(video_id), "processing_metrics.json")

    @staticmethod
    def resolve_video_file(video_id: str, filename: Optional[str] = None, filepath: Optional[str] = None) -> Optional[str]:
        """
        Robustly resolves video files on disk. If the ephemeral storage on cloud hosts
        (such as Render) has recycled, it automatically searches and restores original files
        from Sample_Videos or other backup sources.
        """
        # 1. Direct explicit filepath check
        if filepath and os.path.isfile(filepath):
            return os.path.abspath(filepath)

        base_dir = os.path.abspath(settings.storage.upload_dir)

        # 2. Check uploads/{video_id}/original/*.*
        orig_dir = os.path.join(base_dir, video_id, "original")
        if os.path.isdir(orig_dir):
            if filename:
                exact_file = os.path.join(orig_dir, os.path.basename(filename))
                if os.path.isfile(exact_file):
                    return os.path.abspath(exact_file)
            else:
                matches = glob.glob(os.path.join(orig_dir, "*.*"))
                if matches and os.path.isfile(matches[0]):
                    return os.path.abspath(matches[0])

        # 3. Check uploads/{video_id}/analysis/preview.mp4
        preview_file = os.path.join(base_dir, video_id, "analysis", "preview.mp4")
        if os.path.isfile(preview_file):
            return os.path.abspath(preview_file)

        # 3.5 Check and restore from Supabase cloud storage if enabled
        try:
            from app.infrastructure.storage.supabase_storage import supabase_storage
            if supabase_storage.is_enabled and filename:
                dest = os.path.join(orig_dir, os.path.basename(filename))
                if os.path.isfile(dest):
                    return os.path.abspath(dest)
                remote_path = f"{video_id}/original/{os.path.basename(filename)}"
                dl_res = supabase_storage.download_to_disk(remote_path, dest)
                if dl_res.success:
                    return os.path.abspath(dest)
        except Exception:
            pass

        # 4. Search in Sample_Videos repositories
        candidate_dirs = [
            os.path.abspath("Sample_Videos"),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "Sample_Videos")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Sample_Videos")),
            "/app/Sample_Videos",
            os.path.abspath(os.path.join(base_dir, "..", "Sample_Videos")),
        ]

        if filename:
            clean_name = os.path.basename(filename)
            for sdir in candidate_dirs:
                candidate = os.path.join(sdir, clean_name)
                if os.path.isfile(candidate):
                    # Auto-restore into uploads original directory
                    try:
                        os.makedirs(orig_dir, exist_ok=True)
                        dest = os.path.join(orig_dir, clean_name)
                        if not os.path.exists(dest):
                            shutil.copy2(candidate, dest)
                        return os.path.abspath(dest)
                    except Exception:
                        return os.path.abspath(candidate)

        # 5. Fallback: Check if ANY file in Sample_Videos matches the filename case-insensitively
        if filename:
            target_lower = os.path.basename(filename).lower()
            for sdir in candidate_dirs:
                if os.path.isdir(sdir):
                    try:
                        for f in os.listdir(sdir):
                            if f.lower() == target_lower:
                                candidate = os.path.join(sdir, f)
                                if os.path.isfile(candidate):
                                    try:
                                        os.makedirs(orig_dir, exist_ok=True)
                                        dest = os.path.join(orig_dir, f)
                                        if not os.path.exists(dest):
                                            shutil.copy2(candidate, dest)
                                        return os.path.abspath(dest)
                                    except Exception:
                                        return os.path.abspath(candidate)
                    except Exception:
                        pass

        # 6. Fallback: Return any available sample video if in demo mode
        for sdir in candidate_dirs:
            if os.path.isdir(sdir):
                try:
                    for f in os.listdir(sdir):
                        if f.lower().endswith(".mp4"):
                            candidate = os.path.join(sdir, f)
                            if os.path.isfile(candidate):
                                return os.path.abspath(candidate)
                except Exception:
                    pass

        return None

