# app/schemas.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict




# === Medidas ===
class MeasurementBase(BaseModel):
    device_id: str
    ts: datetime

    temp_piel_c: Optional[float] = None
    temp_aire_c: Optional[float] = None
    humedad: Optional[float] = None
    luz: Optional[float] = None
    ntc_raw: Optional[int] = None
    ntc_c: Optional[float] = None
    peso_g: Optional[float] = None
    set_control: Optional[int] = None
    alerts: Optional[int] = None

    # para poder serializar desde ORM (SQLAlchemy)
    model_config = {"from_attributes": True}


class IngestPayload(BaseModel):
    device_id: str
    ts: Optional[datetime] = None

    temp_piel_c: Optional[float] = None
    temp_aire_c: Optional[float] = None
    humedad: Optional[float] = None
    luz: Optional[float] = None
    ntc_raw: Optional[int] = None
    ntc_c: Optional[float] = None
    peso_g: Optional[float] = None
    set_control: Optional[int] = None
    alerts: Optional[int] = None


class SeriesPoint(BaseModel):
    ts: datetime
    temp_piel_c: Optional[float] = None
    temp_aire_c: Optional[float] = None
    humedad: Optional[float] = None
    luz: Optional[float] = None
    peso_g: Optional[float] = None
    alerts: Optional[int] = None

    model_config = {"from_attributes": True}


# === Alertas ===
class AlertRow(BaseModel):
    ts: datetime
    device_id: Optional[str] = None
    label: str
    code: int


# === Modelos (ML) ===
class ModelStatus(BaseModel):
    name: str
    version: str
    last_trained: Optional[datetime] = None
    trained_by: Optional[str] = None
    samples_used: Optional[int] = 0
    notes: Optional[str] = None


class DeviceRow(BaseModel):
    id: str
    last_seen: datetime | None = None

class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # <- importante
    device_id: str
    ts: datetime
    temp_aire_c: float | None = None
    temp_piel_c: float | None = None
    humedad: float | None = None
    peso_g: float | None = None
