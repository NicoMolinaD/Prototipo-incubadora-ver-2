# Configuración de Variables de Entorno

Este documento explica cómo configurar los archivos `.env` necesarios para el despliegue.

## Estructura de Archivos .env

El proyecto requiere archivos `.env` en las siguientes ubicaciones:

1. **`backend/.env`** - Variables del backend (API)
2. **`frontend/pwa/.env`** - Variables del frontend (opcional en desarrollo)
3. **`.env`** (raíz) - Variables para docker-compose (opcional)

## Pasos de Configuración

### 1. Backend (.env)

Copia el archivo de ejemplo y ajusta los valores:

```bash
cd incubadora-neonatal/backend
cp .env.example .env
```

Edita `backend/.env` y configura:

- **DATABASE_URL**: URL de conexión a PostgreSQL
- **SECRET_KEY**: Clave secreta para JWT (generar con `openssl rand -hex 32`)
- **CORS_ORIGINS**: Orígenes permitidos para CORS (incluye orígenes para web y Capacitor Android/iOS)
- **ESP32_DEVICES**: URLs de dispositivos ESP32 (opcional)
- **COLLECT_PERIOD_MS**: Periodo de recolección de datos

### 2. Frontend (.env)

Para desarrollo local, el frontend usa el proxy de Vite, por lo que `.env` es opcional.

Para producción, crea `frontend/pwa/.env`:

```bash
cd incubadora-neonatal/frontend/pwa
cp .env.example .env
```

Edita `frontend/pwa/.env` y configura:

- **VITE_API_BASE**: URL base de la API (solo necesario en producción o si no usas proxy)

### 3. Docker Compose (.env en raíz)

Opcional, solo si necesitas cambiar las credenciales de PostgreSQL en docker-compose:

```bash
cd incubadora-neonatal
cp .env.example .env
```

## Variables Importantes

### Desarrollo Local

**backend/.env:**
```env
DATABASE_URL=postgresql+psycopg2://incu:incu@db:5432/incu
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,ionic://localhost,http://localhost
SECRET_KEY=dev-secret-key-change-in-production
ESP32_DEVICES=
COLLECT_PERIOD_MS=5000
```

**frontend/pwa/.env:**
```env
# Dejar vacío para usar proxy de desarrollo
VITE_API_BASE=
```

### Producción

**backend/.env:**
```env
DATABASE_URL=postgresql+psycopg2://usuario:contraseña_segura@host:5432/db
CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
SECRET_KEY=<generar con openssl rand -hex 32>
ESP32_DEVICES=http://192.168.1.100,http://192.168.1.101
COLLECT_PERIOD_MS=5000
```

**frontend/pwa/.env:**
```env
VITE_API_BASE=https://api.tu-dominio.com/api/incubadora
```

## Generar SECRET_KEY Segura

Para producción, genera una clave secreta segura:

```bash
openssl rand -hex 32
```

Copia el resultado y úsalo como valor de `SECRET_KEY` en `backend/.env`.

## Notas de Seguridad

1. **NUNCA** subas archivos `.env` al repositorio (ya están en `.gitignore`)
2. **SIEMPRE** cambia `SECRET_KEY` en producción
3. **USA** contraseñas seguras para la base de datos en producción
4. **CONFIGURA** CORS_ORIGINS solo con los dominios que necesitas
5. **CAPACITOR**: Los orígenes `capacitor://localhost`, `ionic://localhost` y `http://localhost` están incluidos por defecto para soportar aplicaciones móviles nativas

## Configuración para Capacitor (Android/iOS)

Cuando uses la aplicación con Capacitor en dispositivos móviles nativos, las peticiones HTTP pueden venir desde diferentes orígenes:

- **Android**: `http://localhost` (sin puerto)
- **iOS**: `capacitor://localhost`
- **Ionic/Capacitor**: `ionic://localhost`

Estos orígenes están incluidos por defecto en `CORS_ORIGINS`. Si necesitas agregar más orígenes específicos, puedes hacerlo separándolos por comas:

```env
CORS_ORIGINS=http://localhost:5173,capacitor://localhost,ionic://localhost,http://localhost,https://tu-dominio.com
```

**Nota**: En producción, asegúrate de incluir también el dominio de tu servidor si la app móvil hace peticiones directas al backend.

## Verificación

Después de configurar los `.env`, verifica que todo funcione:

```bash
# Backend
cd incubadora-neonatal/backend
python -c "from app.settings import settings; print('Settings loaded:', settings.api_title)"

# Frontend (si configuraste VITE_API_BASE)
cd incubadora-neonatal/frontend/pwa
npm run build
```

