from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Normalize PostgreSQL dialect if provided as postgres:// by cloud providers (Render/Heroku)
db_url = settings.database.url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# SQLite-specific connection arguments
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create SQLAlchemy engine
if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args=connect_args,
    )
else:
    engine = create_engine(
        db_url,
        pool_size=settings.database.pool_size,
        max_overflow=settings.database.max_overflow,
    )

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
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