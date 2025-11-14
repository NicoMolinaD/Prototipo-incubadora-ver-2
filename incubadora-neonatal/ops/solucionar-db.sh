#!/bin/bash
# Script para solucionar el problema de conexión a la base de datos

set -e

BACKEND_DIR="$(dirname "$0")/../backend"
ROOT_DIR="$(dirname "$0")/.."
ENV_FILE_BACKEND="${BACKEND_DIR}/.env"
ENV_FILE_ROOT="${ROOT_DIR}/.env"

echo "=========================================="
echo "Solución de Problema de Base de Datos"
echo "=========================================="
echo ""

# Verificar qué archivo .env existe
echo "1. Verificando archivos .env..."
if [ -f "${ENV_FILE_BACKEND}" ]; then
    echo "   ✓ Existe: ${ENV_FILE_BACKEND}"
    ENV_FILE="${ENV_FILE_BACKEND}"
elif [ -f "${ENV_FILE_ROOT}" ]; then
    echo "   ✓ Existe: ${ENV_FILE_ROOT}"
    ENV_FILE="${ENV_FILE_ROOT}"
else
    echo "   ⚠️  No se encontró archivo .env"
    echo "   Creando: ${ENV_FILE_BACKEND}"
    ENV_FILE="${ENV_FILE_BACKEND}"
fi
echo ""

# Crear o actualizar el archivo .env
echo "2. Configurando DATABASE_URL..."
cat > "${ENV_FILE}" << 'EOF'
# Configuración del Backend - Producción
# Base de datos (debe coincidir con docker-compose.prod.yml)
DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora

# CORS - Orígenes permitidos
CORS_ORIGINS=https://marsupia.online,https://www.marsupia.online,http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,ionic://localhost,http://localhost

# JWT Secret Key
SECRET_KEY=your-secret-key-change-in-production-use-env-var
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Collector (opcional)
ESP32_DEVICES=
COLLECT_PERIOD_MS=5000

# API Info
API_TITLE=Incubadora API
API_VERSION=v0.1.0
EOF

echo "   ✓ Archivo .env creado/actualizado: ${ENV_FILE}"
echo ""

# Verificar el contenido
echo "3. Verificando configuración..."
if grep -q "DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora" "${ENV_FILE}"; then
    echo "   ✓ DATABASE_URL está correcto"
else
    echo "   ⚠️  DATABASE_URL no coincide"
fi

if grep -q "CORS_ORIGINS=https://marsupia.online" "${ENV_FILE}"; then
    echo "   ✓ CORS_ORIGINS incluye marsupia.online"
else
    echo "   ⚠️  CORS_ORIGINS no incluye marsupia.online"
fi
echo ""

# Verificar que docker-compose.prod.yml apunta al .env correcto
echo "4. Verificando docker-compose.prod.yml..."
COMPOSE_FILE="$(dirname "$0")/docker-compose.prod.yml"
if [ -f "${COMPOSE_FILE}" ]; then
    if grep -q "env_file:" "${COMPOSE_FILE}"; then
        echo "   ✓ docker-compose.prod.yml tiene env_file configurado"
        echo "   Ubicación del .env según docker-compose:"
        grep -A1 "env_file:" "${COMPOSE_FILE}" | grep -v "env_file:" | sed 's/^/     /'
    else
        echo "   ⚠️  docker-compose.prod.yml no tiene env_file configurado"
    fi
fi
echo ""

# Verificar que la base de datos está corriendo
echo "5. Verificando que la base de datos está corriendo..."
if command -v docker &> /dev/null; then
    DB_CONTAINER=$(docker ps --filter "name=db" --format "{{.Names}}" | head -n1)
    if [ -n "$DB_CONTAINER" ]; then
        echo "   ✓ Contenedor de base de datos encontrado: ${DB_CONTAINER}"
        
        # Verificar que está corriendo
        DB_STATUS=$(docker inspect --format='{{.State.Status}}' "${DB_CONTAINER}" 2>/dev/null || echo "unknown")
        echo "   Estado: ${DB_STATUS}"
        
        if [ "$DB_STATUS" = "running" ]; then
            echo "   ✓ Base de datos está corriendo"
        else
            echo "   ⚠️  Base de datos no está corriendo"
        fi
    else
        echo "   ⚠️  No se encontró contenedor de base de datos"
    fi
fi
echo ""

echo "=========================================="
echo "RESUMEN"
echo "=========================================="
echo ""
echo "Archivo .env configurado en: ${ENV_FILE}"
echo ""
echo "Configuración de base de datos:"
echo "  Usuario: incubadora"
echo "  Contraseña: incubadora"
echo "  Base de datos: incubadora"
echo "  Host: db (nombre del servicio en docker-compose)"
echo ""
echo "Próximos pasos:"
echo "1. Reinicia la API:"
echo "   cd ~/Prototipo-incubadora-ver-2/incubadora-neonatal/ops"
echo "   docker compose -f docker-compose.prod.yml restart api"
echo ""
echo "2. Verifica los logs:"
echo "   docker compose -f docker-compose.prod.yml logs api"
echo ""
echo "3. Si el problema persiste, reconstruye:"
echo "   docker compose -f docker-compose.prod.yml up -d --build api"
echo ""

