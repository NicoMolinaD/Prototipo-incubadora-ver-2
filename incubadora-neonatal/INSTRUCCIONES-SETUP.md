# Instrucciones para Configurar el Sistema desde la Raíz

## Resumen de Cambios

Se ha actualizado la configuración para que todo funcione desde la carpeta raíz (`incubadora-neonatal/`) en lugar de desde `ops/`.

## Pasos para Configurar

### 1. Crear el archivo .env

Ejecuta el script de configuración:

```bash
cd incubadora-neonatal
chmod +x setup-env.sh
./setup-env.sh
```

O crea manualmente el archivo `.env` en la raíz con este contenido:

```env
# Configuración de Base de Datos (debe coincidir con docker-compose.yml)
DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora

# CORS - Orígenes permitidos (incluye el dominio de producción)
CORS_ORIGINS=https://marsupia.online,https://www.marsupia.online,http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,ionic://localhost,http://localhost

# JWT Secret Key
SECRET_KEY=your-secret-key-change-in-production-use-env-var
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Collector (opcional)
ESP32_DEVICES=
COLLECT_PERIOD_MS=5000

# API Info
API_TITLE=Incubadora API
API_VERSION=v0.1.0
```

### 2. Detener servicios anteriores (si están corriendo)

Si tienes servicios corriendo desde `ops/`, deténlos primero:

```bash
cd ops
docker compose -f docker-compose.prod.yml down
cd ..
```

### 3. Iniciar los servicios desde la raíz

```bash
cd incubadora-neonatal
docker compose up -d --build
```

### 4. Verificar que los servicios estén corriendo

```bash
docker compose ps
```

Deberías ver 4 servicios corriendo:
- `db` (PostgreSQL)
- `api` (Backend FastAPI)
- `web` (Frontend)
- `nginx` (Proxy reverso)

### 5. Verificar los logs

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api
docker compose logs -f web
docker compose logs -f nginx
```

## Configuración del Dominio

El sistema está configurado para funcionar con el dominio `marsupia.online`. 

### Certificados SSL

Asegúrate de que los certificados SSL estén en:
```
incubadora-neonatal/ops/nginx/certs/
  - fullchain.pem
  - privkey.pem
```

Si no tienes los certificados, puedes generarlos usando los scripts en `ops/nginx/`.

### Nginx

Nginx está configurado para:
- Redirigir HTTP (puerto 80) a HTTPS (puerto 443)
- Servir el frontend en `/`
- Servir la API en `/api/` → redirige a `http://api:8000/`

El frontend está configurado para usar `/api/incubadora` automáticamente cuando se sirve desde el dominio.

## Estructura de Redes

Todos los servicios están en la misma red Docker (`incubadora_net`) para que puedan comunicarse entre sí:
- `db` → Base de datos PostgreSQL
- `api` → Backend FastAPI (puerto 8000 interno)
- `web` → Frontend (puerto 5173 interno)
- `nginx` → Proxy reverso (puertos 80 y 443 expuestos)

## Solución de Problemas

### Si nginx no puede conectarse a los servicios

Verifica que todos los servicios estén en la misma red:
```bash
docker network inspect incubadora-neonatal_incubadora_net
```

### Si la API no responde

Verifica que el backend esté corriendo y que la base de datos esté lista:
```bash
docker compose logs api
docker compose logs db
```

### Si el frontend no carga

Verifica que el servicio web esté corriendo:
```bash
docker compose logs web
```

### Si hay problemas con CORS

Asegúrate de que el dominio esté en `CORS_ORIGINS` en el archivo `.env`.

## Comandos Útiles

```bash
# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes (¡CUIDADO! Esto borra la base de datos)
docker compose down -v

# Reconstruir imágenes
docker compose build --no-cache

# Ver estado de los servicios
docker compose ps

# Acceder a los logs
docker compose logs -f [servicio]
```

