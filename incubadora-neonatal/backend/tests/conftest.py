"""
Fixtures y configuracion para las pruebas del backend.

Sobrecarga el modulo 'app.db.get_db' para usar una base de datos SQLite en memoria
y ajusta 'sys.path' para que Python encuentre el paquete local 'app'.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Inserta la carpeta `backend` en sys.path para priorizar el módulo local `app`
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import app  # importa la FastAPI del proyecto
from app.db import get_db
from app.models import Base

# Crea una base de datos SQLite temporal para las pruebas
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)

# Asegúrate de que las tablas existen
Base.metadata.create_all(bind=engine)

def override_get_db():
    """Sustituye la dependencia get_db de FastAPI para usar la BD de pruebas."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Aplica la sobrecarga en la aplicacion
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def client():
    """
    Devuelve un TestClient de FastAPI configurado con la BD de pruebas.
    """
    with TestClient(app) as c:
        yield c
