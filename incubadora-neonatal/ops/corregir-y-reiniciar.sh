#!/bin/bash
# Script para corregir el .env y reiniciar los servicios

set -e

ROOT_DIR="$(dirname "$0")/.."
ENV_FILE="${ROOT_DIR}/.env"
COMPOSE_FILE="$(dirname "$0")/docker-compose.prod.yml"

echo "=========================================="
echo "Corrección y Reinicio del Sistema"
echo "=========================================="
echo ""

# Paso 1: Corregir el archivo .env completamente
echo "1. Corrigiendo archivo .env..."
cat > "${ENV_FILE}" << 'EOF'
# Configuración de Base de Datos (debe coincidir con docker-compose.prod.yml)
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

echo "   ✓ Archivo .env corregido completamente"
echo ""
echo "   Contenido del archivo .env:"
cat "${ENV_FILE}" | sed 's/^/     /'
echo ""

# Paso 2: Verificar que docker-compose está correcto
echo "2. Verificando docker-compose.prod.yml..."
if [ -f "${COMPOSE_FILE}" ]; then
    echo "   ✓ docker-compose.prod.yml existe"
    
    # Verificar que apunta al .env correcto
    if grep -q "env_file:" "${COMPOSE_FILE}"; then
        ENV_PATH=$(grep -A1 "env_file:" "${COMPOSE_FILE}" | grep -v "env_file:" | head -n1 | awk '{print $2}' | tr -d '- ' || echo "")
        echo "   Ruta del .env en docker-compose: ${ENV_PATH}"
        echo "   Ruta real del .env: ../.env"
    fi
else
    echo "   ❌ docker-compose.prod.yml NO existe"
    exit 1
fi
echo ""

# Paso 3: Detener servicios existentes
echo "3. Deteniendo servicios existentes..."
cd "$(dirname "$0")"
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
echo "   ✓ Servicios detenidos"
echo ""

# Paso 4: Eliminar volumen de BD si existe (opcional)
read -p "4. ¿Deseas eliminar el volumen de la base de datos? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "   Eliminando volumen de BD..."
    docker volume rm incubadora-neonatal_db_data 2>/dev/null || \
    docker volume rm ops_db_data 2>/dev/null || true
    echo "   ✓ Volumen eliminado (si existía)"
else
    echo "   Conservando volumen de BD"
fi
echo ""

# Paso 5: Reconstruir y reiniciar
echo "5. Reconstruyendo y reiniciando servicios..."
docker compose -f docker-compose.prod.yml up -d --build
echo "   ✓ Servicios iniciados"
echo ""

# Paso 6: Esperar a que los servicios estén listos
echo "6. Esperando a que los servicios estén listos..."
echo "   Esperando 15 segundos..."
sleep 15
echo ""

# Paso 7: Verificar estado
echo "7. Verificando estado de los servicios..."
docker compose -f docker-compose.prod.yml ps
echo ""

# Paso 8: Verificar logs
echo "8. Verificando logs de la API (últimas 30 líneas)..."
docker compose -f docker-compose.prod.yml logs api --tail=30
echo ""

# Paso 9: Verificar conexión a BD
echo "9. Verificando conexión a la base de datos..."
DB_CONTAINER=$(docker ps --filter "name=db" --format "{{.Names}}" | head -n1)
if [ -n "$DB_CONTAINER" ]; then
    if docker exec "${DB_CONTAINER}" psql -U incubadora -d incubadora -c "SELECT 1;" > /dev/null 2>&1; then
        echo "   ✓ Conexión a la base de datos exitosa"
    else
        echo "   ⚠️  No se pudo conectar a la base de datos"
    fi
else
    echo "   ⚠️  Contenedor de BD no encontrado"
fi
echo ""

echo "=========================================="
echo "✅ Proceso Completado"
echo "=========================================="
echo ""
echo "Si hay errores, verifica:"
echo "  docker compose -f docker-compose.prod.yml logs api"
echo "  docker compose -f docker-compose.prod.yml logs db"
echo ""
echo "Para ver logs en tiempo real:"
echo "  docker compose -f docker-compose.prod.yml logs -f api"
echo ""

