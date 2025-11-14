# Configuración de Certificados SSL para marsupia.online

Esta guía te ayudará a configurar los certificados SSL para el dominio `marsupia.online` en producción.

## Información del Dominio

- **Dominio:** `marsupia.online`
- **IP Elástica AWS:** `3.148.116.136`
- **Registrador:** GoDaddy
- **Servidor:** AWS EC2

## Paso 1: Configurar DNS en GoDaddy

1. Inicia sesión en tu cuenta de GoDaddy
2. Ve a "Mis Productos" → "DNS"
3. Busca el dominio `marsupia.online`
4. Agrega o modifica los siguientes registros:

   **Registro A:**
   - **Nombre:** `@` (o deja en blanco)
   - **Valor:** `3.148.116.136`
   - **TTL:** 600 (o el valor por defecto)

   **Registro A (opcional para www):**
   - **Nombre:** `www`
   - **Valor:** `3.148.116.136`
   - **TTL:** 600

5. Guarda los cambios
6. Espera a que los DNS se propaguen (puede tardar desde minutos hasta 48 horas)

### Verificar la Propagación DNS

Desde tu servidor EC2 o localmente:

```bash
# Verificar que el dominio apunta a la IP correcta
dig marsupia.online +short
# Debe mostrar: 3.148.116.136

# O usando nslookup
nslookup marsupia.online
# Debe mostrar: 3.148.116.136
```

## Paso 2: Configurar Security Group en AWS

1. Ve a la consola de AWS EC2
2. Selecciona tu instancia EC2
3. Ve a la pestaña "Security"
4. Haz clic en el Security Group
5. Edita las reglas de entrada (Inbound rules)
6. Asegúrate de tener estas reglas:

   **HTTP:**
   - Tipo: HTTP
   - Puerto: 80
   - Origen: 0.0.0.0/0 (o tu IP específica)

   **HTTPS:**
   - Tipo: HTTPS
   - Puerto: 443
   - Origen: 0.0.0.0/0 (o tu IP específica)

7. Guarda las reglas

## Paso 3: Obtener Certificados SSL

### Opción A: Script Automatizado (Recomendado)

1. Conéctate a tu servidor EC2:
   ```bash
   ssh -i tu-clave.pem ubuntu@3.148.116.136
   ```

2. Navega al directorio del proyecto:
   ```bash
   cd /ruta/a/Prototipo-incubadora-ver-2/incubadora-neonatal/ops/nginx
   ```

3. Haz el script ejecutable:
   ```bash
   chmod +x setup-letsencrypt.sh
   ```

4. Ejecuta el script (reemplaza el email con el tuyo):
   ```bash
   ./setup-letsencrypt.sh tu-email@ejemplo.com
   ```

5. El script te guiará a través del proceso. Asegúrate de:
   - Que el dominio esté configurado correctamente
   - Que los puertos 80 y 443 estén abiertos
   - Que nginx esté detenido (el script lo hará automáticamente)

6. Una vez completado, inicia nginx:
   ```bash
   cd ../../..
   docker compose -f ops/docker-compose.prod.yml up -d nginx
   ```

### Opción B: Manual

Si prefieres hacerlo manualmente, sigue las instrucciones en `README-CERTS.md`.

## Paso 4: Verificar la Configuración

1. **Verificar que nginx puede leer los certificados:**
   ```bash
   docker compose -f ops/docker-compose.prod.yml exec nginx nginx -t
   ```

2. **Verificar desde el navegador:**
   - Abre `https://marsupia.online`
   - Debe cargar sin advertencias de seguridad
   - Haz clic en el candado para ver los detalles del certificado
   - Debe mostrar "Let's Encrypt" como emisor

3. **Verificar desde la línea de comandos:**
   ```bash
   openssl s_client -connect marsupia.online:443 -servername marsupia.online < /dev/null 2>/dev/null | openssl x509 -noout -dates -subject -issuer
   ```

## Paso 5: Configurar Renovación Automática

Los certificados de Let's Encrypt expiran cada 90 días. Configura la renovación automática:

1. Haz el script de renovación ejecutable:
   ```bash
   chmod +x renew-certs.sh
   ```

2. Configura un cron job:
   ```bash
   sudo crontab -e
   ```

3. Agrega esta línea (ajusta la ruta completa):
   ```cron
   0 0 * * * /ruta/completa/a/incubadora-neonatal/ops/nginx/renew-certs.sh >> /var/log/certbot-renew.log 2>&1
   ```

   O usa el comando directo:
   ```cron
   0 0 * * * certbot renew --quiet --deploy-hook 'docker compose -f /ruta/a/ops/docker-compose.prod.yml restart nginx'
   ```

4. Guarda y cierra el editor

## Troubleshooting

### El dominio no resuelve a la IP correcta

- Verifica la configuración DNS en GoDaddy
- Espera más tiempo para la propagación DNS
- Usa `dig` o `nslookup` para verificar

### Error al obtener certificados: "Failed to obtain certificate"

- Verifica que el dominio apunta a la IP correcta
- Verifica que los puertos 80 y 443 están abiertos
- Asegúrate de que nginx está detenido cuando ejecutas certbot
- Verifica que no hay otro servicio usando los puertos 80 o 443

### Error: "Connection refused"

- Verifica el Security Group de AWS
- Verifica el firewall del sistema operativo
- Verifica que nginx está corriendo: `docker compose ps`

### El certificado expiró

Ejecuta el script de renovación:
```bash
./renew-certs.sh
```

## Archivos Modificados

Los siguientes archivos han sido actualizados para usar `marsupia.online`:

- `nginx.conf` - Configuración principal de nginx
- `default-ssl.conf` - Configuración alternativa de nginx
- `README-CERTS.md` - Documentación actualizada

## Scripts Creados

- `setup-letsencrypt.sh` - Script para obtener certificados de Let's Encrypt
- `renew-certs.sh` - Script para renovar certificados

## Notas Importantes

- ⚠️ **NUNCA** subas `privkey.pem` a repositorios públicos
- Los certificados de Let's Encrypt son gratuitos y válidos por 90 días
- La renovación automática es esencial para mantener el sitio funcionando
- Si cambias la IP de la instancia EC2, necesitarás actualizar el DNS en GoDaddy

## Soporte

Si tienes problemas, consulta:
- `README-CERTS.md` para más detalles técnicos
- Los logs de certbot: `/var/log/letsencrypt/`
- Los logs de nginx: `docker compose logs nginx`

