# incubadora-neonatal/backend/app/routers/query.py
from fastapi import APIRouter, Query
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from ..models import Base
from ..settings import settings
import datetime as dt

router = APIRouter(prefix="/api", tags=["query"])
engine = create_engine(settings.DATABASE_URL, future=True)
Base.metadata.create_all(engine)

@router.get("/devices")
def devices():
    with Session(engine) as s:
        rows = s.execute(text("""
          SELECT device_id,
                 MAX(ts) AS last_seen,
                 AVG(temp_piel_c) AS temp_piel_c,
                 AVG(temp_aire_c) AS temp_aire_c,
                 AVG(humedad) AS humedad,
                 AVG(luz) AS luz,
                 AVG(peso_g) AS peso_g
          FROM measurements
          GROUP BY device_id
        """)).mappings().all()
    now = dt.datetime.utcnow()
    out = []
    for r in rows:
        online = (now - r["last_seen"]).total_seconds() < 300 if r["last_seen"] else False
        out.append({
            "device_id": r["device_id"],
            "last_seen": r["last_seen"].isoformat()+"Z" if r["last_seen"] else None,
            "status": "online" if online else "offline",
            "metrics": {
                "temp_piel_c": r["temp_piel_c"],
                "temp_aire_c": r["temp_aire_c"],
                "humedad": r["humedad"],
                "luz": r["luz"],
                "peso_g": r["peso_g"],
            }
        })
    return out

@router.get("/incubadora/latest")
def latest(limit: int = Query(50, ge=1, le=500), device_id: str | None = None):
    q = "SELECT * FROM measurements "
    params = {"limit": limit}
    if device_id:
        q += "WHERE device_id = :device_id "
        params["device_id"] = device_id
    q += "ORDER BY ts DESC LIMIT :limit"
    with Session(engine) as s:
        return s.execute(text(q), params).mappings().all()
