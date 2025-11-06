def test_ingest_aliases(client):
    """
    Comprueba que el endpoint /ingest acepta tanto los nombres antiguos
    (id, temperatura, humedad_rel, als, peso) como los nuevos.
    """

    # Datos en formato antiguo (como los envía el firmware basico)
    payload_old = {
        "id": "esp32-1",
        "temperatura": 35.1,
        "humedad_rel": 52,
        "als": 120,
        "peso": 3200,
    }
    r = client.post("/api/incubadora/ingest", json=payload_old)
    assert r.status_code == 200
    j = r.json()
    assert j["ok"] is True
    assert "id" in j

    # Datos en formato nuevo (nombres canonicos)
    payload_new = {
        "device_id": "esp32-2",
        "temp_piel_c": 36.6,
        "temp_aire_c": 34.9,
        "humedad": 55,
        "luz": 110,
        "ntc_c": 36.1,
        "peso_g": 3180,
    }
    r = client.post("/api/incubadora/ingest", json=payload_new)
    assert r.status_code == 200
    assert r.json()["ok"] is True
