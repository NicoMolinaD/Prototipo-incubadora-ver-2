#!/bin/bash
# Script para generar certificados SSL autofirmados usando Docker
# Útil cuando OpenSSL no está instalado en el sistema
# Uso: ./generate-certs-docker.sh [dominio]

set -e

DOMAIN="${1:-marsupia.online}"
CERT_DIR="$(dirname "$0")/certs"
SCRIPT_DIR="$(dirname "$0")"

echo "=========================================="
echo "Generación de Certificados SSL Autofirmados (Docker)"
echo "Dominio: ${DOMAIN}"
echo "=========================================="
echo ""

# Crear directorio de certificados si no existe
mkdir -p "$CERT_DIR"

# Usar imagen de Alpine con OpenSSL
echo "Generando certificados usando Docker..."
docker run --rm -v "${SCRIPT_DIR}/certs:/certs" alpine/openssl sh -c "
    # Generar clave privada
    openssl genrsa -out /certs/privkey.pem 2048
    
    # Generar certificado autofirmado
    openssl req -new -x509 -key /certs/privkey.pem \
        -out /certs/fullchain.pem \
        -days 365 \
        -subj '/C=ES/ST=State/L=City/O=Incubadora/CN=${DOMAIN}' \
        -addext 'subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN},DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1'
    
    # Ajustar permisos
    chmod 600 /certs/privkey.pem
    chmod 644 /certs/fullchain.pem
"

echo ""
echo "✓ Certificados generados exitosamente!"
echo ""
echo "Ubicación de los certificados:"
echo "  - ${CERT_DIR}/fullchain.pem"
echo "  - ${CERT_DIR}/privkey.pem"
echo ""
echo "⚠️  NOTA: Estos son certificados autofirmados para desarrollo."
echo "   Los navegadores mostrarán una advertencia de seguridad."
echo "   Para producción, usa certificados de Let's Encrypt con setup-letsencrypt.sh"
echo ""

