# app/routers/__init__.py
from .ingest import router as ingest
from .query import router as query
from .alerts import router as alerts
from .models_router import router as models_router
from .auth import router as auth
from .devices import router as devices

__all__ = ["ingest", "query", "alerts", "models_router", "auth", "devices"]
