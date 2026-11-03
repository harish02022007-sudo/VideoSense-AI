import os
import mimetypes
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings
from app.core.logging import get_logger
from app.types.results import Result

logger = get_logger("app.infrastructure.storage.supabase")

class SupabaseStorageClient:
    """
    High-performance client for Supabase Object Storage.
    Enables permanent cloud storage for uploaded videos, extracted frames,
    and thumbnails with high-speed CDN delivery and HTTP byte-range streaming.
    """

    def __init__(
        self,
        url: Optional[str] = None,
        key: Optional[str] = None,
        bucket: Optional[str] = None
    ):
        self.url = (url or settings.supabase.url or "").rstrip("/")
        self.key = key or settings.supabase.key or ""
        self.bucket = bucket or settings.supabase.bucket or "videosense"
        self._enabled = bool(self.url and self.key)

    @property
    def is_enabled(self) -> bool:
        return self._enabled

    def _get_headers(self, content_type: str = "application/octet-stream") -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
            "Content-Type": content_type,
            "x-upsert": "true",
        }

    def get_public_url(self, remote_path: str) -> str:
        """Constructs the permanent public CDN URL for an object in the bucket."""
        clean_path = remote_path.lstrip("/")
        return f"{self.url}/storage/v1/object/public/{self.bucket}/{clean_path}"

    def upload_file(
        self,
        remote_path: str,
        content: bytes,
        content_type: Optional[str] = None
    ) -> Result[str]:
        """
        Uploads in-memory binary data to Supabase Storage.
        Returns the permanent public CDN URL on success.
        """
        if not self.is_enabled:
            return Result.Failure("Supabase storage is disabled or credentials missing.")

        clean_path = remote_path.lstrip("/")
        if not content_type:
            content_type, _ = mimetypes.guess_type(clean_path)
            content_type = content_type or "application/octet-stream"

        upload_url = f"{self.url}/storage/v1/object/{self.bucket}/{clean_path}"
        headers = self._get_headers(content_type)

        try:
            with httpx.Client(timeout=120.0) as client:
                resp = client.post(upload_url, content=content, headers=headers)
                if resp.status_code in (200, 201):
                    cdn_url = self.get_public_url(clean_path)
                    logger.info(f"Uploaded to Supabase: {clean_path} -> {cdn_url}")
                    return Result.Success(cdn_url)
                else:
                    err_msg = f"Supabase upload failed ({resp.status_code}): {resp.text}"
                    logger.warning(err_msg)
                    return Result.Failure(err_msg)
        except Exception as e:
            err_msg = f"Supabase upload exception for '{clean_path}': {str(e)}"
            logger.error(err_msg)
            return Result.Failure(err_msg)

    def upload_from_disk(
        self,
        local_path: str,
        remote_path: str,
        content_type: Optional[str] = None
    ) -> Result[str]:
        """Uploads a local file from disk directly to Supabase Storage."""
        if not os.path.isfile(local_path):
            return Result.Failure(f"Local file not found: {local_path}")

        try:
            with open(local_path, "rb") as f:
                content = f.read()
            return self.upload_file(remote_path, content, content_type)
        except Exception as e:
            return Result.Failure(f"Failed to read local file for Supabase upload: {str(e)}")

    def download_to_disk(
        self,
        remote_path: str,
        local_target_path: str
    ) -> Result[str]:
        """Downloads a file from Supabase Storage and saves it to a local disk path."""
        if not self.is_enabled:
            return Result.Failure("Supabase storage is disabled or credentials missing.")

        clean_path = remote_path.lstrip("/")
        download_url = f"{self.url}/storage/v1/object/{self.bucket}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
        }

        try:
            os.makedirs(os.path.dirname(os.path.abspath(local_target_path)), exist_ok=True)
            with httpx.Client(timeout=180.0) as client:
                resp = client.get(download_url, headers=headers)
                if resp.status_code == 200:
                    with open(local_target_path, "wb") as f:
                        f.write(resp.content)
                    return Result.Success(local_target_path)
                else:
                    return Result.Failure(f"Supabase download failed ({resp.status_code}): {resp.text}")
        except Exception as e:
            return Result.Failure(f"Failed to download from Supabase: {str(e)}")

    def delete_file(self, remote_path: str) -> Result[bool]:
        """Deletes a file from Supabase Storage."""
        if not self.is_enabled:
            return Result.Failure("Supabase storage is disabled.")

        clean_path = remote_path.lstrip("/")
        delete_url = f"{self.url}/storage/v1/object/{self.bucket}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.delete(delete_url, headers=headers)
                return Result.Success(resp.status_code in (200, 204))
        except Exception as e:
            return Result.Failure(f"Failed to delete file from Supabase: {str(e)}")

    def ensure_bucket_exists(self) -> Result[bool]:
        """Ensures the storage bucket exists on Supabase; creates it if absent."""
        if not self.is_enabled:
            return Result.Failure("Supabase credentials not configured.")

        bucket_url = f"{self.url}/storage/v1/bucket"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=20.0) as client:
                # Check if bucket already exists
                check = client.get(f"{bucket_url}/{self.bucket}", headers=headers)
                if check.status_code == 200:
                    return Result.Success(True)

                # Attempt creation as public bucket
                payload = {
                    "id": self.bucket,
                    "name": self.bucket,
                    "public": True,
                    "file_size_limit": 52428800  # 50MB
                }
                create_resp = client.post(bucket_url, json=payload, headers=headers)
                if create_resp.status_code in (200, 201):
                    logger.info(f"Created public Supabase storage bucket: '{self.bucket}'")
                    return Result.Success(True)
                else:
                    logger.warning(f"Bucket check/create response ({create_resp.status_code}): {create_resp.text}")
                    return Result.Success(False)
        except Exception as e:
            logger.warning(f"Could not check/create Supabase bucket: {e}")
            return Result.Failure(str(e))


# Global singleton instance
supabase_storage = SupabaseStorageClient()

