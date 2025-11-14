#!/bin/bash
# Script para forzar la creación de nuevos certificados de Let's Encrypt

set -e

DOMAIN="marsupia.online"
EMAIL="nicolas-0413@hotmail.com"
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "=========================================="
echo "Forzando Creación de Nuevos Certificados"
echo "Dominio: ${DOMAIN}"
echo "=========================================="
echo ""

# Verificar que nginx está detenido
echo "Verificando que nginx está detenido..."
if command -v docker &> /dev/null; then
    if [ -f "../../ops/docker-compose.prod.yml" ]; then
        docker compose -f ../../ops/docker-compose.prod.yml stop nginx 2>/dev/null || true
    elif [ -f "../docker-compose.prod.yml" ]; then
        docker compose -f ../docker-compose.prod.yml stop nginx 2>/dev/null || true
    fi
    echo "✓ Nginx detenido"
    sleep 2
fi
echo ""

# Verificar puerto 80
echo "Verificando puerto 80..."
if command -v netstat &> /dev/null; then
    PORT_80_IN_USE=$(sudo netstat -tlnp 2>/dev/null | grep ':80 ' || echo "")
    if [ -n "$PORT_80_IN_USE" ]; then
        echo "⚠️  ADVERTENCIA: El puerto 80 está en uso"
        echo "   $PORT_80_IN_USE"
    else
        echo "✓ Puerto 80 está libre"
    fi
fi
echo ""

# Opción 1: Intentar renovar forzando
echo "Opción 1: Intentando renovar certificados existentes (forzado)..."
sudo certbot certonly --standalone \
    --force-renewal \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    --preferred-challenges http \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

# Verificar si se renovaron
if [ -f "${LETSENCRYPT_DIR}/fullchain.pem" ] && [ -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    echo ""
    echo "✓ Certificados renovados exitosamente"
    
    # Copiar al directorio del proyecto
    echo ""
    echo "Copiando certificados..."
    mkdir -p "$CERT_DIR"
    sudo cp "${LETSENCRYPT_DIR}/fullchain.pem" "${CERT_DIR}/"
    sudo cp "${LETSENCRYPT_DIR}/privkey.pem" "${CERT_DIR}/"
    
    # Ajustar permisos
    sudo chmod 644 "${CERT_DIR}/fullchain.pem"
    sudo chmod 600 "${CERT_DIR}/privkey.pem"
    sudo chown $USER:$USER "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" 2>/dev/null || true
    
    echo "✓ Certificados copiados"
    echo ""
    
    # Verificar
    if command -v openssl &> /dev/null; then
        CERT_ISSUER=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -issuer 2>/dev/null | sed 's/issuer=//')
        if echo "$CERT_ISSUER" | grep -q "Let's Encrypt"; then
            echo "✓ Certificado válido de Let's Encrypt"
        fi
    fi
    
    echo ""
    echo "=========================================="
    echo "✅ Certificados Renovados y Copiados"
    echo "=========================================="
    exit 0
fi

echo ""
echo "La renovación forzada no funcionó. Intentando crear certificados nuevos..."
echo ""

# Opción 2: Eliminar certificados existentes y crear nuevos
read -p "¿Deseas eliminar los certificados existentes y crear nuevos? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Operación cancelada."
    exit 1
fi

echo "Eliminando certificados existentes..."
sudo certbot delete --cert-name "${DOMAIN}" --non-interactive 2>/dev/null || true
echo ""

echo "Creando nuevos certificados..."
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    --preferred-challenges http \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

# Verificar
if [ ! -f "${LETSENCRYPT_DIR}/fullchain.pem" ] || [ ! -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    echo ""
    echo "❌ Error: Los certificados no se crearon correctamente."
    echo "Revisa los logs: /var/log/letsencrypt/letsencrypt.log"
    exit 1
fi

# Copiar
echo ""
echo "Copiando certificados..."
mkdir -p "$CERT_DIR"
sudo cp "${LETSENCRYPT_DIR}/fullchain.pem" "${CERT_DIR}/"
sudo cp "${LETSENCRYPT_DIR}/privkey.pem" "${CERT_DIR}/"

# Ajustar permisos
sudo chmod 644 "${CERT_DIR}/fullchain.pem"
sudo chmod 600 "${CERT_DIR}/privkey.pem"
sudo chown $USER:$USER "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" 2>/dev/null || true

echo "✓ Certificados creados y copiados"
echo ""

echo "=========================================="
echo "✅ Nuevos Certificados Creados"
echo "=========================================="
echo ""
echo "Próximo paso: Reinicia nginx"
echo "  cd ~/Prototipo-incubadora-ver-2/incubadora-neonatal/ops"
echo "  docker compose -f docker-compose.prod.yml up -d nginx"
echo ""

