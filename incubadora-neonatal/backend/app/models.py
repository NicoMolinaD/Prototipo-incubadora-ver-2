# incubadora-neonatal/backend/app/models.py
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import Integer, String, Float, DateTime

Base = declarative_base()

class Measurement(Base):
    __tablename__ = "measurements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True)
    ts: Mapped["datetime"] = mapped_column(DateTime, index=True)

    temp_piel_c: Mapped[float | None] = mapped_column(Float)
    temp_aire_c: Mapped[float | None] = mapped_column(Float)
    humedad:     Mapped[float | None] = mapped_column(Float)
    luz:         Mapped[float | None] = mapped_column(Float)
    ntc_c:       Mapped[float | None] = mapped_column(Float)
    ntc_raw:     Mapped[int | None]   = mapped_column(Integer)
    peso_g:      Mapped[float | None] = mapped_column(Float)
