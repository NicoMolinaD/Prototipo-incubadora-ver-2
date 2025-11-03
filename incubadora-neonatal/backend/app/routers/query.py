# backend/app/routers/query.py
from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc
from ..db import get_session
from ..models import Measurement

router = APIRouter(prefix="/api", tags=["query"])

@router.get("/devices")
def devices(db: Session = Depends(get_session)):
    sub = (
        select(Measurement.device_id, func.max(Measurement.ts).label("last_seen"))
        .group_by(Measurement.device_id)
        .subquery()
    )
    q = (
        select(
            sub.c.device_id,
            sub.c.last_seen,
            Measurement.temp_aire_c,
            Measurement.temp_piel_c,
            Measurement.humedad,
            Measurement.luz,
            Measurement.peso_g,
        )
        .join(Measurement, (Measurement.device_id == sub.c.device_id) & (Measurement.ts == sub.c.last_seen))
        .order_by(sub.c.device_id)
    )
    rows = db.execute(q).all()
    return [
        {
            "device_id": r.device_id,
            "last_seen": r.last_seen.isoformat() if r.last_seen else None,
            "status": "online",
            "metrics": {
                "temp_aire_c": r.temp_aire_c,
                "temp_piel_c": r.temp_piel_c,
                "humedad": r.humedad,
                "luz": r.luz,
                "peso_g": r.peso_g,
            },
        }
        for r in rows
    ]

@router.get("/incubadora/latest")
def latest(limit: int = Query(50, ge=1, le=500), device_id: str | None = None, db: Session = Depends(get_session)):
    stmt = select(Measurement).order_by(desc(Measurement.ts)).limit(limit)
    if device_id:
        stmt = stmt.filter(Measurement.device_id == device_id)
    rows = db.execute(stmt).scalars().all()
    return [{
        "id": r.id, "device_id": r.device_id, "ts": r.ts.isoformat(),
        "temp_aire_c": r.temp_aire_c, "temp_piel_c": r.temp_piel_c,
        "humedad": r.humedad, "luz": r.luz, "peso_g": r.peso_g,
        "set_control": r.set_control, "alerts": r.alerts
    } for r in rows]
