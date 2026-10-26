import pytest
import os
import tempfile
from PIL import Image
from app.core.container import Container

def test_embedding_service_dimensions():
    """Verify that text and visual modalities yield the correct vector dimensions (384 for text, 512 for CLIP)."""
    service = Container.get_embedding_service()
    
    # Load models
    service.load_models()
    
    # 1. Text embedding
    text_vector = service.generate_text_embedding("A man is playing football")
    assert isinstance(text_vector, list)
    assert len(text_vector) == 384
    assert isinstance(text_vector[0], float)

    # 2. Frame embedding
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        frame_path = tmp.name
    try:
        img = Image.new("RGB", (224, 224), color="blue")
        img.save(frame_path)
        frame_vector = service.generate_frame_embedding(frame_path)
        assert isinstance(frame_vector, list)
        assert len(frame_vector) == 512
        assert isinstance(frame_vector[0], float)
    finally:
        if os.path.exists(frame_path):
            os.remove(frame_path)

    # 3. Audio embedding
    audio_vector = service.generate_audio_embedding("spoken transcript text segment")
    assert len(audio_vector) == 384

    # 4. Metadata embedding
    meta_vector = service.generate_metadata_embedding("Video details: Duration: 10.0, FPS: 30")
    assert len(meta_vector) == 384

    # 5. Modality dimensions getters
    assert service.get_dimension("TEXT") == 384
    assert service.get_dimension("FRAME") == 512
    assert service.get_dimension("AUDIO") == 384
    assert service.get_dimension("VIDEO_METADATA") == 384
