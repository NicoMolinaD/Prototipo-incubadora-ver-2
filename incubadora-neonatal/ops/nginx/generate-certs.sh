#!/bin/bash
# Script para generar certificados SSL autofirmados para desarrollo
# Uso: ./generate-certs.sh [dominio]
# Si no se proporciona dominio, se usa 'localhost'

set -e

DOMAIN="${1:-localhost}"
CERT_DIR="$(dirname "$0")/certs"
DAYS_VALID=365

echo "Generando certificados SSL autofirmados para: $DOMAIN"
echo "Directorio de certificados: $CERT_DIR"

# Crear directorio si no existe
mkdir -p "$CERT_DIR"

# Generar clave privada
echo "Generando clave privada..."
openssl genrsa -out "$CERT_DIR/privkey.pem" 2048

# Generar certificado autofirmado
echo "Generando certificado autofirmado..."
openssl req -new -x509 -key "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -days $DAYS_VALID \
    -subj "/C=ES/ST=State/L=City/O=Incubadora/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1,IP:::1"

# Ajustar permisos
chmod 600 "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"

echo ""
echo "✓ Certificados generados exitosamente:"
echo "  - $CERT_DIR/privkey.pem"
echo "  - $CERT_DIR/fullchain.pem"
echo ""
echo "⚠️  NOTA: Estos son certificados autofirmados para desarrollo."
echo "   Los navegadores mostrarán una advertencia de seguridad."
echo "   Para producción, usa certificados de Let's Encrypt o un CA comercial."

