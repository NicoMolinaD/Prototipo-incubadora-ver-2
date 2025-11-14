#!/bin/bash
# Script completo de diagnóstico y solución de problemas

set -e

ROOT_DIR="$(dirname "$0")/.."
ENV_FILE="${ROOT_DIR}/.env"
COMPOSE_FILE="$(dirname "$0")/docker-compose.prod.yml"

echo "=========================================="
echo "Diagnóstico Completo del Sistema"
echo "=========================================="
echo ""

# Paso 1: Verificar archivo .env
echo "1. Verificando archivo .env..."
if [ -f "${ENV_FILE}" ]; then
    echo "   ✓ Archivo .env existe: ${ENV_FILE}"
    echo ""
    echo "   Contenido actual:"
    cat "${ENV_FILE}" | sed 's/^/     /'
    echo ""
    
    # Verificar DATABASE_URL
    if grep -q "DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora" "${ENV_FILE}"; then
        echo "   ✓ DATABASE_URL está correcto"
    else
        echo "   ⚠️  DATABASE_URL no coincide con docker-compose"
        echo "   Corrigiendo..."
        # Actualizar solo DATABASE_URL
        if grep -q "DATABASE_URL=" "${ENV_FILE}"; then
            sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora|' "${ENV_FILE}"
        else
            echo "DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora" >> "${ENV_FILE}"
        fi
        echo "   ✓ DATABASE_URL corregido"
    fi
else
    echo "   ❌ Archivo .env NO existe"
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
fi
echo ""

# Paso 2: Verificar docker-compose
echo "2. Verificando docker-compose.prod.yml..."
if [ -f "${COMPOSE_FILE}" ]; then
    echo "   ✓ docker-compose.prod.yml existe"
    
    # Verificar configuración de la base de datos
    DB_USER=$(grep "POSTGRES_USER:" "${COMPOSE_FILE}" | awk '{print $2}' | tr -d '"' || echo "")
    DB_PASS=$(grep "POSTGRES_PASSWORD:" "${COMPOSE_FILE}" | awk '{print $2}' | tr -d '"' || echo "")
    DB_NAME=$(grep "POSTGRES_DB:" "${COMPOSE_FILE}" | awk '{print $2}' | tr -d '"' || echo "")
    
    echo "   Configuración de BD en docker-compose:"
    echo "     Usuario: ${DB_USER}"
    echo "     Contraseña: ${DB_PASS}"
    echo "     Base de datos: ${DB_NAME}"
    
    if [ "$DB_USER" = "incubadora" ] && [ "$DB_PASS" = "incubadora" ] && [ "$DB_NAME" = "incubadora" ]; then
        echo "   ✓ Configuración de BD es correcta"
    else
        echo "   ⚠️  Configuración de BD no coincide con lo esperado"
    fi
else
    echo "   ❌ docker-compose.prod.yml NO existe"
fi
echo ""

# Paso 3: Verificar contenedores
echo "3. Verificando contenedores Docker..."
if command -v docker &> /dev/null; then
    # Verificar base de datos
    DB_CONTAINER=$(docker ps -a --filter "name=db" --format "{{.Names}}" | head -n1)
    if [ -n "$DB_CONTAINER" ]; then
        DB_STATUS=$(docker inspect --format='{{.State.Status}}' "${DB_CONTAINER}" 2>/dev/null || echo "unknown")
        echo "   Contenedor DB: ${DB_CONTAINER} (${DB_STATUS})"
        
        if [ "$DB_STATUS" != "running" ]; then
            echo "   ⚠️  Base de datos no está corriendo"
            echo "   Iniciando base de datos..."
            cd "$(dirname "$0")"
            docker compose -f docker-compose.prod.yml up -d db
            echo "   Esperando 5 segundos para que la BD inicie..."
            sleep 5
        else
            echo "   ✓ Base de datos está corriendo"
        fi
    else
        echo "   ⚠️  No se encontró contenedor de base de datos"
    fi
    
    # Verificar API
    API_CONTAINER=$(docker ps -a --filter "name=api" --format "{{.Names}}" | head -n1)
    if [ -n "$API_CONTAINER" ]; then
        API_STATUS=$(docker inspect --format='{{.State.Status}}' "${API_CONTAINER}" 2>/dev/null || echo "unknown")
        echo "   Contenedor API: ${API_CONTAINER} (${API_STATUS})"
    else
        echo "   ⚠️  No se encontró contenedor de API"
    fi
else
    echo "   ⚠️  Docker no está disponible"
fi
echo ""

# Paso 4: Probar conexión a la base de datos
echo "4. Probando conexión a la base de datos..."
if [ -n "$DB_CONTAINER" ] && [ "$DB_STATUS" = "running" ]; then
    # Intentar conectarse con las credenciales correctas
    if docker exec "${DB_CONTAINER}" psql -U incubadora -d incubadora -c "SELECT 1;" > /dev/null 2>&1; then
        echo "   ✓ Conexión exitosa con usuario 'incubadora'"
    else
        echo "   ❌ No se pudo conectar con usuario 'incubadora'"
        echo "   Esto puede significar que:"
        echo "     - Las credenciales en la BD no coinciden"
        echo "     - La BD necesita ser recreada"
        echo ""
        echo "   Opción: Recrear la base de datos"
        read -p "   ¿Deseas recrear la base de datos? (s/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            echo "   Deteniendo servicios..."
            cd "$(dirname "$0")"
            docker compose -f docker-compose.prod.yml down
            echo "   Eliminando volumen de BD..."
            docker volume rm incubadora-neonatal_db_data 2>/dev/null || true
            echo "   Iniciando servicios..."
            docker compose -f docker-compose.prod.yml up -d db
            echo "   Esperando 10 segundos para que la BD inicie..."
            sleep 10
            echo "   ✓ Base de datos recreada"
        fi
    fi
fi
echo ""

# Paso 5: Verificar variables de entorno en el contenedor API
echo "5. Verificando variables de entorno en el contenedor API..."
if [ -n "$API_CONTAINER" ]; then
    API_DB_URL=$(docker exec "${API_CONTAINER}" env | grep DATABASE_URL || echo "")
    if [ -n "$API_DB_URL" ]; then
        echo "   DATABASE_URL en contenedor:"
        echo "     ${API_DB_URL}" | sed 's/^/     /'
        
        if echo "$API_DB_URL" | grep -q "incubadora:incubadora@db:5432/incubadora"; then
            echo "   ✓ DATABASE_URL es correcto en el contenedor"
        else
            echo "   ⚠️  DATABASE_URL no es correcto en el contenedor"
            echo "   Necesitas reconstruir el contenedor API"
        fi
    else
        echo "   ⚠️  DATABASE_URL no está definido en el contenedor"
        echo "   El archivo .env no se está cargando correctamente"
    fi
fi
echo ""

echo "=========================================="
echo "RECOMENDACIONES"
echo "=========================================="
echo ""
echo "Si el problema persiste, ejecuta estos comandos:"
echo ""
echo "1. Detener todos los servicios:"
echo "   cd ~/Prototipo-incubadora-ver-2/incubadora-neonatal/ops"
echo "   docker compose -f docker-compose.prod.yml down"
echo ""
echo "2. Eliminar el volumen de la base de datos (¡CUIDADO! Esto borra los datos):"
echo "   docker volume rm incubadora-neonatal_db_data"
echo ""
echo "3. Reconstruir y reiniciar:"
echo "   docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "4. Verificar logs:"
echo "   docker compose -f docker-compose.prod.yml logs api"
echo ""

