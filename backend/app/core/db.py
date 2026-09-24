from sqlalchemy import create_engine, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings


def _normalize_url(url: str) -> str:
    """Хостинги (Fly, Heroku) отдают postgres:// — SQLAlchemy нужен явный драйвер psycopg."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _normalize_url(settings.DATABASE_URL)
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=not IS_SQLITE,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# JSONB в Postgres (индексируемый, компактнее), обычный JSON — в SQLite
JSONType = JSON().with_variant(JSONB(), "postgresql")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
