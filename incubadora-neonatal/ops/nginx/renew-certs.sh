#!/bin/bash
# Script para renovar certificados SSL de Let's Encrypt
# Este script puede ejecutarse manualmente o configurarse como cron job

set -e

DOMAIN="marsupia.online"
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"
COMPOSE_FILE="../../ops/docker-compose.prod.yml"

echo "Renovando certificados SSL para ${DOMAIN}..."

# Renovar certificados
sudo certbot renew --quiet

# Verificar si los certificados fueron renovados
if [ -f "${LETSENCRYPT_DIR}/fullchain.pem" ] && [ -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    # Copiar certificados renovados
    sudo cp "${LETSENCRYPT_DIR}/fullchain.pem" "${CERT_DIR}/"
    sudo cp "${LETSENCRYPT_DIR}/privkey.pem" "${CERT_DIR}/"
    
    # Ajustar permisos
    sudo chmod 644 "${CERT_DIR}/fullchain.pem"
    sudo chmod 600 "${CERT_DIR}/privkey.pem"
    
    # Reiniciar nginx para cargar los nuevos certificados
    if [ -f "${COMPOSE_FILE}" ]; then
        docker compose -f "${COMPOSE_FILE}" restart nginx
    else
        echo "No se encontró docker-compose.prod.yml. Reinicia nginx manualmente."
    fi
    
    echo "Certificados renovados y nginx reiniciado."
else
    echo "Los certificados no necesitan renovación todavía."
fi

