# app/routers/__init__.py
from .ingest import router as ingest
from .query import router as query
from .alerts import router as alerts
from .models_router import router as models_router

__all__ = ["ingest", "query", "alerts", "models_router"]
