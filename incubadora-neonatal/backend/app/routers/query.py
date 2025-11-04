# app/routers/query.py
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from .. import models, schemas  # <- tus modelos SQLAlchemy y Pydantic

router = APIRouter(prefix="/query", tags=["query"])

@router.get("/devices", response_model=List[schemas.DeviceRow])
def list_devices(db: Session = Depends(get_db)):
    # Distintos device_id + último timestamp visto en la tabla de mediciones
    rows = (
        db.query(
            models.Measurement.device_id.label("id"),
            func.max(models.Measurement.ts).label("last_seen"),
        )
        .group_by(models.Measurement.device_id)
        .order_by(models.Measurement.device_id)
        .all()
    )
    # Ajuste de tipos para Pydantic (None/fecha)
    return [
        schemas.DeviceRow(id=row.id, last_seen=row.last_seen)
        for row in rows
    ]

@router.get("/latest", response_model=schemas.MeasurementOut)
def latest(device_id: str, db: Session = Depends(get_db)):
    m = (
        db.query(models.Measurement)
        .filter(models.Measurement.device_id == device_id)
        .order_by(models.Measurement.ts.desc())
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Not Found")
    return m  # Pydantic v2 con from_attributes en schemas.MeasurementOut
