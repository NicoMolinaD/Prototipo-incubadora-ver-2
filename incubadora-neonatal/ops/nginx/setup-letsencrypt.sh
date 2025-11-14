#!/bin/bash
# Script para obtener certificados SSL de Let's Encrypt para marsupia.online
# Este script debe ejecutarse en el servidor EC2 de AWS
# Requisitos previos:
#   1. El dominio marsupia.online debe apuntar a la IP 3.148.116.136
#   2. Los puertos 80 y 443 deben estar abiertos en el Security Group de AWS
#   3. Certbot debe estar instalado

set -e

DOMAIN="marsupia.online"
EMAIL="${1:-admin@marsupia.online}"  # Email para notificaciones de renovación
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "=========================================="
echo "Configuración de Certificados SSL"
echo "Dominio: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo "=========================================="
echo ""

# Verificar que certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot no está instalado."
    echo "Instalando certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Crear directorio de certificados si no existe
mkdir -p "$CERT_DIR"

# Verificar que el dominio apunta a esta IP
echo "Verificando que el dominio ${DOMAIN} apunta a esta IP..."
CURRENT_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
echo "IP actual del servidor: ${CURRENT_IP}"
echo "IP esperada: 3.148.116.136"
echo ""
echo "⚠️  IMPORTANTE: Asegúrate de que:"
echo "   1. El dominio ${DOMAIN} apunta a 3.148.116.136 en GoDaddy"
echo "   2. Los registros DNS están propagados (puede tardar hasta 48 horas)"
echo "   3. Los puertos 80 y 443 están abiertos en el Security Group de AWS"
echo ""
read -p "¿El dominio está configurado correctamente? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Por favor, configura el DNS primero y luego ejecuta este script nuevamente."
    exit 1
fi

# Detener nginx temporalmente si está corriendo (necesario para modo standalone)
echo ""
echo "Deteniendo nginx temporalmente para obtener certificados..."
if docker compose ps nginx 2>/dev/null | grep -q "Up"; then
    docker compose stop nginx || true
fi

# Obtener certificados usando certbot en modo standalone
echo ""
echo "Obteniendo certificados de Let's Encrypt..."
echo "Esto puede tardar unos minutos..."
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

# Verificar que los certificados se generaron correctamente
if [ ! -f "${LETSENCRYPT_DIR}/fullchain.pem" ] || [ ! -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    echo "❌ Error: Los certificados no se generaron correctamente."
    exit 1
fi

# Copiar certificados al directorio del proyecto
echo ""
echo "Copiando certificados al directorio del proyecto..."
sudo cp "${LETSENCRYPT_DIR}/fullchain.pem" "${CERT_DIR}/"
sudo cp "${LETSENCRYPT_DIR}/privkey.pem" "${CERT_DIR}/"

# Ajustar permisos
sudo chmod 644 "${CERT_DIR}/fullchain.pem"
sudo chmod 600 "${CERT_DIR}/privkey.pem"
sudo chown $USER:$USER "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" 2>/dev/null || true

echo ""
echo "✅ Certificados obtenidos y copiados exitosamente!"
echo ""
echo "Ubicación de los certificados:"
echo "  - ${CERT_DIR}/fullchain.pem"
echo "  - ${CERT_DIR}/privkey.pem"
echo ""
echo "Los certificados de Let's Encrypt expiran cada 90 días."
echo "Para renovar automáticamente, configura un cron job:"
echo ""
echo "  sudo crontab -e"
echo ""
echo "Y agrega esta línea:"
echo ""
echo "  0 0 * * * certbot renew --quiet --deploy-hook 'docker compose -f /ruta/a/docker-compose.prod.yml restart nginx'"
echo ""
echo "Ahora puedes iniciar nginx con:"
echo "  docker compose -f ops/docker-compose.prod.yml up -d nginx"
echo ""

