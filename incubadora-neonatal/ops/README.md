# Operaciones e Infraestructura

Directorio que contiene la configuración de infraestructura, scripts de despliegue, y herramientas de gestión para el sistema de monitoreo de incubadoras neonatales en producción.

## Estructura

### Nginx

- `nginx/nginx.conf` - Configuración principal de Nginx para producción. Define el proxy reverso que enruta el tráfico HTTP/HTTPS al frontend y backend, configura redirección de HTTP a HTTPS, y establece headers de seguridad.
- `nginx/default-ssl.conf` - Configuración alternativa de Nginx con soporte SSL/TLS.
- `nginx/certs/` - Directorio que contiene los certificados SSL/TLS para el dominio de producción (`marsupia.online`). Los certificados se generan mediante Let's Encrypt y se renuevan automáticamente.
- `nginx/setup-letsencrypt.sh` - Script para obtener certificados SSL iniciales de Let's Encrypt.
- `nginx/renew-certs.sh` - Script para renovar certificados SSL expirados (diseñado para ejecutarse como cron job).
- `nginx/verificar-certificados.sh` - Script de diagnóstico para verificar que los certificados SSL están correctamente configurados y no han expirado.
- `nginx/verificar-dns.sh` - Script para verificar que la configuración DNS del dominio apunta correctamente a la IP del servidor.
- `nginx/diagnose-ssl.sh` - Script de diagnóstico completo para problemas relacionados con SSL/TLS, DNS, y conectividad.

### Mosquitto (MQTT)

- `mosquitto/mosquitto.conf` - Configuración del broker MQTT Mosquitto (opcional). Puede utilizarse para comunicación alternativa con dispositivos IoT si se requiere un protocolo de mensajería pub/sub.

### Desarrollo

- `dev/env.sample` - Plantilla de ejemplo para variables de entorno en desarrollo.
- `dev/makefile` - Makefile con comandos útiles para desarrollo local.

### Docker Compose

- `docker-compose.prod.yml` - Archivo de configuración Docker Compose para despliegue en producción. Define los servicios de base de datos, backend, frontend, y Nginx con sus respectivas configuraciones, redes, y volúmenes.

**Nota**: El despliegue principal se realiza desde la raíz del proyecto utilizando `docker-compose.yml`. Este archivo en `ops/` se mantiene como referencia o para despliegues alternativos.

## Configuración de Nginx

Nginx actúa como proxy reverso único punto de entrada para todo el tráfico HTTP/HTTPS:

- **Puerto 80 (HTTP)**: Redirige automáticamente todo el tráfico a HTTPS
- **Puerto 443 (HTTPS)**: 
  - Ruta `/` → Proxy al servicio `web` (frontend) en el puerto 5173
  - Ruta `/api/` → Proxy al servicio `api` (backend) en el puerto 8000

La configuración incluye headers de seguridad (HSTS, X-Frame-Options, etc.), soporte para WebSockets, y timeouts optimizados para diferentes tipos de peticiones.

## Certificados SSL

Los certificados SSL se gestionan mediante Let's Encrypt y Certbot. El proceso de obtención inicial requiere que:
1. El dominio `marsupia.online` esté correctamente configurado en DNS apuntando a la IP del servidor
2. Los puertos 80 y 443 estén abiertos en el firewall y Security Group de AWS
3. Nginx esté detenido temporalmente durante la obtención inicial (modo standalone de Certbot)

Una vez obtenidos, los certificados se copian al directorio `nginx/certs/` y Nginx los utiliza para servir contenido HTTPS. La renovación automática se configura mediante cron jobs que ejecutan `renew-certs.sh` periódicamente.

## Scripts de Diagnóstico

Los scripts de diagnóstico en `nginx/` permiten verificar:
- Validez y expiración de certificados SSL
- Configuración correcta de DNS
- Conectividad de red y puertos
- Configuración de Nginx

Estos scripts son útiles para troubleshooting cuando hay problemas de conectividad o configuración SSL.

## Red Docker

Todos los servicios se comunican a través de la red Docker `incubadora_net`, permitiendo que los contenedores se comuniquen entre sí utilizando los nombres de servicio como nombres de host (por ejemplo, `http://api:8000` desde el contenedor de Nginx).

