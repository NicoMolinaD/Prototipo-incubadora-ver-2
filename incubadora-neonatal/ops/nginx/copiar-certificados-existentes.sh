#!/bin/bash
# Script para copiar certificados existentes de Let's Encrypt al directorio del proyecto

set -e

DOMAIN="marsupia.online"
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "=========================================="
echo "Copiando Certificados Existentes de Let's Encrypt"
echo "Dominio: ${DOMAIN}"
echo "=========================================="
echo ""

# Verificar si existen certificados de Let's Encrypt
if [ ! -d "${LETSENCRYPT_DIR}" ]; then
    echo "❌ No se encontraron certificados de Let's Encrypt en:"
    echo "   ${LETSENCRYPT_DIR}"
    echo ""
    echo "Opciones:"
    echo "1. Forzar la creación de nuevos certificados:"
    echo "   sudo certbot certonly --standalone --force-renewal -d ${DOMAIN} -d www.${DOMAIN}"
    echo ""
    echo "2. O crear certificados nuevos desde cero:"
    echo "   sudo certbot delete --cert-name ${DOMAIN}"
    echo "   sudo certbot certonly --standalone -d ${DOMAIN} -d www.${DOMAIN}"
    exit 1
fi

echo "✓ Certificados encontrados en: ${LETSENCRYPT_DIR}"
echo ""

# Verificar que los archivos existen
if [ ! -f "${LETSENCRYPT_DIR}/fullchain.pem" ]; then
    echo "❌ No se encontró fullchain.pem"
    exit 1
fi

if [ ! -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    echo "❌ No se encontró privkey.pem"
    exit 1
fi

echo "✓ Archivos de certificados encontrados"
echo ""

# Crear directorio si no existe
mkdir -p "$CERT_DIR"

# Hacer backup de certificados antiguos
echo "Haciendo backup de certificados antiguos..."
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
    cp "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/fullchain.pem.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
fi
if [ -f "${CERT_DIR}/privkey.pem" ]; then
    cp "${CERT_DIR}/privkey.pem" "${CERT_DIR}/privkey.pem.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
fi
echo ""

# Copiar certificados
echo "Copiando certificados..."
sudo cp "${LETSENCRYPT_DIR}/fullchain.pem" "${CERT_DIR}/"
sudo cp "${LETSENCRYPT_DIR}/privkey.pem" "${CERT_DIR}/"

# Ajustar permisos
sudo chmod 644 "${CERT_DIR}/fullchain.pem"
sudo chmod 600 "${CERT_DIR}/privkey.pem"
sudo chown $USER:$USER "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" 2>/dev/null || true

echo "✓ Certificados copiados"
echo ""

# Verificar certificados
echo "Verificando certificados copiados..."
if command -v openssl &> /dev/null; then
    CERT_SUBJECT=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -subject 2>/dev/null | sed 's/subject=//')
    CERT_ISSUER=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -issuer 2>/dev/null | sed 's/issuer=//')
    
    echo "   Subject: ${CERT_SUBJECT}"
    echo "   Issuer: ${CERT_ISSUER}"
    
    if echo "$CERT_ISSUER" | grep -q "Let's Encrypt"; then
        echo "   ✓ Certificado válido de Let's Encrypt"
    else
        echo "   ⚠️  El certificado no parece ser de Let's Encrypt"
    fi
    
    # Verificar fechas
    CERT_DATES=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -dates 2>/dev/null)
    echo ""
    echo "   Fechas:"
    echo "$CERT_DATES" | sed 's/^/     /'
    
    # Verificar que incluye el dominio
    CERT_SAN=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | grep -o "DNS:.*" | head -n1 || echo "")
    if echo "$CERT_SAN" | grep -q "${DOMAIN}"; then
        echo ""
        echo "   ✓ El certificado incluye ${DOMAIN}"
    fi
fi
echo ""

echo "=========================================="
echo "✅ Certificados Copiados Exitosamente"
echo "=========================================="
echo ""
echo "Ubicación:"
echo "  - ${CERT_DIR}/fullchain.pem"
echo "  - ${CERT_DIR}/privkey.pem"
echo ""
echo "Próximo paso: Reinicia nginx"
echo "  cd ~/Prototipo-incubadora-ver-2/incubadora-neonatal/ops"
echo "  docker compose -f docker-compose.prod.yml up -d nginx"
echo ""

