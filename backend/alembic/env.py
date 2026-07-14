import sys
import os
from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context

# Insert project directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.database.session import Base
# Import all database models here to register metadata with Base
from app.models.analysis import Video, Job, Frame, OCRResult, Transcript, Scene, Object, Audio, FaceDetection
from app.models.pipeline import PipelineExecution
from app.models.model_registry import ModelRegistry
from app.models.processing_log import ProcessingLog
from app.models.processing_config import VideoProcessingConfig
from app.models.embedding import VideoEmbedding
from app.models.worker import Worker

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = settings.database.url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    # Use settings database URL instead of alembic.ini hardcode option
    url = settings.database.url
    
    # Custom SQLite thread arguments
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        
    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
        connect_args=connect_args
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
