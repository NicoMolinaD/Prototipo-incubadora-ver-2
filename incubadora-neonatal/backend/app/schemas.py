# app/schemas.py
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
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
    """
    Data structure for a single time series sample.
    It matches MeasurementOut except that the primary key id is omitted.
    The device_id field is optional because the client usually filters
    by a specific device when requesting series data.
    """
    ts: datetime
    device_id: Optional[str] = None
    temp_piel_c: Optional[float] = None
    temp_aire_c: Optional[float] = None
    humedad: Optional[float] = None
    luz: Optional[float] = None
    peso_g: Optional[float] = None
    alerts: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# === Alertas ===
class AlertRow(BaseModel):
    ts: datetime
    device_id: Optional[str] = None
    mask: int
    labels: List[str]

# === Modelos (ML) ===
class ModelStatus(BaseModel):
    algo: str
    version: str
    training: bool = False
    updated_at: Optional[datetime] = None

class DeviceMetrics(BaseModel):
    temp_aire_c: Optional[float] = None
    temp_piel_c: Optional[float] = None
    humedad: Optional[float] = None
    peso_g: Optional[float] = None

class IngestIn(BaseModel):
    device_id: str
    ts: Optional[str] = None
    temp_aire_c: Optional[float] = None
    temp_piel_c: Optional[float] = None
    humedad: Optional[float] = None
    peso_g: Optional[float] = None

class DeviceRow(BaseModel):
    id: str
    last_seen: Optional[str] = None

class MeasurementOut(BaseModel):
    ts: str
    temp_aire_c: Optional[float] = None
    temp_piel_c: Optional[float] = None
    humedad: Optional[float] = None
    peso_g: Optional[float] = None

