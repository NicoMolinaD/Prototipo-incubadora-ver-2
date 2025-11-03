# backend/app/collector.py
from __future__ import annotations
import time, threading, requests
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from .models import Base, Measurement
from .schemas import IngestPayload
from .settings import settings

# DB engine propio del colector
engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
Base.metadata.create_all(engine)

# Dispositivos y periodo desde .env
_DEVS: List[str] = [u.strip() for u in settings.ESP32_DEVICES.split(",") if u.strip()]
_PERIOD = int(settings.COLLECT_PERIOD_MS)

# Registro en memoria para la UI
_REG: Dict[str, Dict[str, Any]] = {
    url: {"base_url": url, "last_ok": None, "last_error": None, "last_sample": None}
    for url in _DEVS
}

def _fetch_one(base_url: str):
    try:
        r = requests.get(f"{base_url.rstrip('/')}/data", timeout=3.0)
        r.raise_for_status()
        data = r.json()  # {"peso","temperatura","humedad","setControl", ...}
        # Normaliza al esquema del backend
        p = IngestPayload(**data, device=base_url)
        norm = p.normalize()
        # Forzamos TS aware (UTC) para la columna timezone=True
        norm["ts"] = datetime.now(timezone.utc)

        with Session(engine) as s:
            s.add(Measurement(**norm))
            s.commit()

        _REG[base_url]["last_ok"] = datetime.now(timezone.utc).isoformat()
        _REG[base_url]["last_error"] = None
        _REG[base_url]["last_sample"] = norm
    except Exception as e:
        _REG[base_url]["last_error"] = str(e)

def _loop():
    if not _DEVS:
        print("[collector] ESP32_DEVICES vacío ? colector deshabilitado")
        return
    print(f"[collector] polling {_DEVS} cada {_PERIOD} ms")
    while True:
        for u in list(_REG.keys()):
            _fetch_one(u)
        time.sleep(_PERIOD / 1000.0)

def start_background():
    # Arranca en hilo sólo si hay dispositivos
    if not _DEVS:
        return
    t = threading.Thread(target=_loop, daemon=True)
    t.start()

def read_status() -> Dict[str, Any]:
    return {
        "enabled": bool(_DEVS),
        "period_ms": _PERIOD,
        "devices": list(_REG.values()),
        "now": datetime.now(timezone.utc).isoformat(),
    }
