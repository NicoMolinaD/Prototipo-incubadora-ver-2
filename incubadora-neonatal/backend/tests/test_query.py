# backend/tests/test_query.py

def test_list_devices(client):
    """
    Comprueba que al ingerir datos de dos dispositivos, /query/devices devuelve ambos IDs.
    """
    # Cargamos dos mediciones
    client.post("/api/incubadora/ingest", json={"device_id": "dev1", "temp_aire_c": 30})
    client.post("/api/incubadora/ingest", json={"device_id": "dev2", "temp_aire_c": 31})

    r = client.get("/api/incubadora/query/devices")
    assert r.status_code == 200
    data = r.json()
    ids = {row["id"] for row in data}
    assert {"dev1", "dev2"} <= ids

def test_latest_measurement(client):
    """
    Ingresa una medicion y comprueba que /query/latest devuelva esa lectura con status 200.
    """
    device = "latest-dev"
    payload = {"device_id": device, "temp_aire_c": 28.5}
    client.post("/api/incubadora/ingest", json=payload)

    r = client.get("/api/incubadora/query/latest", params={"device_id": device})
    assert r.status_code == 200
    latest = r.json()
    assert latest["device_id"] == device
    assert latest["temp_aire_c"] == payload["temp_aire_c"]

def test_series_endpoint(client):
    """
    Comprueba que /query/series devuelve al menos tres mediciones en orden y sin errores.
    """
    device = "series-dev"
    # Inserta tres datos consecutivos sin pasar timestamps
    for i in range(3):
        client.post("/api/incubadora/ingest", json={"device_id": device, "temp_aire_c": 25 + i})

    # Pide la serie completa
    r = client.get("/api/incubadora/query/series", params={"device_id": device})
    assert r.status_code == 200
    series = r.json()
    assert len(series) >= 3

    # Comprueba que los registros pertenecen al mismo dispositivo
    assert all(row["device_id"] == device for row in series)

    # Verifica que las fechas vienen en orden ascendente (del mas antiguo al mas reciente)
    timestamps = [row["ts"] for row in series]
    assert timestamps == sorted(timestamps)
