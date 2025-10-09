from app.settings import settings


def test_ingest_ok(client):
    payload = {
        "device_id": "esp32s3-incu-01",
        "ts_ms": 1700000000000,
        "temperatura": 36.7,
        "humedad": 55.0,
        "luz": 100,
        "ntc_c": 36.5,
        "ntc_raw": 2000,
        "peso_g": 3200.0,
    }
    r = client.post("/api/incubadora/ingest", json=payload, headers={"X-API-KEY": settings.api_key})
    assert r.status_code == 200
    assert r.json()["ok"] is True