from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class VideoEmbedding(Base):
    __tablename__ = "video_embeddings"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    embedding_type = Column(String, nullable=False)  # VIDEO, FRAME, TEXT, AUDIO
    vector_reference = Column(String, nullable=False)  # Path or pointer to binary vector storage
    model_name = Column(String, nullable=False)
    dimension = Column(Integer, nullable=False)
    embedding_model_version = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="embeddings")
