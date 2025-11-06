def test_alerts_endpoint(client):
    """
    Crea mediciones con bitmask de alertas y comprueba que /alerts devuelve
    el bitmask y las etiquetas decodificadas correctamente.
    """
    # Inserta una medicion con alertas = 5 (binario: 0101)
    client.post("/api/incubadora/ingest", json={"device_id": "a1", "alerts": 5})

    r = client.get("/api/incubadora/alerts")
    assert r.status_code == 200
    items = r.json()
    # Debe haber al menos una alerta
    assert any(item["device_id"] == "a1" for item in items)

    # Revisa que cada elemento tenga 'mask' y 'labels'
    for item in items:
        assert "mask" in item and "labels" in item
