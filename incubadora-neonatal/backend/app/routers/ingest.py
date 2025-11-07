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

from fastapi import APIRouter, Body, Depends, HTTPException
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
    payload: Any = Body(..., description="Measurement payload"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Persist a new measurement to the database.

    This endpoint accepts three kinds of payloads:

    * A JSON object with canonical fields (``temp_aire_c``, etc.) or
      legacy aliases (``id``, ``temperatura``, ``humedad_rel``, etc.).
    * A plain text string emitted by the device over BLE/Wi?Fi.  The
      router will attempt to extract known metrics from the string.
    * A dict containing a ``text`` field ? useful for explicitly
      submitting a raw payload alongside additional metadata.

    The ``device_id`` must be provided either as a top?level key in
    JSON or as a query parameter when sending a text payload.  When
    omitted a default identifier of ``esp32`` is used.
    """
    data: Dict[str, Any] = {}
    # If payload is a dict-like structure (JSON)
    if isinstance(payload, dict):
        # If the dict contains a single 'text' field treat it as raw text
        if list(payload.keys()) == ["text"] and isinstance(payload["text"], str):
            data = _parse_text_payload(payload["text"])
        else:
            # Copy and map aliases
            for key, value in payload.items():
                canonical = ALIASES.get(key, key)
                data[canonical] = value
    elif isinstance(payload, str):
        # Raw text body
        data = _parse_text_payload(payload)
    else:
        raise HTTPException(status_code=415, detail="Unsupported payload type")

    # Ensure there is always a device identifier.  Use a default for BLE lines.
    if not data.get("device_id"):
        data["device_id"] = "esp32"
    # Timestamp current UTC if not provided
    if not data.get("ts"):
        data["ts"] = datetime.now(timezone.utc)
    # Validate using Pydantic; drop unknown fields
    try:
        m_in = IngestPayload(**data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    # Persist to database
    row = Measurement(**m_in.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    # If SSE broadcasting is implemented in the future, call broadcast here
    return {"ok": True, "id": row.id}
