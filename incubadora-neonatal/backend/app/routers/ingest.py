"""
Ingestion endpoints for the incubator backend.

This router accepts measurement payloads from the ESP32 firmware and
persists them to the database.  It supports both JSON bodies with
canonical field names legacy aliases and even plain
text strings emitted by the microcontroller over BLE or WiFi.  When
ingesting a text payload the router attempts to parse known patterns
such as 'TEMP Air: 26.3 C | Skin: 102.6 C' and map them onto the
appropriate measurement fields.  Any fields not present in the input
are left 'None' in the database row.

Previous iterations of this project attempted to broadcast new
measurements to ServerSent Events (SSE) subscribers for realtime
updates.  The current code base does not include an SSE manager,
so this router simply returns after persisting a measurement.  If
streaming functionality is added again, a broadcast call can be added
just before returning.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Measurement
from ..schemas import IngestPayload, MeasurementOut

router = APIRouter(tags=["ingest"])


# Mapping of legacy or shorthand keys to canonical schema names.  When
# receiving a JSON object the ingestion endpoint will rewrite keys
# according to this map.  Additional aliases can be added here to
# support older firmware versions without modifying the database schema.
ALIASES: Dict[str, str] = {
    "id": "device_id",
    "temperatura": "temp_aire_c",
    "temp": "temp_aire_c",
    "temp_aire": "temp_aire_c",
    "temp_piel": "temp_piel_c",
    "tAir": "temp_aire_c",
    "tSkin": "temp_piel_c",
    "humedad_rel": "humedad",
    "humedad": "humedad",
    "rh": "humedad",
    "als": "luz",
    "lux": "luz",
    "peso": "peso_g",
    "kg": "peso_g",
    "set": "set_control",
    "setControl": "set_control",
    "alerts": "alerts",
    "uHum": "humedad",
}


def _parse_text_payload(text: str) -> Dict[str, Any]:
    """
    Parse a multiline string emitted by the ESP32 firmware into
    measurement fields.  This helper looks for common labels like
    ``Air``, ``Skin``, ``RH`` and ``Weight`` and extracts numeric
    values.  If a value cannot be parsed the corresponding field is
    omitted.

    Parameters
    ----------
    text:
        Raw text received from the device.  Lines may be separated
        by newlines or combined on a single line with separators like
        ``|``.

    Returns
    -------
    Dict[str, Any]
        Partial measurement dictionary containing keys matching the
        canonical schema names (e.g. ``temp_aire_c``) and numeric
        values.  A timestamp is *not* included; the caller is
        responsible for adding ``ts``.
    """
    out: Dict[str, Any] = {}
    # Normalise whitespace and separators
    s = text.replace("\n", " | ")
    # Air temperature (may appear as "Air" or "Temp Air")
    m = re.search(r"(?:temp\s*)?air\s*[:\s]+([0-9]+(?:\.[0-9]+)?)", s, re.IGNORECASE)
    if m:
        try:
            out["temp_aire_c"] = float(m.group(1))
        except ValueError:
            pass
    # Skin temperature
    m = re.search(r"skin\s*[:\s]+([0-9]+(?:\.[0-9]+)?)", s, re.IGNORECASE)
    if m:
        try:
            out["temp_piel_c"] = float(m.group(1))
        except ValueError:
            pass
    # Relative humidity (RH)
    m = re.search(r"RH\s*[:\s]+([0-9]+(?:\.[0-9]+)?)", s, re.IGNORECASE)
    if m:
        try:
            out["humedad"] = float(m.group(1))
        except ValueError:
            pass
    # Absolute humidity (uHum) ? map to the same field
    m = re.search(r"uHum\s*[:\s]+([0-9]+(?:\.[0-9]+)?)", s, re.IGNORECASE)
    if m and "humedad" not in out:
        try:
            out["humedad"] = float(m.group(1))
        except ValueError:
            pass
    # Weight (assume kg) ? convert to grams
    m = re.search(r"weight\s*[:\s]+([0-9]+(?:\.[0-9]+)?)", s, re.IGNORECASE)
    if m:
        try:
            out["peso_g"] = float(m.group(1)) * 1000
        except ValueError:
            pass
    return out


@router.post("/ingest")
async def ingest(
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Acepta:
      - text/plain (líneas estilo: 'TEMP Air: 26.3 C | Skin: 34.2 C ...')
      - application/json (con campos canónicos o alias)
    """
    ctype = request.headers.get("content-type", "").lower()

    data: Dict[str, Any] = {}

    if "text/plain" in ctype:
        # cuerpo como texto
        raw = (await request.body()).decode("utf-8", errors="ignore")
        data = _parse_text_payload(raw)

    elif "application/json" in ctype:
        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")

        if not isinstance(payload, dict):
            raise HTTPException(status_code=422, detail="JSON object required")

        # Si viene {"text": "..."} lo tratamos como texto crudo
        if list(payload.keys()) == ["text"] and isinstance(payload["text"], str):
            data = _parse_text_payload(payload["text"])
        else:
            # mapear alias -> canónicos
            for k, v in payload.items():
                data[ALIASES.get(k, k)] = v

    else:
        # cualquier otro content-type
        raise HTTPException(status_code=415, detail="Unsupported payload type")

    # Defaults
    if not data.get("device_id"):
        data["device_id"] = "esp32"
    if not data.get("ts"):
        data["ts"] = datetime.now(timezone.utc)

    # Validar con Pydantic y persistir
    try:
        m_in = IngestPayload(**data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    row = Measurement(**m_in.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    return {"ok": True, "id": row.id}

