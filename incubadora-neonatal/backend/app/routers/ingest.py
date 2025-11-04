# app/routers/ingest.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas

router = APIRouter(tags=["ingest"])

@router.post("/ingest")
def ingest(payload: schemas.IngestPayload, db: Session = Depends(get_db)):
    # persiste y devuelve id (ejemplo)
    row = models.Measurement(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id}
