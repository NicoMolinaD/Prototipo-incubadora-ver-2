from sqlalchemy.orm import Session
from .models import Alert, Measurement


# Reglas simples: ajusta rangos según clínica
TEMP_RANGE = (36.5, 37.5)
HUM_RANGE = (40.0, 65.0)




def evaluate_and_create_alerts(db: Session, m: Measurement) -> list[Alert]:
    alerts: list[Alert] = []


    def add(kind: str, msg: str, severity: str = "warn"):
        alert = Alert(device_id=m.device_id, kind=kind, message=msg,
        severity=severity, measurement_id=m.id)
        db.add(alert)
        alerts.append(alert)


        if m.temperatura is not None:
            lo, hi = TEMP_RANGE
        if m.temperatura < lo or m.temperatura > hi:
            add("temp", f"Temperatura fuera de rango: {m.temperatura:.2f}°C","crit")


        if m.humedad is not None:
            lo, hi = HUM_RANGE
        if m.humedad < lo or m.humedad > hi:
            add("hum", f"Humedad fuera de rango: {m.humedad:.1f}%", "warn")


        # Ejemplo: peso negativo o caída abrupta (simple)
        if m.peso_g is not None and m.peso_g < 0:
            add("peso", f"Lectura de peso inválida: {m.peso_g:.2f} g", "warn")


        return alerts