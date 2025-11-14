#!/bin/bash
# Script para verificar que los certificados SSL están correctamente configurados

CERT_DIR="$(dirname "$0")/certs"
DOMAIN="marsupia.online"

echo "=========================================="
echo "Verificación de Certificados SSL"
echo "=========================================="
echo ""

# Verificar que los archivos existen
echo "1. Verificando archivos de certificados..."
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
    echo "   ✓ fullchain.pem existe"
    FULLCHAIN_SIZE=$(stat -f%z "${CERT_DIR}/fullchain.pem" 2>/dev/null || stat -c%s "${CERT_DIR}/fullchain.pem" 2>/dev/null || echo "0")
    echo "   Tamaño: ${FULLCHAIN_SIZE} bytes"
else
    echo "   fullchain.pem NO existe"
    echo "   Necesitas obtener los certificados con: ./setup-letsencrypt.sh"
    exit 1
fi

if [ -f "${CERT_DIR}/privkey.pem" ]; then
    echo "   ✓ privkey.pem existe"
    PRIVKEY_SIZE=$(stat -f%z "${CERT_DIR}/privkey.pem" 2>/dev/null || stat -c%s "${CERT_DIR}/privkey.pem" 2>/dev/null || echo "0")
    echo "   Tamaño: ${PRIVKEY_SIZE} bytes"
else
    echo "   privkey.pem NO existe"
    echo "   Necesitas obtener los certificados con: ./setup-letsencrypt.sh"
    exit 1
fi
echo ""

# Verificar permisos
echo "2. Verificando permisos..."
FULLCHAIN_PERMS=$(stat -f%OLp "${CERT_DIR}/fullchain.pem" 2>/dev/null || stat -c%a "${CERT_DIR}/fullchain.pem" 2>/dev/null || echo "000")
PRIVKEY_PERMS=$(stat -f%OLp "${CERT_DIR}/privkey.pem" 2>/dev/null || stat -c%a "${CERT_DIR}/privkey.pem" 2>/dev/null || echo "000")

echo "   fullchain.pem: ${FULLCHAIN_PERMS} (debe ser 644 o 644)"
echo "   privkey.pem: ${PRIVKEY_PERMS} (debe ser 600 o 600)"

if [ "$FULLCHAIN_PERMS" != "644" ] && [ "$FULLCHAIN_PERMS" != "0644" ]; then
    echo "   ADVERTENCIA: Permisos de fullchain.pem no son 644"
    echo "   Ejecuta: chmod 644 ${CERT_DIR}/fullchain.pem"
fi

if [ "$PRIVKEY_PERMS" != "600" ] && [ "$PRIVKEY_PERMS" != "0600" ]; then
    echo "   ADVERTENCIA: Permisos de privkey.pem no son 600"
    echo "   Ejecuta: chmod 600 ${CERT_DIR}/privkey.pem"
fi
echo ""

# Verificar contenido del certificado
echo "3. Verificando contenido del certificado..."
if command -v openssl &> /dev/null; then
    # Verificar que es un certificado válido
    CERT_SUBJECT=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -subject 2>/dev/null | sed 's/subject=//')
    CERT_ISSUER=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -issuer 2>/dev/null | sed 's/issuer=//')
    CERT_DATES=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -dates 2>/dev/null)
    
    if [ -n "$CERT_SUBJECT" ]; then
        echo "   Subject: ${CERT_SUBJECT}"
        echo "   Issuer: ${CERT_ISSUER}"
        echo ""
        echo "   Fechas:"
        echo "$CERT_DATES" | sed 's/^/     /'
        
        # Verificar si es Let's Encrypt
        if echo "$CERT_ISSUER" | grep -q "Let's Encrypt"; then
            echo ""
            echo "   Certificado de Let's Encrypt (válido)"
        elif echo "$CERT_SUBJECT" | grep -q "CN=${DOMAIN}"; then
            echo ""
            echo "   Certificado autofirmado (solo para desarrollo)"
        else
            echo ""
            echo "   Certificado no reconocido"
        fi
        
        # Verificar si el certificado incluye el dominio
        CERT_SAN=$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | grep -o "DNS:.*" | head -n1)
        if echo "$CERT_SAN" | grep -q "${DOMAIN}"; then
            echo "   El certificado incluye ${DOMAIN}"
        else
            echo "   El certificado puede no incluir ${DOMAIN}"
        fi
    else
        echo "   No se pudo leer el certificado"
    fi
else
    echo "   OpenSSL no está disponible, no se puede verificar el contenido"
fi
echo ""

# Verificar que nginx puede leer los certificados
echo "4. Verificando que nginx puede leer los certificados..."
if command -v docker &> /dev/null; then
    # Verificar si nginx está corriendo
    NGINX_CONTAINER=$(docker ps --filter "name=nginx" --format "{{.Names}}" | head -n1)
    if [ -n "$NGINX_CONTAINER" ]; then
        echo "   Contenedor nginx encontrado: ${NGINX_CONTAINER}"
        
        # Verificar configuración de nginx
        if docker exec "${NGINX_CONTAINER}" nginx -t 2>&1 | grep -q "successful"; then
            echo "   Configuración de nginx es válida"
        else
            echo "   Error en la configuración de nginx:"
            docker exec "${NGINX_CONTAINER}" nginx -t 2>&1 | sed 's/^/     /'
        fi
        
        # Verificar que nginx puede leer los certificados
        if docker exec "${NGINX_CONTAINER}" test -r /etc/nginx/certs/fullchain.pem && \
           docker exec "${NGINX_CONTAINER}" test -r /etc/nginx/certs/privkey.pem; then
            echo "   Nginx puede leer los certificados"
        else
            echo "   Nginx NO puede leer los certificados"
            echo "   Verifica que el volumen está montado correctamente en docker-compose"
        fi
    else
        echo "   Nginx no está corriendo"
    fi
else
    echo "   Docker no está disponible"
fi
echo ""

# Verificar conectividad HTTPS
echo "5. Verificando conectividad HTTPS..."
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://${DOMAIN}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ]; then
        echo "   ✓ Se puede conectar a https://${DOMAIN} (código: ${HTTP_CODE})"
        
        # Verificar el certificado desde el servidor
        if command -v openssl &> /dev/null; then
            SERVER_CERT=$(echo | openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" 2>/dev/null | openssl x509 -noout -subject 2>/dev/null | sed 's/subject=//')
            if [ -n "$SERVER_CERT" ]; then
                echo "   Certificado del servidor: ${SERVER_CERT}"
            fi
        fi
    else
        echo "   No se puede conectar a https://${DOMAIN}"
        echo "   Verifica que nginx está corriendo y el puerto 443 está abierto"
    fi
else
    echo "   curl no está disponible"
fi
echo ""

echo "=========================================="
echo "RESUMEN"
echo "=========================================="
echo ""
echo "Si hay problemas:"
echo "1. Verifica que los certificados existen: ls -la ${CERT_DIR}/"
echo "2. Verifica permisos: chmod 644 ${CERT_DIR}/fullchain.pem && chmod 600 ${CERT_DIR}/privkey.pem"
echo "3. Si no hay certificados válidos, ejecuta: ./setup-letsencrypt.sh"
echo "4. Reinicia nginx: docker compose -f ../../ops/docker-compose.prod.yml restart nginx"
echo ""

