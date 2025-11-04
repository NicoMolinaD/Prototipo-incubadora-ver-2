# app/models.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, Float, DateTime, func
from .db import Base  # <- usa el mismo Base

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True, nullable=False)
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    temp_aire_c = Column(Float, nullable=True)
    temp_piel_c = Column(Float, nullable=True)
    humedad     = Column(Float, nullable=True)
    peso_g      = Column(Float, nullable=True)
