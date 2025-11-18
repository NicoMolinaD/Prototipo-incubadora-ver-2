#!/bin/bash
# Script para copiar certificados existentes de Let's Encrypt al directorio del proyecto
# Útil cuando los certificados ya existen pero no están en el directorio correcto

set -e

DOMAIN="marsupia.online"
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"
LETSENCRYPT_ARCHIVE="/etc/letsencrypt/archive/${DOMAIN}"

echo "=========================================="
echo "Copiando Certificados SSL Existentes"
echo "Dominio: ${DOMAIN}"
echo "=========================================="
echo ""

# Buscar certificados en live/ primero, luego en archive/
CERT_FOUND=false
LETSENCRYPT_FULLCHAIN=""
LETSENCRYPT_PRIVKEY=""

if [ -f "${LETSENCRYPT_DIR}/fullchain.pem" ] && [ -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    CERT_FOUND=true
    LETSENCRYPT_FULLCHAIN="${LETSENCRYPT_DIR}/fullchain.pem"
    LETSENCRYPT_PRIVKEY="${LETSENCRYPT_DIR}/privkey.pem"
    echo "Certificados encontrados en: ${LETSENCRYPT_DIR}"
elif [ -d "${LETSENCRYPT_ARCHIVE}" ]; then
    # Buscar el certificado más reciente en archive
    # Let's Encrypt guarda los archivos como cert1.pem, cert2.pem, etc.
    # Necesitamos construir fullchain.pem desde cert.pem + chain.pem
    LATEST_CERT=$(ls -t "${LETSENCRYPT_ARCHIVE}/cert"*.pem 2>/dev/null | head -n1)
    LATEST_CHAIN=$(ls -t "${LETSENCRYPT_ARCHIVE}/chain"*.pem 2>/dev/null | head -n1)
    LATEST_KEY=$(ls -t "${LETSENCRYPT_ARCHIVE}/privkey"*.pem 2>/dev/null | head -n1)
    LATEST_FULLCHAIN=$(ls -t "${LETSENCRYPT_ARCHIVE}/fullchain"*.pem 2>/dev/null | head -n1)
    
    if [ -n "$LATEST_KEY" ]; then
        CERT_FOUND=true
        LETSENCRYPT_PRIVKEY="$LATEST_KEY"
        
        # Si existe fullchain, usarlo; si no, construir desde cert + chain
        if [ -n "$LATEST_FULLCHAIN" ]; then
            LETSENCRYPT_FULLCHAIN="$LATEST_FULLCHAIN"
            echo "Certificados encontrados en: ${LETSENCRYPT_ARCHIVE}"
            echo "  - ${LETSENCRYPT_FULLCHAIN}"
            echo "  - ${LETSENCRYPT_PRIVKEY}"
        elif [ -n "$LATEST_CERT" ] && [ -n "$LATEST_CHAIN" ]; then
            # Construir fullchain temporalmente
            TEMP_FULLCHAIN=$(mktemp)
            cat "$LATEST_CERT" "$LATEST_CHAIN" > "$TEMP_FULLCHAIN"
            LETSENCRYPT_FULLCHAIN="$TEMP_FULLCHAIN"
            echo "Certificados encontrados en: ${LETSENCRYPT_ARCHIVE}"
            echo "  - Construyendo fullchain desde cert + chain"
            echo "  - ${LETSENCRYPT_PRIVKEY}"
        else
            CERT_FOUND=false
        fi
    fi
fi

if [ "$CERT_FOUND" = false ]; then
    echo "ERROR: Los certificados no se encuentran en Let's Encrypt"
    echo ""
    echo "Buscados en:"
    echo "  - ${LETSENCRYPT_DIR}/"
    echo "  - ${LETSENCRYPT_ARCHIVE}/"
    echo ""
    echo "Si los certificados no existen, ejecuta primero:"
    echo "  ./setup-letsencrypt.sh tu-email@ejemplo.com"
    exit 1
fi

# Crear directorio de certificados si no existe
mkdir -p "$CERT_DIR"

# Copiar certificados al directorio del proyecto
echo ""
echo "Copiando certificados al directorio del proyecto..."
if [ "${LETSENCRYPT_FULLCHAIN}" != "${LETSENCRYPT_FULLCHAIN#/tmp}" ]; then
    # Es un archivo temporal, copiarlo directamente
    sudo cp "${LETSENCRYPT_FULLCHAIN}" "${CERT_DIR}/fullchain.pem"
    rm -f "${LETSENCRYPT_FULLCHAIN}"
else
    sudo cp "${LETSENCRYPT_FULLCHAIN}" "${CERT_DIR}/fullchain.pem"
fi
sudo cp "${LETSENCRYPT_PRIVKEY}" "${CERT_DIR}/privkey.pem"

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

