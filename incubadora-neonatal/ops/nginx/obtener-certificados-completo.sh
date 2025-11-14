#!/bin/bash
# Script completo para obtener certificados SSL y configurar todo

set -e

DOMAIN="marsupia.online"
EMAIL="nicolas-0413@hotmail.com"
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "=========================================="
echo "Configuración Completa de Certificados SSL"
echo "Dominio: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo "=========================================="
echo ""

# Paso 1: Verificar que certbot está instalado
echo "Paso 1: Verificando certbot..."
if ! command -v certbot &> /dev/null; then
    echo "   Certbot no está instalado. Instalando..."
    sudo apt-get update
    sudo apt-get install -y certbot
    echo "   ✓ Certbot instalado"
else
    echo "   ✓ Certbot ya está instalado"
fi
echo ""

# Paso 2: Verificar DNS
echo "Paso 2: Verificando DNS..."
if command -v dig &> /dev/null; then
    RESOLVED_IP=$(dig +short ${DOMAIN} 2>/dev/null | tail -n1 || echo "")
    CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
    
    if [ -n "$RESOLVED_IP" ] && [ -n "$CURRENT_IP" ]; then
        echo "   Dominio resuelve a: ${RESOLVED_IP}"
        echo "   IP del servidor: ${CURRENT_IP}"
        if [ "$RESOLVED_IP" = "$CURRENT_IP" ]; then
            echo "   ✓ DNS está correcto"
        else
            echo "   ⚠️  ADVERTENCIA: El DNS no apunta a esta IP"
            echo "   El dominio debe apuntar a ${CURRENT_IP}"
            read -p "   ¿Deseas continuar de todas formas? (s/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Ss]$ ]]; then
                exit 1
            fi
        fi
    fi
else
    echo "   ⚠️  dig no está disponible, no se puede verificar DNS"
fi
echo ""

# Paso 3: Detener nginx
echo "Paso 3: Deteniendo nginx..."
if command -v docker &> /dev/null; then
    # Intentar desde diferentes ubicaciones
    if [ -f "../../ops/docker-compose.prod.yml" ]; then
        docker compose -f ../../ops/docker-compose.prod.yml stop nginx 2>/dev/null || true
    elif [ -f "../docker-compose.prod.yml" ]; then
        docker compose -f ../docker-compose.prod.yml stop nginx 2>/dev/null || true
    elif docker compose ps nginx 2>/dev/null | grep -q "Up"; then
        docker compose stop nginx 2>/dev/null || true
    fi
    echo "   ✓ Nginx detenido"
else
    echo "   ⚠️  Docker no está disponible"
fi
echo ""

# Paso 4: Verificar que el puerto 80 está libre
echo "Paso 4: Verificando puerto 80..."
if command -v netstat &> /dev/null; then
    PORT_80_IN_USE=$(sudo netstat -tlnp 2>/dev/null | grep ':80 ' || echo "")
    if [ -n "$PORT_80_IN_USE" ]; then
        echo "   ⚠️  ADVERTENCIA: El puerto 80 está en uso:"
        echo "   $PORT_80_IN_USE"
        echo "   Esto puede causar problemas. Asegúrate de que nginx está detenido."
        read -p "   ¿Deseas continuar de todas formas? (s/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    else
        echo "   ✓ Puerto 80 está libre"
    fi
fi
echo ""

# Paso 5: Crear directorio de certificados
echo "Paso 5: Preparando directorio de certificados..."
mkdir -p "$CERT_DIR"
echo "   ✓ Directorio listo: ${CERT_DIR}"
echo ""

# Paso 6: Obtener certificados
echo "Paso 6: Obteniendo certificados de Let's Encrypt..."
echo "   Esto puede tardar unos minutos..."
echo ""

sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    --preferred-challenges http \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --verbose

# Verificar que los certificados se generaron
if [ ! -f "${LETSENCRYPT_DIR}/fullchain.pem" ] || [ ! -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    echo ""
    echo "   ❌ Error: Los certificados no se generaron correctamente."
    echo "   Revisa los logs: /var/log/letsencrypt/letsencrypt.log"
    exit 1
fi

echo ""
echo "   ✓ Certificados obtenidos exitosamente"
echo ""

# Paso 7: Copiar certificados
echo "Paso 7: Copiando certificados al directorio del proyecto..."
sudo cp "${LETSENCRYPT_DIR}/fullchain.pem" "${CERT_DIR}/"
sudo cp "${LETSENCRYPT_DIR}/privkey.pem" "${CERT_DIR}/"

# Ajustar permisos
sudo chmod 644 "${CERT_DIR}/fullchain.pem"
sudo chmod 600 "${CERT_DIR}/privkey.pem"
sudo chown $USER:$USER "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" 2>/dev/null || true

echo "   ✓ Certificados copiados y permisos ajustados"
echo ""

# Paso 8: Verificar certificados
echo "Paso 8: Verificando certificados..."
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
fi
echo ""

echo "=========================================="
echo "✅ Certificados SSL Configurados"
echo "=========================================="
echo ""
echo "Ubicación de los certificados:"
echo "  - ${CERT_DIR}/fullchain.pem"
echo "  - ${CERT_DIR}/privkey.pem"
echo ""
echo "Próximos pasos:"
echo "1. Configura CORS en el backend (archivo .env)"
echo "2. Reinicia los servicios:"
echo "   cd ~/Prototipo-incubadora-ver-2/incubadora-neonatal/ops"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "Los certificados expiran cada 90 días."
echo "Para renovar automáticamente, configura un cron job con:"
echo "  sudo crontab -e"
echo "Y agrega:"
echo "  0 0 * * * certbot renew --quiet --deploy-hook 'docker compose -f /ruta/a/ops/docker-compose.prod.yml restart nginx'"
echo ""

