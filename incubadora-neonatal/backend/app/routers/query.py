# app/routers/query.py
from __future__ import annotations
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/query", tags=["query"])

@router.get("/devices", response_model=List[schemas.DeviceRow])
def list_devices(db: Session = Depends(get_db)) -> List[schemas.DeviceRow]:
    """
    Devuelve todos los dispositivos junto con su ultima lectura.
    Incluye un objeto 'metrics' con los valores mas recientes o vacio
    si aun no hay mediciones.
    """
    # Consultar identificadores y último timestamp
    device_entries = (
        db.query(
            models.Measurement.device_id.label("id"),
            func.max(models.Measurement.ts).label("last_seen"),
        )
        .group_by(models.Measurement.device_id)
        .order_by(models.Measurement.device_id)
        .all()
    )

    result: List[schemas.DeviceRow] = []
    for entry in device_entries:
        # Busca la última medición para rellenar metrics
        m = (
            db.query(models.Measurement)
            .filter(models.Measurement.device_id == entry.id)
            .order_by(models.Measurement.ts.desc())
            .first()
        )
        if m is not None:
            metrics = schemas.DeviceMetrics(
                temp_aire_c=m.temp_aire_c,
                temp_piel_c=m.temp_piel_c,
                humedad=m.humedad,
                peso_g=m.peso_g,
            )
        else:
            # Si no hay datos, usa un objeto vacío
            metrics = schemas.DeviceMetrics()
        result.append(
            schemas.DeviceRow(id=entry.id, last_seen=entry.last_seen, metrics=metrics)
        )
    return result



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
    return m

@router.get("/series", response_model=List[schemas.SeriesPoint])
def series(
    device_id: Optional[str] = None,
    since_minutes: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Measurement)
    if device_id:
        q = q.filter(models.Measurement.device_id == device_id)
    if since_minutes:
        cutoff = datetime.utcnow() - timedelta(minutes=since_minutes)
        q = q.filter(models.Measurement.ts >= cutoff)
    q = q.order_by(models.Measurement.ts.desc())
    if limit:
        q = q.limit(limit)
    rows = q.all()
    # se devuelve ascendente para gráficos
    return list(reversed(rows))
