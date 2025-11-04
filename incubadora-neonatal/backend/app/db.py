# app/db.py
from __future__ import annotations

from typing import Iterator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base

from .settings import settings

# Single source of truth for SQLAlchemy Base
Base = declarative_base()

# Read DB URL from settings. Accepts db_url or database_url for compatibility
_DB_URL = getattr(settings, "db_url", None) or getattr(settings, "database_url", None)
if not _DB_URL:
    raise RuntimeError("DB URL is not configured. Define settings.db_url or settings.database_url")

# Engine and Session factory
engine = create_engine(_DB_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, future=True)

def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
