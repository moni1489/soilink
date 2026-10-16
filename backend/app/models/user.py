from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.core.db import Base


class User(Base):
    """Учётные записи для входа в SoiLink. Пароль хранится только хешем (см. app.core.security)."""
    __tablename__ = "users"

    login = Column(String, primary_key=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
