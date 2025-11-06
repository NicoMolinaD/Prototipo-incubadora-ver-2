def test_model_status_and_retrain(client):
    """
    Verifica que el endpoint /models/status devuelve el estado del modelo y
    que /models/retrain incrementa la version y activa el flag de training.
    """
    # Estado inicial del modelo
    r = client.get("/api/incubadora/models/status")
    assert r.status_code == 200
    status = r.json()
    prev_version = status["version"]
    assert status["training"] is False

    # Lanza reentrenamiento
    r = client.post("/api/incubadora/models/retrain")
    assert r.status_code == 200
    status2 = r.json()

    # Comprobar que el numero de version ha cambiado (se incrementa en el ultimo dígito)
    assert status2["version"] != prev_version
    assert status2["training"] is True
