#!/bin/bash
# Script para obtener certificados SSL de Let's Encrypt para marsupia.online
# Este script debe ejecutarse en el servidor EC2 de AWS
# Requisitos previos:
#   1. El dominio marsupia.online debe apuntar a la IP 3.234.34.82
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
    echo "Certbot no está instalado."
    echo "Instalando certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Crear directorio de certificados si no existe
mkdir -p "$CERT_DIR"

# Verificar que el dominio apunta a esta IP
echo "Verificando que el dominio ${DOMAIN} apunta a esta IP..."
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
EXPECTED_IP="3.234.34.82"

if [ -z "$CURRENT_IP" ]; then
    echo "No se pudo obtener la IP del servidor"
    CURRENT_IP="desconocida"
else
    echo "IP actual del servidor: ${CURRENT_IP}"
fi
echo "IP esperada (elástica): ${EXPECTED_IP}"
echo ""

# Verificar qué IP resuelve el dominio
if command -v dig &> /dev/null; then
    RESOLVED_IP=$(dig +short ${DOMAIN} 2>/dev/null | tail -n1 || echo "")
    if [ -n "$RESOLVED_IP" ]; then
        echo "IP a la que apunta ${DOMAIN}: ${RESOLVED_IP}"
        if [ "$RESOLVED_IP" = "$CURRENT_IP" ]; then
            echo "El dominio apunta a la IP actual del servidor"
        elif [ "$RESOLVED_IP" = "$EXPECTED_IP" ] && [ "$CURRENT_IP" != "$EXPECTED_IP" ]; then
            echo "ADVERTENCIA: El dominio apunta a ${EXPECTED_IP}, pero el servidor tiene IP ${CURRENT_IP}"
            echo "   Necesitas asignar la IP elástica ${EXPECTED_IP} a esta instancia EC2"
            echo ""
            echo "   Para asignar la IP elástica:"
            echo "   1. Ve a EC2 → Elastic IPs en la consola de AWS"
            echo "   2. Selecciona la IP ${EXPECTED_IP}"
            echo "   3. Actions → Associate Elastic IP address"
            echo "   4. Selecciona esta instancia"
            echo ""
            read -p "¿Deseas continuar de todas formas? (s/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Ss]$ ]]; then
                echo "Por favor, asigna la IP elástica primero."
                exit 1
            fi
        else
            echo "ADVERTENCIA: El dominio apunta a ${RESOLVED_IP}, que no coincide con ninguna IP esperada"
            echo "   Debes actualizar el DNS en GoDaddy para que apunte a: ${CURRENT_IP}"
        fi
    else
        echo "No se pudo resolver el dominio ${DOMAIN}"
    fi
fi
echo ""
echo "IMPORTANTE: Asegúrate de que:"
echo "   1. El dominio ${DOMAIN} apunta a la IP correcta en GoDaddy"
echo "   2. Los registros DNS están propagados (puede tardar hasta 48 horas)"
echo "   3. Los puertos 80 y 443 están abiertos en el Security Group de AWS"
echo ""
read -p "¿El dominio está configurado correctamente? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Por favor, configura el DNS primero y luego ejecuta este script nuevamente."
    echo "Puedes usar: ./verificar-dns.sh para verificar la configuración DNS"
    exit 1
fi

# Detener nginx temporalmente si está corriendo (necesario para modo standalone)
echo ""
echo "Deteniendo nginx temporalmente para obtener certificados..."
if command -v docker &> /dev/null; then
    # Intentar desde diferentes ubicaciones posibles
    if [ -f "../../docker-compose.yml" ]; then
        # Desde ops/nginx, subir dos niveles a la raíz
        docker compose -f ../../docker-compose.yml stop nginx 2>/dev/null || true
    elif [ -f "../../ops/docker-compose.prod.yml" ]; then
        docker compose -f ../../ops/docker-compose.prod.yml stop nginx 2>/dev/null || true
    elif [ -f "../docker-compose.yml" ]; then
        docker compose -f ../docker-compose.yml stop nginx 2>/dev/null || true
    elif [ -f "../docker-compose.prod.yml" ]; then
        docker compose -f ../docker-compose.prod.yml stop nginx 2>/dev/null || true
    elif docker compose ps nginx 2>/dev/null | grep -q "Up"; then
        docker compose stop nginx 2>/dev/null || true
    fi
fi

# Verificar que el puerto 80 está libre
echo "Verificando que el puerto 80 está libre..."
if command -v netstat &> /dev/null; then
    PORT_80_IN_USE=$(sudo netstat -tlnp 2>/dev/null | grep ':80 ' || echo "")
    if [ -n "$PORT_80_IN_USE" ]; then
        echo "ADVERTENCIA: El puerto 80 está en uso:"
        echo "$PORT_80_IN_USE"
        echo ""
        echo "Por favor, detén el servicio que está usando el puerto 80 antes de continuar."
        echo "O ejecuta: sudo lsof -i :80 para ver qué proceso lo está usando."
        read -p "¿Deseas continuar de todas formas? (s/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    else
        echo "Puerto 80 está libre"
    fi
fi

# Obtener certificados usando certbot en modo standalone
echo ""
echo "Obteniendo certificados de Let's Encrypt..."
echo "Esto puede tardar unos minutos..."
echo ""
echo "Asegúrate de que:"
echo "  - El puerto 80 está abierto en el Security Group"
echo "  - El dominio apunta a esta IP"
echo "  - Nginx está detenido"
echo ""

# Intentar obtener certificados
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    --preferred-challenges http \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --verbose

# Verificar que los certificados se generaron correctamente
if [ ! -f "${LETSENCRYPT_DIR}/fullchain.pem" ] || [ ! -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    echo "Error: Los certificados no se generaron correctamente."
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
echo "Certificados obtenidos y copiados exitosamente!"
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
echo "  cd ../../ && docker compose up -d nginx"
echo "  # O desde la raíz: docker compose up -d nginx"
echo ""
echo "Si tuviste problemas, consulta SOLUCION-FIREWALL.md para más ayuda."
echo ""

