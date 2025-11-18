#!/bin/bash
# Script para diagnosticar y copiar certificados de Let's Encrypt
# Este script verifica dónde están los certificados y los copia correctamente

set -e

DOMAIN="marsupia.online"
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"
LETSENCRYPT_ARCHIVE="/etc/letsencrypt/archive/${DOMAIN}"

echo "=========================================="
echo "Diagnóstico y Copia de Certificados SSL"
echo "Dominio: ${DOMAIN}"
echo "=========================================="
echo ""

# Verificar qué existe (usando sudo para verificar)
echo "1. Verificando directorios de Let's Encrypt..."
if sudo test -d "${LETSENCRYPT_DIR}"; then
    echo "   ✓ Directorio live/ existe: ${LETSENCRYPT_DIR}"
    sudo ls -la "${LETSENCRYPT_DIR}" 2>/dev/null | head -10 || echo "   (sin permisos)"
else
    echo "   ✗ Directorio live/ NO existe: ${LETSENCRYPT_DIR}"
fi

if sudo test -d "${LETSENCRYPT_ARCHIVE}"; then
    echo "   ✓ Directorio archive/ existe: ${LETSENCRYPT_ARCHIVE}"
    echo "   Archivos en archive/:"
    sudo ls -la "${LETSENCRYPT_ARCHIVE}" 2>/dev/null | head -20 || echo "   (sin permisos)"
else
    echo "   ✗ Directorio archive/ NO existe: ${LETSENCRYPT_ARCHIVE}"
fi

echo ""

# Buscar certificados
CERT_FOUND=false
FULLCHAIN_SOURCE=""
PRIVKEY_SOURCE=""

# Opción 1: Buscar en live/ (enlaces simbólicos) - usar sudo para verificar
if sudo test -f "${LETSENCRYPT_DIR}/fullchain.pem" && sudo test -f "${LETSENCRYPT_DIR}/privkey.pem"; then
    CERT_FOUND=true
    FULLCHAIN_SOURCE="${LETSENCRYPT_DIR}/fullchain.pem"
    PRIVKEY_SOURCE="${LETSENCRYPT_DIR}/privkey.pem"
    echo "2. ✓ Certificados encontrados en live/"
elif sudo test -d "${LETSENCRYPT_ARCHIVE}"; then
    echo "2. Buscando certificados en archive/..."
    
    # Buscar archivos más recientes
    LATEST_CERT=$(sudo ls -t "${LETSENCRYPT_ARCHIVE}/cert"*.pem 2>/dev/null | head -n1)
    LATEST_CHAIN=$(sudo ls -t "${LETSENCRYPT_ARCHIVE}/chain"*.pem 2>/dev/null | head -n1)
    LATEST_KEY=$(sudo ls -t "${LETSENCRYPT_ARCHIVE}/privkey"*.pem 2>/dev/null | head -n1)
    LATEST_FULLCHAIN=$(sudo ls -t "${LETSENCRYPT_ARCHIVE}/fullchain"*.pem 2>/dev/null | head -n1)
    
    echo "   Cert encontrado: ${LATEST_CERT:-NO}"
    echo "   Chain encontrado: ${LATEST_CHAIN:-NO}"
    echo "   Key encontrado: ${LATEST_KEY:-NO}"
    echo "   Fullchain encontrado: ${LATEST_FULLCHAIN:-NO}"
    
    if [ -n "$LATEST_KEY" ]; then
        PRIVKEY_SOURCE="$LATEST_KEY"
        
        if [ -n "$LATEST_FULLCHAIN" ]; then
            FULLCHAIN_SOURCE="$LATEST_FULLCHAIN"
            CERT_FOUND=true
            echo "   ✓ Usando fullchain existente"
        elif [ -n "$LATEST_CERT" ] && [ -n "$LATEST_CHAIN" ]; then
            # Construir fullchain
            TEMP_FULLCHAIN=$(mktemp)
            sudo cat "$LATEST_CERT" "$LATEST_CHAIN" > "$TEMP_FULLCHAIN"
            FULLCHAIN_SOURCE="$TEMP_FULLCHAIN"
            CERT_FOUND=true
            echo "   ✓ Construyendo fullchain desde cert + chain"
        fi
    fi
fi

echo ""

if [ "$CERT_FOUND" = false ]; then
    echo "ERROR: No se pudieron encontrar los certificados."
    echo ""
    echo "Intenta ejecutar:"
    echo "  sudo certbot certificates"
    echo ""
    echo "O crear nuevos certificados:"
    echo "  ./setup-letsencrypt.sh tu-email@ejemplo.com"
    exit 1
fi

# Crear directorio de certificados
mkdir -p "$CERT_DIR"

# Copiar certificados
echo "3. Copiando certificados..."
echo "   Desde: ${FULLCHAIN_SOURCE}"
echo "   Hacia: ${CERT_DIR}/fullchain.pem"
sudo cp "${FULLCHAIN_SOURCE}" "${CERT_DIR}/fullchain.pem"

echo "   Desde: ${PRIVKEY_SOURCE}"
echo "   Hacia: ${CERT_DIR}/privkey.pem"
sudo cp "${PRIVKEY_SOURCE}" "${CERT_DIR}/privkey.pem"

# Limpiar archivo temporal si existe
if [ "${FULLCHAIN_SOURCE}" != "${FULLCHAIN_SOURCE#/tmp}" ]; then
    rm -f "${FULLCHAIN_SOURCE}"
fi

# Ajustar permisos
sudo chmod 644 "${CERT_DIR}/fullchain.pem"
sudo chmod 600 "${CERT_DIR}/privkey.pem"
sudo chown $USER:$USER "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" 2>/dev/null || true

echo ""
echo "✓ Certificados copiados exitosamente!"
echo ""
echo "Verificando certificados copiados:"
ls -lh "${CERT_DIR}/"*.pem 2>/dev/null || echo "Error al verificar"
echo ""
echo "Ahora puedes iniciar nginx con:"
echo "  cd ../.. && docker compose up -d nginx"
echo ""

