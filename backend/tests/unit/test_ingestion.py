import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app, raise_server_exceptions=False)

def test_upload_invalid_mime_type():
    """Verify that uploading a text file results in a validation error response."""
    file_content = b"fake video content"
    files = {"file": ("test.mp4", file_content, "text/plain")}
    response = client.post("/api/v1/videos/upload", files=files, data={"title": "Test Video"})
    
    assert response.status_code == 400
    json_data = response.json()
    assert json_data["error_code"] == "VALIDATION_ERROR"
    assert "Invalid file MIME type" in json_data["detail"]


def test_upload_invalid_extension():
    """Verify that uploading an unsupported video extension fails extension check."""
    file_content = b"fake video content"
    files = {"file": ("test.wmv", file_content, "video/mp4")}
    response = client.post("/api/v1/videos/upload", files=files, data={"title": "Test Video"})
    
    assert response.status_code == 400
    json_data = response.json()
    assert json_data["error_code"] == "VALIDATION_ERROR"
    assert "Unsupported file extension" in json_data["detail"]


def test_upload_valid_video():
    """Verify that uploading a valid mp4 media stream registers successfully."""
    file_content = b"fake video content"
    files = {"file": ("test.mp4", file_content, "video/mp4")}
    response = client.post("/api/v1/videos/upload", files=files, data={"title": "Test Video"})
    
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "data" in json_data
    assert "video_id" in json_data["data"]
    assert "job_id" in json_data["data"]
    assert json_data["data"]["status"] == "queued"
