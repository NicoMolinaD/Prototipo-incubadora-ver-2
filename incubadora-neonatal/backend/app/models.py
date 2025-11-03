# backend/app/models.py
from __future__ import annotations
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Float, DateTime, Index
from datetime import datetime, timezone

class Base(DeclarativeBase):
    pass

class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    temp_piel_c: Mapped[float | None] = mapped_column(Float)
    temp_aire_c: Mapped[float | None] = mapped_column(Float)
    humedad:     Mapped[float | None] = mapped_column(Float)
    luz:         Mapped[float | None] = mapped_column(Float)
    ntc_c:       Mapped[float | None] = mapped_column(Float)
    ntc_raw:     Mapped[int  | None] = mapped_column(Integer)
    peso_g:      Mapped[float | None] = mapped_column(Float)
    set_control: Mapped[int  | None] = mapped_column(Integer)
    alerts:      Mapped[int  | None] = mapped_column(Integer)

Index("ix_measurements_ts", Measurement.ts)
