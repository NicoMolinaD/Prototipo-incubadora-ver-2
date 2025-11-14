#!/bin/bash
set -e

# Función para esperar a que la base de datos esté lista
wait_for_db() {
    echo "[api] Waiting for database to be ready..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if python << EOF 2>/dev/null
import sys
try:
    from sqlalchemy import create_engine, text
    from app.settings import settings
    
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    sys.exit(0)
except Exception as e:
    sys.exit(1)
EOF
        then
            echo "[api] Database is ready!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo "[api] Attempt $attempt/$max_attempts: Database not ready, waiting 2 seconds..."
        sleep 2
    done
    
    echo "[api] ERROR: Database did not become ready after $max_attempts attempts"
    return 1
}

# Esperar a que la base de datos esté lista
wait_for_db

echo "[api] Applying migrations..."
alembic upgrade head || echo "[api] Warning: Migration failed, continuing anyway..."

echo "[api] Starting uvicorn"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
