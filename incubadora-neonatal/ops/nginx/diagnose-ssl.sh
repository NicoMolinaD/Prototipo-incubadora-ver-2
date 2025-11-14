#!/bin/bash
# Script de diagnóstico para problemas con certificados SSL
# Ayuda a identificar problemas comunes antes de obtener certificados

set -e

DOMAIN="marsupia.online"
EXPECTED_IP="3.148.116.136"

echo "=========================================="
echo "Diagnóstico de Configuración SSL"
echo "Dominio: ${DOMAIN}"
echo "=========================================="
echo ""

# 1. Verificar DNS
echo "1. Verificando configuración DNS..."
RESOLVED_IP=$(dig +short ${DOMAIN} | tail -n1)
if [ -z "$RESOLVED_IP" ]; then
    echo "   ❌ ERROR: No se pudo resolver ${DOMAIN}"
    echo "   Verifica que el DNS esté configurado en GoDaddy"
else
    echo "   ✓ ${DOMAIN} resuelve a: ${RESOLVED_IP}"
    if [ "$RESOLVED_IP" = "$EXPECTED_IP" ]; then
        echo "   ✓ La IP coincide con la esperada (${EXPECTED_IP})"
    else
        echo "   ⚠️  ADVERTENCIA: La IP (${RESOLVED_IP}) no coincide con la esperada (${EXPECTED_IP})"
        echo "   Verifica la configuración DNS en GoDaddy"
    fi
fi
echo ""

# 2. Verificar IP actual del servidor
echo "2. Verificando IP del servidor..."
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "No se pudo obtener")
echo "   IP pública del servidor: ${CURRENT_IP}"
if [ "$CURRENT_IP" = "$EXPECTED_IP" ]; then
    echo "   ✓ La IP del servidor coincide"
else
    echo "   ⚠️  La IP del servidor puede ser diferente"
fi
echo ""

# 3. Verificar puertos abiertos
echo "3. Verificando puertos 80 y 443..."
if command -v netstat &> /dev/null; then
    PORT_80=$(sudo netstat -tlnp | grep ':80 ' || echo "")
    PORT_443=$(sudo netstat -tlnp | grep ':443 ' || echo "")
    
    if [ -n "$PORT_80" ]; then
        echo "   ⚠️  Puerto 80 está en uso:"
        echo "   $PORT_80"
        echo "   Esto puede causar problemas. Asegúrate de detener nginx antes de ejecutar certbot."
    else
        echo "   ✓ Puerto 80 está libre"
    fi
    
    if [ -n "$PORT_443" ]; then
        echo "   Puerto 443 está en uso:"
        echo "   $PORT_443"
    else
        echo "   ✓ Puerto 443 está libre"
    fi
else
    echo "   ⚠️  netstat no está disponible, no se puede verificar"
fi
echo ""

# 4. Verificar firewall local
echo "4. Verificando firewall local..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | head -n1)
    echo "   Estado UFW: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "active"; then
        echo "   Verificando reglas para puertos 80 y 443..."
        sudo ufw status | grep -E "(80|443)" || echo "   ⚠️  No se encontraron reglas específicas para 80/443"
    fi
elif command -v firewall-cmd &> /dev/null; then
    echo "   Firewalld detectado"
    sudo firewall-cmd --list-ports 2>/dev/null || echo "   No se pudo verificar firewalld"
else
    echo "   ℹ️  No se detectó firewall local (puede estar usando iptables directamente)"
fi
echo ""

# 5. Verificar conectividad externa
echo "5. Verificando conectividad desde internet..."
echo "   Probando acceso HTTP al dominio..."
HTTP_TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${DOMAIN}" 2>/dev/null || echo "000")
if [ "$HTTP_TEST" = "000" ]; then
    echo "   ❌ ERROR: No se puede acceder a http://${DOMAIN} desde internet"
    echo "   Esto indica un problema de firewall o Security Group"
else
    echo "   ✓ Se puede acceder a http://${DOMAIN} (código: ${HTTP_TEST})"
fi
echo ""

# 6. Verificar Docker/nginx
echo "6. Verificando contenedores Docker..."
if command -v docker &> /dev/null; then
    NGINX_CONTAINER=$(docker ps -a --filter "name=nginx" --format "{{.Names}}" | head -n1)
    if [ -n "$NGINX_CONTAINER" ]; then
        NGINX_STATUS=$(docker inspect --format='{{.State.Status}}' $NGINX_CONTAINER 2>/dev/null || echo "unknown")
        echo "   Contenedor nginx encontrado: ${NGINX_CONTAINER} (estado: ${NGINX_STATUS})"
        if [ "$NGINX_STATUS" = "running" ]; then
            echo "   ⚠️  ADVERTENCIA: Nginx está corriendo. Debe detenerse antes de obtener certificados."
        fi
    else
        echo "   ℹ️  No se encontró contenedor nginx"
    fi
else
    echo "   ℹ️  Docker no está disponible"
fi
echo ""

# 7. Resumen y recomendaciones
echo "=========================================="
echo "RESUMEN Y RECOMENDACIONES"
echo "=========================================="
echo ""
echo "Si el diagnóstico muestra problemas, verifica:"
echo ""
echo "1. Security Group de AWS EC2:"
echo "   - Debe tener reglas de entrada para puertos 80 (HTTP) y 443 (HTTPS)"
echo "   - Origen: 0.0.0.0/0 (o al menos permitir tráfico de Let's Encrypt)"
echo ""
echo "2. Firewall del sistema operativo:"
echo "   - Si usas UFW: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
echo "   - Si usas firewalld: sudo firewall-cmd --add-service=http --add-service=https --permanent"
echo ""
echo "3. Detener nginx antes de obtener certificados:"
echo "   docker compose -f ops/docker-compose.prod.yml stop nginx"
echo ""
echo "4. Verificar DNS:"
echo "   dig ${DOMAIN} +short"
echo "   Debe mostrar: ${EXPECTED_IP}"
echo ""
echo "5. Probar conectividad desde fuera:"
echo "   curl -I http://${DOMAIN}"
echo "   Debe responder (aunque sea con error 301/302, está bien)"
echo ""

