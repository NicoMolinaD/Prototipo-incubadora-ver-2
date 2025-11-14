# Certificados SSL

Este directorio contiene los certificados SSL/TLS utilizados por Nginx para servir contenido HTTPS en el dominio de producción `marsupia.online`.

## Archivos

- `fullchain.pem` - Certificado completo que incluye el certificado del servidor y la cadena de certificados intermedios de Let's Encrypt
- `privkey.pem` - Clave privada del certificado, utilizada por Nginx para establecer conexiones SSL/TLS

## Obtención de Certificados

Los certificados se obtienen mediante Let's Encrypt utilizando Certbot. El script `setup-letsencrypt.sh` en el directorio padre automatiza el proceso de obtención inicial, copia los certificados a este directorio, y ajusta los permisos apropiados.

Los certificados de Let's Encrypt tienen una validez de 90 días y deben renovarse periódicamente. El script `renew-certs.sh` gestiona la renovación automática y reinicia Nginx para cargar los nuevos certificados.

## Permisos

Los archivos de certificados tienen permisos restrictivos:
- `fullchain.pem`: 644 (lectura para todos, escritura solo para propietario)
- `privkey.pem`: 600 (lectura/escritura solo para propietario)

Estos permisos son esenciales para la seguridad, ya que la clave privada no debe ser accesible por otros usuarios o procesos.

## Montaje en Docker

Este directorio se monta como volumen de solo lectura en el contenedor de Nginx mediante Docker Compose. La ruta de montaje es `/etc/nginx/certs:ro`, lo que permite que Nginx lea los certificados sin posibilidad de modificación desde dentro del contenedor.

## Renovación

Cuando los certificados se renuevan mediante `renew-certs.sh`, los nuevos archivos se copian desde `/etc/letsencrypt/live/marsupia.online/` a este directorio, y Nginx se reinicia automáticamente para cargar los certificados actualizados.

## Seguridad

- **NUNCA** se deben subir los archivos de este directorio, especialmente `privkey.pem`, a repositorios públicos
- Los certificados están incluidos en `.gitignore` para prevenir commits accidentales
- En caso de compromiso de la clave privada, los certificados deben revocarse inmediatamente mediante Let's Encrypt

