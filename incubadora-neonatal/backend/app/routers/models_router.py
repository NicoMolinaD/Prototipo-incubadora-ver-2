# app/routers/models_router.py
from __future__ import annotations
from fastapi import APIRouter, BackgroundTasks
from ..schemas import ModelStatus
from ..settings import settings

router = APIRouter(prefix="/models", tags=["models"])

# Estado inicial del modelo para que el frontend pueda consultar /models/status
_STATE = ModelStatus(
    name=settings.model_name,
    version=settings.model_ver,
)

@router.get("/status", response_model=ModelStatus)
def get_status() -> ModelStatus:
    return _STATE

@router.post("/retrain", response_model=ModelStatus)
def retrain(background: BackgroundTasks) -> ModelStatus:
    global _STATE  # <-- declarar global ANTES de usar _STATE

    # Simular un trabajo en background (entrenamiento real iria aqui)
    def _job():
        # no-op por ahora
        pass

    background.add_task(_job)

    # Bump de version simple: x.y.Z -> x.y.(Z+1), si el ultimo segmento es numerico
    ver = _STATE.version or "v0.0.1"
    parts = ver.split(".")
    if parts and parts[-1].isdigit():
        parts[-1] = str(int(parts[-1]) + 1)
        new_ver = ".".join(parts)
    else:
        new_ver = ver  # si no es numerica, la dejamos igual

    # Reasignamos el estado con la nueva version
    _STATE = ModelStatus(
        name=_STATE.name,
        version=new_ver,
    )
    return _STATE
