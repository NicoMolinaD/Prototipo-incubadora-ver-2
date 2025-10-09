from pydantic import BaseModel
import os


class Settings(BaseModel):
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_user: str = os.getenv("POSTGRES_USER", "incu")
    db_pass: str = os.getenv("POSTGRES_PASSWORD", "incu_pass")
    db_name: str = os.getenv("POSTGRES_DB", "incu_db")
    api_key: str = os.getenv("API_KEY", "dev_key")
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")


    @property
    def db_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_pass}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()