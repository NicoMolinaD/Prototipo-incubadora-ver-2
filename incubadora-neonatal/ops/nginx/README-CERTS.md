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

## Certificados para Producción

Para producción, se recomienda usar certificados de **Let's Encrypt** con Certbot:

```bash
# Instalar certbot
sudo apt-get update
sudo apt-get install certbot

# Generar certificados (reemplaza example.com con tu dominio)
sudo certbot certonly --standalone -d example.com -d www.example.com

# Los certificados se guardarán en:
# /etc/letsencrypt/live/example.com/fullchain.pem
# /etc/letsencrypt/live/example.com/privkey.pem

# Copiar a este directorio
sudo cp /etc/letsencrypt/live/example.com/fullchain.pem ./certs/
sudo cp /etc/letsencrypt/live/example.com/privkey.pem ./certs/
sudo chmod 600 ./certs/privkey.pem
sudo chmod 644 ./certs/fullchain.pem
```

## Estructura de Archivos

```
ops/nginx/
├── certs/
│   ├── fullchain.pem    # Certificado completo (certificado + cadena)
│   └── privkey.pem      # Clave privada
├── nginx.conf           # Configuración de Nginx
└── generate-certs.sh    # Script para generar certificados
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
docker compose exec nginx nginx -t
```

Si todo está correcto, deberías ver:
```
nginx: the configuration file /etc/nginx/nginx.conf test is successful
```

