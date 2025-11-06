# app/routers/ingest.py
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ..db import get_db
from .. import models, schemas

router = APIRouter(tags=["ingest"])

# Mapa de alias ? nombre canónico
# Alias adicionales basados en el firmware
ALIASES = {
    "id": "device_id",
    "temperatura": "temp_aire_c",
    "temp": "temp_aire_c",
    "temp_aire": "temp_aire_c",
    "temp_piel": "temp_piel_c",
    "tAir": "temp_aire_c",
    "tSkin": "temp_piel_c",
    "humedad_rel": "humedad",
    "humedad": "humedad",
    "rh": "humedad",
    "als": "luz",
    "lux": "luz",
    "peso": "peso_g",
    "kg": "peso_g",
    "set": "set_control",
    "setControl": "set_control",
    "alerts": "alerts",
}


@router.post("/ingest")
def ingest(payload: dict = Body(...), db: Session = Depends(get_db)):
    # Renombrar claves según el mapa de alias
    data = {}
    for key, value in payload.items():
        canonical = ALIASES.get(key, key)
        data[canonical] = value
    # Asignar timestamp actual si no viene en el payload
    if not data.get("ts"):
        data["ts"] = datetime.now(timezone.utc)
    # Validar con Pydantic
    pyd = schemas.IngestPayload(**data)
    row = models.Measurement(**pyd.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id}
