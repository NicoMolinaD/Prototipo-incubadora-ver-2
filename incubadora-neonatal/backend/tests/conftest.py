import os
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client():
    os.environ.setdefault("API_KEY", "test_key")
    return TestClient(app)