# backend/app/routers/ingest.py
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_session
from ..models import Measurement
from ..schemas import IngestPayload

router = APIRouter(prefix="/api/incubadora", tags=["ingest"])

@router.post("/ingest")
def ingest(payload: IngestPayload, db: Session = Depends(get_session)):
    row = Measurement(**payload.normalize())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id}
