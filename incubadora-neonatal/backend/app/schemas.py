# incubadora-neonatal/backend/app/schemas.py
from __future__ import annotations
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

def _coerce_ts(v):
    if v is None:
        return datetime.utcnow()
    if isinstance(v, (int, float)):
        # epoch s / ms
        return datetime.utcfromtimestamp(v/1000.0 if v > 1e12 else v)
    if isinstance(v, str):
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except Exception:
            return datetime.utcnow()
    return datetime.utcnow()

class IngestPayload(BaseModel):
    # id (acepta varias)
    device_id: Optional[str] = None
    id: Optional[str] = None
    mac: Optional[str] = None
    device: Optional[str] = None

    # tiempo
    ts: Optional[datetime] = None
    timestamp: Optional[float | str] = None

    # preferidos (nuevo firmware)
    temp_piel_c: Optional[float] = None
    temp_aire_c: Optional[float] = None
    humedad: Optional[float] = None
    luz: Optional[float] = None
    ntc_c: Optional[float] = None
    ntc_raw: Optional[int] = None
    peso_g: Optional[float] = None

    # alias ?viejos?
    temperatura: Optional[float] = None
    humedad_rel: Optional[float] = None
    rh: Optional[float] = None
    als: Optional[float] = None
    light: Optional[float] = None
    peso: Optional[float] = None
    t_skin: Optional[float] = None
    t_piel: Optional[float] = None
    t_air: Optional[float] = None
    t_aire: Optional[float] = None
    ntcC: Optional[float] = None  # por si el firmware manda ntcCelsius

    @field_validator("ts", mode="before")
    @classmethod
    def _v_ts(cls, v):
        return _coerce_ts(v)

    def normalize(self) -> dict:
        # id
        did = self.device_id or self.id or self.mac or self.device or "esp32-unknown"

        # temps (si solo viene `temperatura`, se asume AIRE)
        t_skin = self.temp_piel_c or self.t_skin or self.t_piel
        t_air  = self.temp_aire_c or self.t_air or self.t_aire or self.temperatura

        # humedad / luz / peso
        hum = self.humedad or self.humedad_rel or self.rh
        lux = self.luz or self.als or self.light
        peso = self.peso_g or self.peso

        # ntc
        ntc_c = self.ntc_c or self.ntcC

        return {
            "device_id": did,
            "ts": self.ts or _coerce_ts(self.timestamp),
            "temp_piel_c": t_skin,
            "temp_aire_c": t_air,
            "humedad": hum,
            "luz": lux,
            "ntc_c": ntc_c,
            "ntc_raw": self.ntc_raw,
            "peso_g": peso,
        }
