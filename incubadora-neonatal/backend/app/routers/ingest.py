# incubadora-neonatal/backend/app/routers/ingest.py
from fastapi import APIRouter, Header
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from ..models import Base, Measurement
from ..schemas import IngestPayload
from ..settings import settings

router = APIRouter(prefix="/api/incubadora", tags=["ingest"])

engine = create_engine(settings.DATABASE_URL, future=True)
Base.metadata.create_all(engine)

@router.post("/ingest")
def ingest(p: IngestPayload, x_device_id: str | None = Header(default=None)):
    data = p.normalize()
    if x_device_id:
        data["device_id"] = x_device_id
    with Session(engine) as s:
        s.add(Measurement(**data))
        s.commit()
    return {"ok": True}
