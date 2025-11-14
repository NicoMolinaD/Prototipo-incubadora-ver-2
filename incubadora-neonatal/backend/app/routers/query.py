# app/routers/query.py
from __future__ import annotations
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from ..db import get_db
from .. import models, schemas
from ..auth import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/query", tags=["query"])

@router.get("/devices", response_model=List[schemas.DeviceRow])
def list_devices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
) -> List[schemas.DeviceRow]:
    """
    Devuelve solo los dispositivos vinculados al usuario actual junto con su ultima lectura.
    Incluye un objeto 'metrics' con los valores mas recientes o vacio
    si aun no hay mediciones.
    """
    # Obtener todos los device_ids de las mediciones
    device_entries = (
        db.query(
            models.Measurement.device_id.label("id"),
            func.max(models.Measurement.ts).label("last_seen"),
        )
        .group_by(models.Measurement.device_id)
        .order_by(models.Measurement.device_id)
        .all()
    )

    # Obtener los dispositivos vinculados al usuario actual
    user_devices = {
        d.device_id: d for d in db.query(models.Device)
        .filter(models.Device.user_id == current_user.id)
        .all()
    }

    result: List[schemas.DeviceRow] = []
    for entry in device_entries:
        # Solo mostrar dispositivos vinculados al usuario actual
        device_record = user_devices.get(entry.id)
        if not device_record:
            continue  # Saltar dispositivos no vinculados al usuario

        # Última medición para rellenar metrics
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
            metrics = schemas.DeviceMetrics()

        # datetime -> string ISO
        last_seen_iso = entry.last_seen.isoformat() if entry.last_seen else None

        result.append(
            schemas.DeviceRow(
                id=entry.id,
                last_seen=last_seen_iso,
                is_linked=True,  # Todos los dispositivos aquí están vinculados
                name=device_record.name,
                metrics=metrics,
            )
        )
    return result


@router.get("/latest", response_model=schemas.MeasurementOut)
def latest(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # Verificar que el dispositivo esté vinculado al usuario actual
    device = db.query(models.Device).filter(
        models.Device.device_id == device_id,
        models.Device.user_id == current_user.id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=403,
            detail="Device not linked to your account or does not exist"
        )
    
    m = (
        db.query(models.Measurement)
        .filter(models.Measurement.device_id == device_id)
        .order_by(models.Measurement.ts.desc())
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="No measurements found")
    return m

@router.get("/series", response_model=List[schemas.SeriesPoint])
def series(
    device_id: Optional[str] = None,
    since_minutes: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    q = db.query(models.Measurement)
    
    if device_id:
        # Verificar que el dispositivo esté vinculado al usuario actual
        device = db.query(models.Device).filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        ).first()
        
        if not device:
            raise HTTPException(
                status_code=403,
                detail="Device not linked to your account or does not exist"
            )
        
        q = q.filter(models.Measurement.device_id == device_id)
    else:
        # Si no se especifica device_id, solo mostrar mediciones de dispositivos del usuario
        user_device_ids = [
            d.device_id for d in db.query(models.Device)
            .filter(models.Device.user_id == current_user.id)
            .all()
        ]
        if user_device_ids:
            q = q.filter(models.Measurement.device_id.in_(user_device_ids))
        else:
            # Usuario sin dispositivos vinculados
            return []
    
    if since_minutes:
        cutoff = datetime.utcnow() - timedelta(minutes=since_minutes)
        q = q.filter(models.Measurement.ts >= cutoff)
    q = q.order_by(models.Measurement.ts.desc())
    if limit:
        q = q.limit(limit)
    rows = q.all()
    # se devuelve ascendente para gráficos
    return list(reversed(rows))
