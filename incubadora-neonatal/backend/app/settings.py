# app/settings.py
from __future__ import annotations
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
import json

class Settings(BaseSettings):
    # pydantic v2: evitar conflictos con "model_"
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    # basicos
    api_title: str = "Incubadora API"
    api_version: str = "v0.1.0"
    database_url: str = "postgresql+psycopg2://incu:incu@db:5432/incu"

    # info de modelo (para /models)
    model_name: str = "demo"
    model_ver: str = "v0.0.1"

    # IMPORTANTE: string crudo; lo convertimos a lista nosotros
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ---- helpers seguros ----
    @property
    def cors_list(self) -> List[str]:
        raw = (self.cors_origins or "").strip()
        if not raw:
            return []
        if raw.startswith("["):
            try:
                data = json.loads(raw)
                return [str(x).strip() for x in data if str(x).strip()]
            except Exception:
                pass
        return [x.strip() for x in raw.split(",") if x.strip()]

    # ---- alias para compatibilidad con codigo que usa settings.version / settings.name ----
    @property
    def version(self) -> str:  # alias para api_version
        return self.api_version

    @property
    def name(self) -> str:     # alias para api_title
        return self.api_title

settings = Settings()
