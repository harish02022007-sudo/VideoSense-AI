import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.unit_of_work import UnitOfWork


def test_summarization_status_endpoint_not_found():
    """Verify status endpoint returns not_found status for non-existent video."""
    with TestClient(app) as client:
        response = client.get("/api/v1/videos/dummy-video-id-99999/summary/status?mode=visual_only")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "not_found"
        assert data["data"]["is_completed"] is False


def test_summarization_get_summary_fallback_or_completed():
    """Verify get_video_summary returns either completed summary or graceful fallback envelope."""
    with TestClient(app) as client:
        # Check against existing video 3a7edc72-5aeb-4855-8394-45e85a77bc07
        response = client.get("/api/v1/videos/3a7edc72-5aeb-4855-8394-45e85a77bc07/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "short_summary" in data["data"]
        assert "aggregated_summary" in data["data"]


def test_summarization_post_trigger_and_caching():
    """Verify POST summarize endpoint handles mode selection and cached returns."""
    with TestClient(app) as client:
        # Trigger summarize with cache hit (force_regenerate=False)
        payload = {
            "mode": "visual_only",
            "force_regenerate": False
        }
        response = client.post("/api/v1/videos/3a7edc72-5aeb-4855-8394-45e85a77bc07/summarize?async_run=false", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["mode"] == "visual_only"
        assert len(data["data"]["key_events"]) > 0


def test_summarization_list_all_summaries():
    """Verify GET summaries lists all completed summaries for a video across modes."""
    with TestClient(app) as client:
        response = client.get("/api/v1/videos/3a7edc72-5aeb-4855-8394-45e85a77bc07/summaries")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert len(data["data"]) >= 1
