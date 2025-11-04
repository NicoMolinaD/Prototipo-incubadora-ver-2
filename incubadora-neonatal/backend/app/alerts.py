from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from .db import get_db
from . import models
from .schemas import AlertRow

router = APIRouter(prefix="/api/incubadora", tags=["alerts"])

ALERT_LABELS = [
    ("overtemp", 1),
    ("airflow_fail", 2),
    ("sensor_fail", 4),
    ("program_fail", 8),
    ("bad_posture", 16),
]

def decode(mask: int) -> list[str]:
    out: list[str] = []
    for name, bit in ALERT_LABELS:
        if mask & bit:
            out.append(name)
    return out

@router.get("/alerts", response_model=List[AlertRow])
def recent_alerts(
    device_id: Optional[str] = None,
    since_minutes: Optional[int] = Query(default=24*60, ge=1, le=60*24*14),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    start = None
    if since_minutes is not None:
        start = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)

    stmt = select(models.Measurement).where(models.Measurement.alerts != None)
    if device_id:
        stmt = stmt.where(models.Measurement.device_id == device_id)
    if start:
        stmt = stmt.where(models.Measurement.ts >= start)
    stmt = stmt.order_by(desc(models.Measurement.ts)).limit(limit)

    rows = db.execute(stmt).scalars().all()
    return [
        AlertRow(
            ts=r.ts,
            device_id=r.device_id,
            alerts=r.alerts or 0,
            labels=decode(r.alerts or 0),
        )
        for r in rows
    ]
