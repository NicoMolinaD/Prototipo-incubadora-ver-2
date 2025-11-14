#!/bin/bash
# Script para reiniciar todo el sistema desde cero

set -e

ROOT_DIR="$(dirname "$0")/.."
ENV_FILE="${ROOT_DIR}/.env"
COMPOSE_FILE="$(dirname "$0")/docker-compose.prod.yml"

echo "=========================================="
echo "Reinicio Completo del Sistema"
echo "=========================================="
echo ""

# Asegurar que el .env existe y está correcto
echo "1. Verificando archivo .env..."
if [ ! -f "${ENV_FILE}" ]; then
    echo "   Creando archivo .env..."
    cat > "${ENV_FILE}" << 'EOF'
DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora
CORS_ORIGINS=https://marsupia.online,https://www.marsupia.online,http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,ionic://localhost,http://localhost
SECRET_KEY=your-secret-key-change-in-production-use-env-var
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ESP32_DEVICES=
COLLECT_PERIOD_MS=5000
API_TITLE=Incubadora API
API_VERSION=v0.1.0
EOF
    echo "   ✓ Archivo .env creado"
else
    # Asegurar que DATABASE_URL es correcto
    if ! grep -q "DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora" "${ENV_FILE}"; then
        echo "   Corrigiendo DATABASE_URL..."
        if grep -q "DATABASE_URL=" "${ENV_FILE}"; then
            sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora|' "${ENV_FILE}"
        else
            echo "DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora" >> "${ENV_FILE}"
        fi
        echo "   ✓ DATABASE_URL corregido"
    else
        echo "   ✓ Archivo .env está correcto"
    fi
fi
echo ""

# Detener todos los servicios
echo "2. Deteniendo todos los servicios..."
cd "$(dirname "$0")"
docker compose -f docker-compose.prod.yml down
echo "   ✓ Servicios detenidos"
echo ""

# Preguntar si quiere eliminar el volumen de BD
read -p "3. ¿Deseas eliminar el volumen de la base de datos? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "   Eliminando volumen de BD..."
    docker volume rm incubadora-neonatal_db_data 2>/dev/null || true
    echo "   ✓ Volumen eliminado"
else
    echo "   Conservando volumen de BD"
fi
echo ""

# Reconstruir y reiniciar
echo "4. Reconstruyendo y reiniciando servicios..."
docker compose -f docker-compose.prod.yml up -d --build
echo "   ✓ Servicios iniciados"
echo ""

# Esperar a que la BD esté lista
echo "5. Esperando a que la base de datos esté lista..."
sleep 10

# Verificar estado
echo "6. Verificando estado de los servicios..."
docker compose -f docker-compose.prod.yml ps
echo ""

# Verificar logs de la API
echo "7. Últimas líneas de los logs de la API:"
docker compose -f docker-compose.prod.yml logs api --tail=20
echo ""

echo "=========================================="
echo "✅ Reinicio Completo Finalizado"
echo "=========================================="
echo ""
echo "Si hay errores, verifica:"
echo "  docker compose -f docker-compose.prod.yml logs api"
echo "  docker compose -f docker-compose.prod.yml logs db"
echo ""

