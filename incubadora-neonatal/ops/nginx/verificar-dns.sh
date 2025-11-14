#!/bin/bash
# Script para verificar la configuración DNS

DOMAIN="marsupia.online"
EXPECTED_IP="3.148.116.136"

echo "=========================================="
echo "Verificación de DNS para ${DOMAIN}"
echo "=========================================="
echo ""

# Obtener IP actual del servidor
echo "1. IP actual del servidor:"
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "No se pudo obtener")
echo "   ${CURRENT_IP}"
echo ""

# Verificar qué IP resuelve el dominio
echo "2. IP a la que apunta el dominio ${DOMAIN}:"
if command -v dig &> /dev/null; then
    RESOLVED_IP=$(dig +short ${DOMAIN} | tail -n1)
    echo "   ${RESOLVED_IP}"
elif command -v nslookup &> /dev/null; then
    RESOLVED_IP=$(nslookup ${DOMAIN} | grep -A1 "Name:" | tail -n1 | awk '{print $2}')
    echo "   ${RESOLVED_IP}"
else
    echo "   ⚠️  No se encontró dig ni nslookup"
    RESOLVED_IP=""
fi
echo ""

# Comparar
echo "3. Comparación:"
echo "   IP esperada: ${EXPECTED_IP}"
echo "   IP del servidor: ${CURRENT_IP}"
echo "   IP del dominio: ${RESOLVED_IP}"
echo ""

if [ "$RESOLVED_IP" = "$CURRENT_IP" ]; then
    echo "   ✓ El dominio apunta a la IP actual del servidor"
    if [ "$CURRENT_IP" != "$EXPECTED_IP" ]; then
        echo "   ⚠️  PERO: La IP del servidor (${CURRENT_IP}) no coincide con la IP elástica esperada (${EXPECTED_IP})"
        echo "   Esto puede significar que:"
        echo "   - La instancia EC2 no tiene la IP elástica asignada"
        echo "   - O el dominio debe apuntar a ${CURRENT_IP} en lugar de ${EXPECTED_IP}"
    fi
elif [ "$RESOLVED_IP" = "$EXPECTED_IP" ]; then
    echo "   ⚠️  El dominio apunta a ${EXPECTED_IP}, pero el servidor tiene IP ${CURRENT_IP}"
    echo "   Necesitas asignar la IP elástica ${EXPECTED_IP} a esta instancia EC2"
else
    echo "   ❌ PROBLEMA: El dominio no apunta a ninguna de las IPs esperadas"
    echo "   Debes actualizar el DNS en GoDaddy para que apunte a: ${CURRENT_IP}"
fi
echo ""

# Verificar www
echo "4. Verificando www.${DOMAIN}:"
if command -v dig &> /dev/null; then
    WWW_IP=$(dig +short www.${DOMAIN} | tail -n1)
    echo "   www.${DOMAIN} → ${WWW_IP}"
    if [ "$WWW_IP" = "$CURRENT_IP" ] || [ "$WWW_IP" = "$EXPECTED_IP" ]; then
        echo "   ✓ www apunta correctamente"
    else
        echo "   ⚠️  www no apunta a la IP correcta"
    fi
fi
echo ""

echo "=========================================="
echo "RECOMENDACIÓN:"
echo "=========================================="
if [ "$CURRENT_IP" != "$EXPECTED_IP" ]; then
    echo "1. ⭐ RECOMENDADO: Asigna la IP elástica ${EXPECTED_IP} a esta instancia EC2"
    echo "   Consulta: ASIGNAR-IP-ELASTICA.md para instrucciones detalladas"
    echo ""
    echo "2. O actualiza el DNS en GoDaddy para que apunte a ${CURRENT_IP}"
    echo "   (Menos recomendado: la IP puede cambiar si reinicias la instancia)"
else
    if [ "$RESOLVED_IP" != "$CURRENT_IP" ]; then
        echo "⚠️  El servidor tiene la IP correcta (${CURRENT_IP}), pero el DNS no apunta a ella"
        echo ""
        echo "⭐ ACCIÓN REQUERIDA: Actualiza el DNS en GoDaddy"
        echo "   Consulta: ACTUALIZAR-DNS-GODADDY.md para instrucciones detalladas"
        echo ""
        echo "   Cambios necesarios:"
        echo "   - Registro A para '@' (o en blanco): debe ser ${CURRENT_IP}"
        echo "   - Registro A para 'www': debe ser ${CURRENT_IP}"
    else
        echo "✓ Todo está configurado correctamente!"
        echo "   El dominio apunta a la IP del servidor"
    fi
fi
echo ""

# Verificar www
if [ -n "$WWW_IP" ] && [ "$WWW_IP" != "$CURRENT_IP" ] && [ "$WWW_IP" != "$EXPECTED_IP" ]; then
    echo "⚠️  IMPORTANTE: www.marsupia.online apunta a ${WWW_IP}"
    echo "   Debes actualizar el registro www en GoDaddy para que apunte a:"
    if [ "$CURRENT_IP" = "$EXPECTED_IP" ]; then
        echo "   ${CURRENT_IP}"
    else
        echo "   ${EXPECTED_IP} (después de asignar la IP elástica)"
    fi
    echo ""
fi

