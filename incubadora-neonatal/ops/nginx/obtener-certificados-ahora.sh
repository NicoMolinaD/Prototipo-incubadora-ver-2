#!/bin/bash
# Script para obtener certificados SSL válidos de Let's Encrypt
# Reemplaza los certificados autofirmados actuales

set -e

DOMAIN="marsupia.online"
EMAIL="nicolas-0413@hotmail.com"
CERT_DIR="$(dirname "$0")/certs"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "=========================================="
echo "Obteniendo Certificados SSL de Let's Encrypt"
echo "Dominio: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo "=========================================="
echo ""

# Paso 1: Corregir permisos de certificados actuales (si existen)
echo "Paso 1: Corrigiendo permisos..."
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
    chmod 644 "${CERT_DIR}/fullchain.pem" 2>/dev/null || sudo chmod 644 "${CERT_DIR}/fullchain.pem"
    echo "   ✓ Permisos de fullchain.pem corregidos"
fi
if [ -f "${CERT_DIR}/privkey.pem" ]; then
    chmod 600 "${CERT_DIR}/privkey.pem" 2>/dev/null || sudo chmod 600 "${CERT_DIR}/privkey.pem"
    echo "   ✓ Permisos de privkey.pem corregidos"
fi
echo ""

# Paso 2: Verificar que certbot está instalado
echo "Paso 2: Verificando certbot..."
if ! command -v certbot &> /dev/null; then
    echo "   Certbot no está instalado. Instalando..."
    sudo apt-get update
    sudo apt-get install -y certbot
    echo "   ✓ Certbot instalado"
else
    echo "   ✓ Certbot ya está instalado"
fi
echo ""

# Paso 3: Verificar DNS
echo "Paso 3: Verificando DNS..."
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

# Paso 4: Detener nginx
echo "Paso 4: Deteniendo nginx..."
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
    
    # Esperar un momento para que el puerto se libere
    sleep 2
else
    echo "   ⚠️  Docker no está disponible"
fi
echo ""

# Paso 5: Verificar que el puerto 80 está libre
echo "Paso 5: Verificando puerto 80..."
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

# Paso 6: Crear directorio de certificados
echo "Paso 6: Preparando directorio de certificados..."
mkdir -p "$CERT_DIR"
echo "   ✓ Directorio listo: ${CERT_DIR}"
echo ""

# Paso 7: Hacer backup de certificados antiguos (si existen)
echo "Paso 7: Haciendo backup de certificados antiguos..."
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
    sudo cp "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/fullchain.pem.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || \
    cp "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/fullchain.pem.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    echo "   ✓ Backup de fullchain.pem creado"
fi
if [ -f "${CERT_DIR}/privkey.pem" ]; then
    sudo cp "${CERT_DIR}/privkey.pem" "${CERT_DIR}/privkey.pem.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || \
    cp "${CERT_DIR}/privkey.pem" "${CERT_DIR}/privkey.pem.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    echo "   ✓ Backup de privkey.pem creado"
fi
echo ""

# Paso 8: Obtener certificados de Let's Encrypt
echo "Paso 8: Obteniendo certificados de Let's Encrypt..."
echo "   Esto puede tardar unos minutos..."
echo "   Let's Encrypt verificará que controlas el dominio..."
echo ""

sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    --preferred-challenges http \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

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

# Paso 9: Copiar certificados
echo "Paso 9: Copiando certificados al directorio del proyecto..."
sudo cp "${LETSENCRYPT_DIR}/fullchain.pem" "${CERT_DIR}/"
sudo cp "${LETSENCRYPT_DIR}/privkey.pem" "${CERT_DIR}/"

# Ajustar permisos
sudo chmod 644 "${CERT_DIR}/fullchain.pem"
sudo chmod 600 "${CERT_DIR}/privkey.pem"
sudo chown $USER:$USER "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" 2>/dev/null || true

echo "   ✓ Certificados copiados y permisos ajustados"
echo ""

# Paso 10: Verificar certificados
echo "Paso 10: Verificando certificados..."
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
    
    # Verificar que incluye el dominio
    CERT_SAN=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | grep -o "DNS:.*" | head -n1 || echo "")
    if echo "$CERT_SAN" | grep -q "${DOMAIN}"; then
        echo "   ✓ El certificado incluye ${DOMAIN}"
    else
        echo "   ⚠️  Verificando SAN..."
        openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" || echo "   No se encontró SAN"
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
echo "1. Reinicia nginx:"
echo "   cd ~/Prototipo-incubadora-ver-2/incubadora-neonatal/ops"
echo "   docker compose -f docker-compose.prod.yml up -d nginx"
echo ""
echo "2. Verifica que funciona:"
echo "   ./verificar-certificados.sh"
echo ""
echo "3. Prueba en el navegador (modo incógnito):"
echo "   https://marsupia.online"
echo ""

