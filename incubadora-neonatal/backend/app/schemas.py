# backend/app/schemas.py
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class IngestPayload(BaseModel):
    # Formato Marsupia (WiFi) y/o puente BLE normalizado
    device_id: Optional[str] = None
    tAir: Optional[float] = None
    tSkin: Optional[float] = None
    rh: Optional[float] = None
    kg: Optional[float] = None
    luz: Optional[float] = None
    alerts: Optional[int] = 0
    set_control: Optional[int] = None

    # También admitimos nombres ya normalizados desde frontend BLE:
    temp_aire_c: Optional[float] = None
    temp_piel_c: Optional[float] = None
    humedad: Optional[float] = None
    peso_g: Optional[float] = None

    ts: Optional[datetime] = None
    device: Optional[str] = Field(None, description="origen opcional")

    def normalize(self) -> Dict[str, Any]:
        aire = self.temp_aire_c if self.temp_aire_c is not None else self.tAir
        piel = self.temp_piel_c if self.temp_piel_c is not None else self.tSkin
        hum  = self.humedad if self.humedad is not None else self.rh
        g    = self.peso_g if self.peso_g is not None else (self.kg*1000.0 if self.kg is not None else None)
        dev  = self.device_id or self.device or "unknown"
        return {
            "device_id": dev,
            "ts": self.ts or datetime.now(timezone.utc),
            "temp_piel_c": piel,
            "temp_aire_c": aire,
            "humedad": hum,
            "luz": self.luz,
            "ntc_c": None,
            "ntc_raw": None,
            "peso_g": g,
            "set_control": self.set_control,
            "alerts": self.alerts or 0,
        }
