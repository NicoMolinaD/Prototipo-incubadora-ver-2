# app/routers/devices.py
from __future__ import annotations
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db import get_db
from .. import models, schemas
from ..auth import get_current_active_user

router = APIRouter(prefix="/devices", tags=["devices"])

@router.get("/available", response_model=List[schemas.DeviceRow])
def list_available_devices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
) -> List[schemas.DeviceRow]:
    """
    Lista todos los dispositivos disponibles (con mediciones) y muestra
    cuáles están vinculados al usuario actual y cuáles están disponibles para vincular.
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

    # Obtener todos los dispositivos registrados
    all_devices = {
        d.device_id: d for d in db.query(models.Device).all()
    }

    result: List[schemas.DeviceRow] = []
    for entry in device_entries:
        device_record = all_devices.get(entry.id)
        is_linked_to_current_user = bool(
            device_record and device_record.user_id == current_user.id
        )
        is_linked_to_other = bool(
            device_record and device_record.user_id is not None and device_record.user_id != current_user.id
        )

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

        last_seen_iso = entry.last_seen.isoformat() if entry.last_seen else None

        result.append(
            schemas.DeviceRow(
                id=entry.id,
                last_seen=last_seen_iso,
                is_linked=is_linked_to_current_user,
                name=device_record.name if device_record else None,
                metrics=metrics,
            )
        )
    return result

@router.post("/{device_id}/link", response_model=schemas.DeviceOut)
def link_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Vincula un dispositivo al usuario actual.
    Si el dispositivo ya está vinculado a otro usuario, retorna error.
    """
    # Buscar o crear el registro del dispositivo
    device = db.query(models.Device).filter(models.Device.device_id == device_id).first()
    
    if device:
        # Verificar si ya está vinculado a otro usuario
        if device.user_id is not None and device.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Device is already linked to another user"
            )
        # Si ya está vinculado al usuario actual, no hacer nada
        if device.user_id == current_user.id:
            return device
        # Vincular al usuario actual
        device.user_id = current_user.id
        device.updated_at = datetime.now(timezone.utc)
    else:
        # Crear nuevo registro de dispositivo
        now = datetime.now(timezone.utc)
        device = models.Device(
            device_id=device_id,
            user_id=current_user.id,
            created_at=now,
            updated_at=now,
        )
        db.add(device)
    
    db.commit()
    db.refresh(device)
    return device

@router.post("/{device_id}/unlink", response_model=schemas.DeviceOut)
def unlink_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Desvincula un dispositivo del usuario actual.
    Esto no elimina el dispositivo, solo lo desvincula (user_id = NULL).
    """
    device = db.query(models.Device).filter(
        models.Device.device_id == device_id,
        models.Device.user_id == current_user.id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found or not linked to your account"
        )
    
    # Desvincular (poner user_id en NULL)
    device.user_id = None
    device.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(device)
    return device

@router.get("/my-devices", response_model=List[schemas.DeviceOut])
def list_my_devices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
) -> List[schemas.DeviceOut]:
    """
    Lista todos los dispositivos vinculados al usuario actual.
    """
    devices = db.query(models.Device).filter(
        models.Device.user_id == current_user.id
    ).all()
    return devices

