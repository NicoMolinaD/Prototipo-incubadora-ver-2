# Certificados SSL

Este directorio contiene los certificados SSL para Nginx.

## Generar Certificados

Ejecuta uno de los scripts en el directorio padre:

```bash
# Desde incubadora-neonatal/ops/nginx/
./generate-certs.sh
# o
./generate-certs-docker.sh
```

Los certificados se generarán aquí:
- `fullchain.pem` - Certificado completo
- `privkey.pem` - Clave privada

## ⚠️ Importante

- **NUNCA** subas `privkey.pem` a un repositorio público
- Los certificados autofirmados son solo para desarrollo
- Para producción, usa Let's Encrypt o un CA comercial

