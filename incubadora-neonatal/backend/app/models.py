# app/models.py
from __future__ import annotations
from sqlalchemy import Column, Integer, String, Float, DateTime, func, Boolean
from .db import Base

class Measurement(Base):
    __tablename__ = "measurements"

    id        = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True, nullable=False)
    ts        = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    temp_aire_c  = Column(Float, nullable=True)
    temp_piel_c  = Column(Float, nullable=True)
    humedad      = Column(Float, nullable=True)
    luz          = Column(Float, nullable=True)
    ntc_raw      = Column(Integer, nullable=True)
    ntc_c        = Column(Float, nullable=True)
    peso_g       = Column(Float, nullable=True)
    set_control  = Column(Integer, nullable=True)
    alerts       = Column(Integer, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
