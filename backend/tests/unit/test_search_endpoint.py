import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_search_endpoint_routing_and_validation():
    """Verify search endpoint POST parameters, validation logic, and envelope structure."""
    with TestClient(app) as client:
        # 1. Verify missing query input validation error (422 Unprocessable Entity)
        bad_response = client.post("/api/v1/search", json={})
        assert bad_response.status_code == 422
        
        # 2. Verify wrong top_k validation parameter check (422)
        bad_topk_response = client.post("/api/v1/search", json={"query": "test query", "top_k": 0})
        assert bad_topk_response.status_code == 422

        # 3. Verify successful API search execution
        payload = {
            "query": "cooking in the kitchen",
            "video_id": "some_dummy_id_123",
            "modality": "FRAME",
            "top_k": 5
        }
        response = client.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        
        json_data = response.json()
        assert json_data["success"] is True
        assert "Search completed successfully." in json_data["message"]
        assert isinstance(json_data["data"], list)
        assert "request_id" in json_data
