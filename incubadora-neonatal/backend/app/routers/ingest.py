from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..schemas import IngestPayload, IngestResponse
from ..models import Measurement
from ..deps import verify_api_key
from ..main import push_event
from ..alerts import evaluate_and_create_alerts


router = APIRouter(prefix="/api/incubadora", tags=["ingest"])


@router.post("/ingest", response_model=IngestResponse, dependencies=[Depends(verify_api_key)])
def ingest(payload: IngestPayload, db: Session = Depends(get_db)):
    m = Measurement(
        device_id=payload.device_id,
        ts_ms=payload.ts_ms,
        temperatura=payload.temperatura,
        humedad=payload.humedad,
        luz=payload.luz,
        ntc_c=payload.ntc_c,
        ntc_raw=payload.ntc_raw,
        peso_g=payload.peso_g,
    )
    db.add(m)
    db.commit()
    db.refresh(m)


    # Reglas de alerta
    alerts = evaluate_and_create_alerts(db, m)
    db.commit()


    # Notificar stream
    push_event({"type": "measurement", "id": m.id, "device_id": m.device_id})
    for a in alerts:
        push_event({"type": "alert", "id": a.id, "severity": a.severity, "message": a.message})


    return IngestResponse(ok=True, id=m.id)