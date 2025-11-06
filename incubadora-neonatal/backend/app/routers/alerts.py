# app/routers/alerts.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..db import get_db
from .. import models, schemas

router = APIRouter(tags=["alerts"])

# Mapeo bitmask ? etiquetas (ajusta según tus reglas)
ALERT_LABELS = {
    1: "Alta temp aire",
    2: "Baja temp aire",
    4: "Alta humedad",
    8: "Baja humedad",
    16: "Bajo peso",
}

@router.get("/alerts", response_model=List[schemas.AlertRow])
def alerts(limit: int = 100, db: Session = Depends(get_db)):
    q = (
        db.query(models.Measurement)
        .filter(models.Measurement.alerts != None)
        .order_by(models.Measurement.ts.desc())
        .limit(limit)
    )
    result = []
    for m in q.all():
        mask = m.alerts or 0
        labels = [label for bit, label in ALERT_LABELS.items() if mask & bit]
        result.append(
            schemas.AlertRow(
                ts=m.ts,
                device_id=m.device_id,
                mask=mask,
                labels=labels,
            )
        )
    return result
