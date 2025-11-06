# app/routers/models_router.py
from __future__ import annotations
from fastapi import APIRouter, BackgroundTasks
from datetime import datetime
from ..schemas import ModelStatus
from ..settings import settings

router = APIRouter(prefix="/models", tags=["models"])

# Estado inicial del modelo
_STATE = ModelStatus(
    algo=settings.model_name,
    version=settings.model_ver,
    training=False,
    updated_at=None,
)

@router.get("/status", response_model=ModelStatus)
def get_status() -> ModelStatus:
    return _STATE

@router.post("/retrain", response_model=ModelStatus)
def retrain(background: BackgroundTasks) -> ModelStatus:
    global _STATE

    # Simula entrenamiento en background
    def _job():
        import time
        time.sleep(2)
        _STATE.training = False
        _STATE.updated_at = datetime.utcnow()

    _STATE.training = True
    background.add_task(_job)

    # Aumenta el último número de versión
    parts = _STATE.version.split(".")
    if parts and parts[-1].isdigit():
        parts[-1] = str(int(parts[-1]) + 1)
        _STATE.version = ".".join(parts)
    return _STATE
