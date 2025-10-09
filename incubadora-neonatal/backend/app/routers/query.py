from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Measurement, Alert


router = APIRouter(prefix="/api/incubadora", tags=["query"])


@router.get("/latest")
def latest(limit: int = 20, device_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Measurement)
    if device_id:
        q = q.filter(Measurement.device_id == device_id)
    rows = q.order_by(Measurement.id.desc()).limit(limit).all()
    return [
        {
            "id": r.id, "device_id": r.device_id, "ts_ms": r.ts_ms,
            "temperatura": r.temperatura, "humedad": r.humedad, "luz": r.luz,
            "ntc_c": r.ntc_c, "ntc_raw": r.ntc_raw, "peso_g": r.peso_g,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows
    ]


@router.get("/alerts")
def alerts(limit: int = 20, db: Session = Depends(get_db)):
    rows = db.query(Alert).order_by(Alert.id.desc()).limit(limit).all()
    return [
        {
            "id": r.id, "device_id": r.device_id, "kind": r.kind,
            "message": r.message, "severity": r.severity,
            "measurement_id": r.measurement_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows
    ]