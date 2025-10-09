from pydantic import BaseModel, Field
from typing import Optional


class IngestPayload(BaseModel):
    device_id: str = Field(..., max_length=64)
    ts_ms: int
    temperatura: Optional[float] = None
    humedad: Optional[float] = None
    luz: Optional[float] = None
    ntc_c: Optional[float] = None
    ntc_raw: Optional[int] = None
    peso_g: Optional[float] = None


class IngestResponse(BaseModel):
    ok: bool
    id: int


class AlertOut(BaseModel):
    id: int
    device_id: str
    kind: str
    message: str
    severity: str
    measurement_id: int | None
    created_at: str | None