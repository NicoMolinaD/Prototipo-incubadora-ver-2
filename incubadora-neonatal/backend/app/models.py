# app/models.py
from __future__ import annotations
from sqlalchemy import Column, Integer, String, Float, DateTime, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
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

    # Relación 1:N con Device
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True, nullable=False)  # ID único del dispositivo físico
    name = Column(String, nullable=True)  # Nombre opcional para el dispositivo
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Nullable para permitir desvinculación
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relación N:1 con User
    user = relationship("User", back_populates="devices")
