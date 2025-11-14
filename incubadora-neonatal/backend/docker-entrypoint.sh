#!/bin/bash
set -e

echo "[api] applying migrations"
alembic upgrade head || echo "[api] Warning: Migration failed, continuing anyway..."

echo "[api] starting uvicorn"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
