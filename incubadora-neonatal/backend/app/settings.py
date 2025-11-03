# backend/app/settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # Lee el .env y NO falle si hay claves extra
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

    # DB
    database_url: str = Field(
        default="postgresql+psycopg2://incu:incu123@db:5432/incubadora",
        alias="DATABASE_URL",
    )

    # CORS (el main.py espera esta propiedad con este nombre)
    CORS_ALLOW_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="CORS_ALLOW_ORIGINS",
    )

    # Estas dos están en tu .env; las declaramos para evitar ValidationError
    COLLECT_PERIOD_MS: int = Field(default=2000, alias="COLLECT_PERIOD_MS")
    ESP32_DEVICES: str = Field(default="", alias="ESP32_DEVICES")

settings = Settings()
