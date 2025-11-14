# Certificados SSL para Nginx

Este directorio contiene los certificados SSL necesarios para habilitar HTTPS en Nginx.

## Generación de Certificados

### Opción 1: Script con OpenSSL (recomendado)

Si tienes OpenSSL instalado en tu sistema:

```bash
cd incubadora-neonatal/ops/nginx
chmod +x generate-certs.sh
./generate-certs.sh [dominio]
```

Si no especificas un dominio, se usará `localhost` por defecto.

### Opción 2: Script con Docker

Si no tienes OpenSSL instalado, puedes usar Docker:

```bash
cd incubadora-neonatal/ops/nginx
chmod +x generate-certs-docker.sh
./generate-certs-docker.sh [dominio]
```

### Opción 3: Comando manual

```bash
cd incubadora-neonatal/ops/nginx/certs

# Generar clave privada
openssl genrsa -out privkey.pem 2048

# Generar certificado autofirmado
openssl req -new -x509 -key privkey.pem \
    -out fullchain.pem \
    -days 365 \
    -subj "/C=ES/ST=State/L=City/O=Incubadora/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

# Ajustar permisos
chmod 600 privkey.pem
chmod 644 fullchain.pem
```

## Certificados para Producción (marsupia.online)

Para producción, se recomienda usar certificados de **Let's Encrypt** con Certbot.

### Configuración del Dominio

**Dominio:** `marsupia.online`  
**IP Elástica AWS:** `3.148.116.136`

**Requisitos previos:**
1. El dominio `marsupia.online` debe apuntar a la IP `3.148.116.136` en GoDaddy
2. Los puertos 80 y 443 deben estar abiertos en el Security Group de AWS EC2
3. Los registros DNS deben estar propagados (puede tardar hasta 48 horas)

**Configuración en GoDaddy:**
- Crear un registro A que apunte `marsupia.online` a `3.148.116.136`
- Opcional: Crear un registro A para `www.marsupia.online` también a `3.148.116.136`

### Opción 1: Script Automatizado (Recomendado)

Usa el script `setup-letsencrypt.sh` que automatiza todo el proceso:

```bash
cd incubadora-neonatal/ops/nginx
chmod +x setup-letsencrypt.sh
./setup-letsencrypt.sh [tu-email@ejemplo.com]
```

El script:
- Verifica que certbot esté instalado
- Obtiene los certificados de Let's Encrypt
- Los copia al directorio correcto
- Ajusta los permisos

### Opción 2: Manual

Si prefieres hacerlo manualmente:

```bash
# Instalar certbot
sudo apt-get update
sudo apt-get install certbot

# Detener nginx temporalmente (necesario para modo standalone)
docker compose -f ops/docker-compose.prod.yml stop nginx

# Generar certificados
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@marsupia.online \
    -d marsupia.online \
    -d www.marsupia.online

# Los certificados se guardarán en:
# /etc/letsencrypt/live/marsupia.online/fullchain.pem
# /etc/letsencrypt/live/marsupia.online/privkey.pem

# Copiar a este directorio
sudo cp /etc/letsencrypt/live/marsupia.online/fullchain.pem ./certs/
sudo cp /etc/letsencrypt/live/marsupia.online/privkey.pem ./certs/
sudo chmod 600 ./certs/privkey.pem
sudo chmod 644 ./certs/fullchain.pem

# Reiniciar nginx
docker compose -f ops/docker-compose.prod.yml up -d nginx
```

### Renovación Automática

Los certificados de Let's Encrypt expiran cada 90 días. Para renovarlos automáticamente:

**Opción 1: Usar el script de renovación**

```bash
cd incubadora-neonatal/ops/nginx
chmod +x renew-certs.sh
./renew-certs.sh
```

**Opción 2: Configurar un cron job**

```bash
sudo crontab -e
```

Agrega esta línea (ajusta la ruta según tu proyecto):

```cron
0 0 * * * /ruta/completa/a/incubadora-neonatal/ops/nginx/renew-certs.sh >> /var/log/certbot-renew.log 2>&1
```

O usa el comando directo de certbot:

```cron
0 0 * * * certbot renew --quiet --deploy-hook 'docker compose -f /ruta/a/ops/docker-compose.prod.yml restart nginx'
```

## Estructura de Archivos

```
ops/nginx/
├── certs/
│   ├── fullchain.pem         # Certificado completo (certificado + cadena)
│   └── privkey.pem           # Clave privada
├── nginx.conf                # Configuración de Nginx (producción)
├── default-ssl.conf          # Configuración alternativa de Nginx
├── generate-certs.sh         # Script para generar certificados autofirmados (desarrollo)
├── setup-letsencrypt.sh      # Script para obtener certificados de Let's Encrypt (producción)
└── renew-certs.sh            # Script para renovar certificados de Let's Encrypt
```

## Notas Importantes

- ⚠️ Los certificados autofirmados son solo para **desarrollo**
- Los navegadores mostrarán una advertencia de seguridad con certificados autofirmados
- Para producción, siempre usa certificados de un CA confiable (Let's Encrypt, etc.)
- Los certificados generados tienen validez de 365 días
- Nunca subas las claves privadas (`privkey.pem`) a repositorios públicos

## Verificación

Después de generar los certificados, verifica que Nginx puede leerlos:

```bash
docker compose -f ops/docker-compose.prod.yml exec nginx nginx -t
```

Si todo está correcto, deberías ver:
```
nginx: the configuration file /etc/nginx/nginx.conf test is successful
```

### Verificar el Certificado en el Navegador

1. Abre `https://marsupia.online` en tu navegador
2. Haz clic en el candado en la barra de direcciones
3. Verifica que el certificado es válido y emitido por Let's Encrypt
4. Verifica que el dominio coincide con `marsupia.online`

### Verificar desde la Línea de Comandos

```bash
# Verificar el certificado
openssl s_client -connect marsupia.online:443 -servername marsupia.online < /dev/null 2>/dev/null | openssl x509 -noout -dates -subject

# Verificar la cadena de certificados
openssl s_client -connect marsupia.online:443 -servername marsupia.online < /dev/null 2>/dev/null | openssl x509 -noout -issuer
```

## Troubleshooting

### Error: "Failed to obtain certificate"

- Verifica que el dominio apunta correctamente a la IP: `dig marsupia.online` o `nslookup marsupia.online`
- Verifica que los puertos 80 y 443 están abiertos en el Security Group de AWS
- Asegúrate de que nginx no está corriendo cuando ejecutas certbot en modo standalone

### Error: "Connection refused"

- Verifica que el firewall permite conexiones en los puertos 80 y 443
- Verifica la configuración del Security Group en AWS EC2

### El certificado expiró

Ejecuta el script de renovación:
```bash
./renew-certs.sh
```

O renueva manualmente:
```bash
sudo certbot renew
```

