def test_ingest_aliases(client):
    # payload ?viejo?
    r = client.post("/api/incubadora/ingest", json={
        "id":"esp32-1","temperatura":35.1,"humedad_rel":52,"als":120,"peso":3200
    })
    assert r.status_code == 200

    # payload ?nuevo?
    r = client.post("/api/incubadora/ingest", json={
        "device_id":"esp32-2","temp_piel_c":36.6,"temp_aire_c":34.9,
        "humedad":55,"luz":110,"ntc_c":36.1,"peso_g":3180
    })
    assert r.status_code == 200
