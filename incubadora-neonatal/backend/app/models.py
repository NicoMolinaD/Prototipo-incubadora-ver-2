from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, func
from .db import Base


class Measurement(Base):
    __tablename__ = "measurements"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), index=True, nullable=False)
    ts_ms = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    temperatura = Column(Float)
    humedad = Column(Float)
    luz = Column(Float)
    ntc_c = Column(Float)
    ntc_raw = Column(Integer)
    peso_g = Column(Float)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    device_id = Column(String(64), index=True, nullable=False)
    kind = Column(String(32), nullable=False) # e.g., temp, hum, peso
    message = Column(String(255), nullable=False)
    severity = Column(String(16), nullable=False) # info/warn/crit
    measurement_id = Column(Integer, nullable=True)