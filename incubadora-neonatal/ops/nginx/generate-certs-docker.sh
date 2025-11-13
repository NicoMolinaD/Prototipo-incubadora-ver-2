#!/bin/bash
# Script alternativo para generar certificados usando Docker
# Útil si OpenSSL no está instalado en el sistema

set -e

DOMAIN="${1:-localhost}"
CERT_DIR="$(dirname "$0")/certs"
DAYS_VALID=365

echo "Generando certificados SSL usando Docker para: $DOMAIN"
echo "Directorio de certificados: $CERT_DIR"

# Crear directorio si no existe
mkdir -p "$CERT_DIR"

# Usar imagen de Alpine con OpenSSL
docker run --rm -v "$(pwd)/$CERT_DIR:/certs" alpine/openssl sh -c "
    # Generar clave privada
    openssl genrsa -out /certs/privkey.pem 2048
    
    # Generar certificado autofirmado
    openssl req -new -x509 -key /certs/privkey.pem \
        -out /certs/fullchain.pem \
        -days $DAYS_VALID \
        -subj '/C=ES/ST=State/L=City/O=Incubadora/CN=$DOMAIN' \
        -addext 'subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1,IP:::1'
    
    # Ajustar permisos
    chmod 600 /certs/privkey.pem
    chmod 644 /certs/fullchain.pem
"

echo ""
echo "✓ Certificados generados exitosamente:"
echo "  - $CERT_DIR/privkey.pem"
echo "  - $CERT_DIR/fullchain.pem"
echo ""
echo "⚠️  NOTA: Estos son certificados autofirmados para desarrollo."
echo "   Los navegadores mostrarán una advertencia de seguridad."
echo "   Para producción, usa certificados de Let's Encrypt o un CA comercial."

