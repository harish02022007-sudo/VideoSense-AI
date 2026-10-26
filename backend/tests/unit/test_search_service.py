import pytest
import os
import uuid
import numpy as np
from app.core.container import Container
from app.db.unit_of_work import UnitOfWork
from app.models.analysis import Video
from app.models.embedding import VideoEmbedding

def test_search_similarity_ranking():
    """Verify that search rankings, cosine calculations, filters, and timestamp mapping work cleanly."""
    video_id = f"test_search_video_{uuid.uuid4().hex[:8]}"
    
    # 1. Create a test video in database
    with UnitOfWork() as uow:
        v = uow.videos.get(video_id)
        if not v:
            v = Video(
                id=video_id,
                filename="search_test.mp4",
                filepath="fake_path",
                mime_type="video/mp4",
                size_bytes=1024,
                sha256_hash="fake_hash"
            )
            uow.videos.add(v)
            uow.commit()

    storage = Container.get_vector_storage()
    embedding_service = Container.get_embedding_service()
    
    # Make sure models are active
    embedding_service.load_models()

    # 2. Seed mock vectors on disk
    query_text = "find a person walking"
    
    # TEXT vector
    text_vector = np.array(embedding_service.generate_text_embedding(query_text), dtype=np.float32)
    storage.save_vector(video_id, "text", text_vector)
    
    # FRAME vectors (512d)
    clip_query_vector = np.array(embedding_service.generate_query_embedding(query_text, "FRAME"), dtype=np.float32)
    storage.save_vector(
        video_id, 
        "frame", 
        np.array([clip_query_vector, -clip_query_vector], dtype=np.float32), 
        metadata=[
            {"frame_index": 0, "timestamp": 1.5, "path": "frames/frame_0.jpg"},
            {"frame_index": 1, "timestamp": 4.2, "path": "frames/frame_1.jpg"}
        ]
    )

    # 3. Add database embedding indices
    with UnitOfWork() as uow:
        # Clean any old references
        old_embs = uow.video_embeddings.get_by_video_id(video_id)
        for o in old_embs:
            uow.session.delete(o)
        uow.commit()

    with UnitOfWork() as uow:
        emb_text = VideoEmbedding(
            id="emb_text_test",
            video_id=video_id,
            embedding_type="TEXT",
            vector_reference=f"storage/embeddings/{video_id}/text.npy",
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            dimension=384,
            embedding_model_version="1.0"
        )
        uow.video_embeddings.add(emb_text)

        emb_frame = VideoEmbedding(
            id="emb_frame_test",
            video_id=video_id,
            embedding_type="FRAME",
            vector_reference=f"storage/embeddings/{video_id}/frame.npy",
            model_name="openai/clip-vit-base-patch32",
            dimension=512,
            embedding_model_version="1.0"
        )
        uow.video_embeddings.add(emb_frame)
        uow.commit()

    try:
        # 4. Trigger SearchService
        search_service = Container.get_search_service()
        
        # Test TEXT modality search
        text_results = search_service.search(query=query_text, video_id=video_id, modality="TEXT")
        assert len(text_results) == 1
        assert text_results[0]["video_id"] == video_id
        assert text_results[0]["modality"] == "TEXT"
        assert text_results[0]["similarity_score"] > 0.95

        # Test FRAME modality search (asserting correct timestamp resolution)
        frame_results = search_service.search(query=query_text, video_id=video_id, modality="FRAME")
        assert len(frame_results) == 1
        assert frame_results[0]["video_id"] == video_id
        assert frame_results[0]["modality"] == "FRAME"
        assert frame_results[0]["timestamp"] == 1.5  # Matches the positive vector at 1.5s
        assert frame_results[0]["similarity_score"] > 0.95

    finally:
        # 5. Clean up vectors and DB state
        storage.delete_vector(video_id, "text")
        storage.delete_vector(video_id, "frame")
        with UnitOfWork() as uow:
            v_rec = uow.videos.get(video_id)
            if v_rec:
                uow.session.delete(v_rec)
            uow.commit()
