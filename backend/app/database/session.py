from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# SQLite-specific connection arguments
connect_args = {}
if settings.database.url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create SQLAlchemy engine
if settings.database.url.startswith("sqlite"):
    engine = create_engine(
        settings.database.url,
        connect_args=connect_args,
    )
else:
    engine = create_engine(
        settings.database.url,
        pool_size=settings.database.pool_size,
        max_overflow=settings.database.max_overflow,
    )

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for models
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()