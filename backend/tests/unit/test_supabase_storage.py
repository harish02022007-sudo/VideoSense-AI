import pytest
from app.infrastructure.storage.supabase_storage import SupabaseStorageClient
from app.types.results import Result

def test_supabase_client_disabled_by_default_without_credentials():
    """Verify that client reports disabled and fails gracefully when credentials are not supplied."""
    client = SupabaseStorageClient(url=None, key=None, bucket="test-bucket")
    assert client.is_enabled is False

    # Operations fail gracefully with descriptive error
    res_upload = client.upload_file("test/file.mp4", b"dummy_bytes")
    assert res_upload.success is False
    assert "disabled" in res_upload.error.lower()

    res_disk = client.upload_from_disk("non_existent_file.mp4", "test/file.mp4")
    assert res_disk.success is False

    res_dl = client.download_to_disk("test/file.mp4", "local_target.mp4")
    assert res_dl.success is False

    res_del = client.delete_file("test/file.mp4")
    assert res_del.success is False


def test_supabase_client_url_construction():
    """Verify correct CDN public URL formatting."""
    client = SupabaseStorageClient(
        url="https://abcdefghijklmno.supabase.co",
        key="test-api-key",
        bucket="videosense"
    )
    assert client.is_enabled is True

    url = client.get_public_url("video-123/original/sample.mp4")
    expected = "https://abcdefghijklmno.supabase.co/storage/v1/object/public/videosense/video-123/original/sample.mp4"
    assert url == expected

    # Handles leading slashes cleanly
    url_leading = client.get_public_url("/video-456/frames/frame_00001.jpg")
    expected_leading = "https://abcdefghijklmno.supabase.co/storage/v1/object/public/videosense/video-456/frames/frame_00001.jpg"
    assert url_leading == expected_leading


def test_supabase_headers():
    """Verify authorization and upsert headers."""
    client = SupabaseStorageClient(
        url="https://xyz.supabase.co",
        key="my-secret-key",
        bucket="my-bucket"
    )
    headers = client._get_headers("video/mp4")
    assert headers["Authorization"] == "Bearer my-secret-key"
    assert headers["apikey"] == "my-secret-key"
    assert headers["Content-Type"] == "video/mp4"
    assert headers["x-upsert"] == "true"

