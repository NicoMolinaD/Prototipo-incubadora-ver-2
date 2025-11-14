#!/bin/bash
# Script para crear el archivo .env en la raíz del proyecto

set -e

ENV_FILE=".env"

echo "=========================================="
echo "Configuración del archivo .env"
echo "=========================================="
echo ""

if [ -f "${ENV_FILE}" ]; then
    echo "⚠️  El archivo .env ya existe."
    read -p "¿Deseas sobrescribirlo? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Operación cancelada."
        exit 0
    fi
fi

cat > "${ENV_FILE}" << 'EOF'
# Configuración de Base de Datos (debe coincidir con docker-compose.yml)
DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora

# CORS - Orígenes permitidos (incluye el dominio de producción)
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

echo "✓ Archivo .env creado exitosamente en: $(pwd)/${ENV_FILE}"
echo ""
echo "Contenido del archivo:"
cat "${ENV_FILE}" | sed 's/^/  /'
echo ""

