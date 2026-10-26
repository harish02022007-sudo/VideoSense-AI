import pytest
import os
import uuid
import numpy as np
from app.core.container import Container

def test_vector_storage_lifecycle():
    """Verify saving, loading, verifying existence, and deleting vector arrays and frame metadata maps."""
    storage = Container.get_vector_storage()
    video_id = f"test_lifecycle_video_{uuid.uuid4().hex[:8]}"
    
    try:
        # 1. Save and assert text vector
        vector_data = np.random.rand(384).astype(np.float32)
        ref_path = storage.save_vector(video_id, "text", vector_data)
        assert "text.npy" in ref_path
        
        # Verify exists
        assert storage.vector_exists(video_id, "text") is True
        
        # Load and verify equality
        loaded = storage.load_vector(video_id, "text")
        assert loaded.shape == (384,)
        assert np.allclose(loaded, vector_data)

        # 2. Save frame vector with metadata
        frame_data = np.random.rand(3, 512).astype(np.float32)
        metadata = [
            {"frame_index": 0, "timestamp": 0.0, "path": "frames/frame_0.jpg"},
            {"frame_index": 1, "timestamp": 1.5, "path": "frames/frame_1.jpg"},
            {"frame_index": 2, "timestamp": 3.0, "path": "frames/frame_2.jpg"}
        ]
        frame_ref = storage.save_vector(video_id, "frame", frame_data, metadata=metadata)
        assert "frame.npy" in frame_ref
        assert storage.vector_exists(video_id, "frame") is True

        # Load frame metadata
        loaded_meta = storage.load_frame_metadata(video_id)
        assert len(loaded_meta) == 3
        assert loaded_meta[1]["timestamp"] == 1.5
        assert loaded_meta[2]["path"] == "frames/frame_2.jpg"

        # Load frame vectors
        loaded_frames = storage.load_vector(video_id, "frame")
        assert loaded_frames.shape == (3, 512)
        assert np.allclose(loaded_frames, frame_data)

    finally:
        # Release local references and trigger garbage collection to unlock files on Windows
        if 'loaded' in locals():
            del loaded
        if 'loaded_frames' in locals():
            del loaded_frames
        import gc
        gc.collect()

        # 3. Clean up vectors
        storage.delete_vector(video_id, "text")
        assert storage.vector_exists(video_id, "text") is False
        
        storage.delete_vector(video_id, "frame")
        assert storage.vector_exists(video_id, "frame") is False
