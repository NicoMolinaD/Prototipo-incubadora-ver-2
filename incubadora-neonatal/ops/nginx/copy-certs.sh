#!/bin/bash
# Script para copiar certificados existentes de Let's Encrypt al directorio del proyecto
# Útil cuando los certificados ya existen pero no están en el directorio correcto

set -e

DOMAIN="marsupia.online"
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "=========================================="
echo "Copiando Certificados SSL Existentes"
echo "Dominio: ${DOMAIN}"
echo "=========================================="
echo ""

# Verificar que los certificados existen en Let's Encrypt
if [ ! -f "${LETSENCRYPT_DIR}/fullchain.pem" ] || [ ! -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    echo "ERROR: Los certificados no se encuentran en ${LETSENCRYPT_DIR}"
    echo ""
    echo "Los certificados deben estar en:"
    echo "  - ${LETSENCRYPT_DIR}/fullchain.pem"
    echo "  - ${LETSENCRYPT_DIR}/privkey.pem"
    echo ""
    echo "Si los certificados no existen, ejecuta primero:"
    echo "  ./setup-letsencrypt.sh tu-email@ejemplo.com"
    exit 1
fi

# Crear directorio de certificados si no existe
mkdir -p "$CERT_DIR"

# Copiar certificados al directorio del proyecto
echo "Copiando certificados al directorio del proyecto..."
sudo cp "${LETSENCRYPT_DIR}/fullchain.pem" "${CERT_DIR}/"
sudo cp "${LETSENCRYPT_DIR}/privkey.pem" "${CERT_DIR}/"

# Ajustar permisos
sudo chmod 644 "${CERT_DIR}/fullchain.pem"
sudo chmod 600 "${CERT_DIR}/privkey.pem"
sudo chown $USER:$USER "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" 2>/dev/null || true

echo ""
echo "✓ Certificados copiados exitosamente!"
echo ""
echo "Ubicación de los certificados:"
echo "  - ${CERT_DIR}/fullchain.pem"
echo "  - ${CERT_DIR}/privkey.pem"
echo ""
echo "Ahora puedes iniciar nginx con:"
echo "  cd ../../ && docker compose up -d nginx"
echo ""

