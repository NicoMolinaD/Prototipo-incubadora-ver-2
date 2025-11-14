# Backend - API FastAPI

API REST desarrollada en Python utilizando FastAPI para el sistema de monitoreo de incubadoras neonatales. El backend gestiona la ingesta de datos de sensores, almacenamiento en base de datos PostgreSQL, autenticación de usuarios, gestión de dispositivos, consultas históricas, y generación de alertas.

## Estructura del Código

### Aplicación Principal

- `app/main.py` - Punto de entrada de la aplicación FastAPI. Configura el middleware CORS, registra todos los routers bajo el prefijo `/incubadora`, y expone el endpoint de salud `/healthz`.

### Modelos de Datos

- `app/models.py` - Define los modelos SQLAlchemy para la base de datos:
  - `Measurement`: Almacena las mediciones de sensores (temperatura, humedad, peso, timestamps)
  - `User`: Gestión de usuarios con autenticación, roles de administrador, y estado activo/inactivo
  - `Device`: Representa dispositivos ESP32 vinculados a usuarios, con información de última conexión

### Routers (Endpoints API)

- `app/routers/ingest.py` - Endpoint `/ingest` para recibir datos de sensores desde dispositivos ESP32. Soporta múltiples formatos de payload (JSON estructurado, texto plano con parsing automático).
- `app/routers/query.py` - Endpoints para consultar datos históricos: `/query/devices`, `/query/latest`, `/query/series` con filtros por dispositivo y rango temporal.
- `app/routers/alerts.py` - Gestión de alertas generadas automáticamente basadas en umbrales de temperatura, humedad y otros parámetros.
- `app/routers/auth.py` - Autenticación y registro de usuarios: `/register`, `/login` con OAuth2 password flow, generación de tokens JWT.
- `app/routers/devices.py` - Gestión de dispositivos: vinculación/desvinculación de dispositivos a usuarios, listado de dispositivos disponibles.
- `app/routers/models_router.py` - Gestión de modelos de machine learning: estado del modelo, entrenamiento en background.

### Utilidades y Servicios

- `app/db.py` - Configuración de la conexión a PostgreSQL mediante SQLAlchemy, sesiones de base de datos, y función de dependencia para inyección en endpoints.
- `app/auth.py` - Funciones de seguridad: hashing de contraseñas con bcrypt, verificación de contraseñas, generación y validación de tokens JWT.
- `app/deps.py` - Dependencias reutilizables para FastAPI: obtención del usuario actual autenticado, verificación de permisos de administrador.
- `app/settings.py` - Configuración centralizada mediante Pydantic Settings. Lee variables de entorno desde `.env`, incluye configuración de CORS, base de datos, JWT, y parámetros del colector de datos.
- `app/schemas.py` - Esquemas Pydantic para validación de datos de entrada y serialización de respuestas.
- `app/collector.py` - Módulo opcional para recolección automática de datos desde dispositivos ESP32 externos mediante polling HTTP.

### Migraciones de Base de Datos

- `alembic/` - Directorio de migraciones de Alembic para gestión de esquema de base de datos:
  - `20251103_0001_create_measurements.py` - Creación inicial de la tabla de mediciones
  - `20251113_0002_create_users.py` - Creación de la tabla de usuarios
  - `20251113_0003_create_devices.py` - Creación de la tabla de dispositivos

### Scripts de Utilidad

- `scripts/export_csv.py` - Exportación de datos históricos a formato CSV
- `scripts/retrain_ml.py` - Script para reentrenar modelos de machine learning
- `scripts/seed_data.py` - Población inicial de la base de datos con datos de prueba

### Tests

- `tests/` - Suite de tests unitarios e integración:
  - `test_ingest.py` - Tests de ingesta de datos
  - `test_query.py` - Tests de consultas a la base de datos
  - `tests_alerts.py` - Tests del sistema de alertas
  - `tests_models.py` - Tests de gestión de modelos

## Configuración

El backend se configura mediante variables de entorno definidas en el archivo `.env` en la raíz del proyecto:

- `DATABASE_URL` - URL de conexión a PostgreSQL (formato: `postgresql+psycopg2://user:password@host:port/database`)
- `CORS_ORIGINS` - Lista separada por comas de orígenes permitidos para CORS
- `SECRET_KEY` - Clave secreta para firmar tokens JWT
- `JWT_ALGORITHM` - Algoritmo de firma JWT (por defecto HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Tiempo de expiración de tokens JWT
- `ESP32_DEVICES` - Lista opcional de URLs de dispositivos ESP32 para recolección automática
- `COLLECT_PERIOD_MS` - Período de recolección en milisegundos

## Despliegue

El backend se despliega como contenedor Docker. El `Dockerfile` construye una imagen basada en Python 3.11-slim, instala dependencias desde `requirements.txt`, y utiliza `docker-entrypoint.sh` como script de arranque.

El script de entrada (`docker-entrypoint.sh`) espera a que la base de datos esté disponible, ejecuta migraciones de Alembic automáticamente, y luego inicia el servidor Uvicorn en el puerto 8000.

## Dependencias Principales

- `fastapi` - Framework web asíncrono
- `uvicorn` - Servidor ASGI
- `sqlalchemy` - ORM para PostgreSQL
- `psycopg2-binary` - Driver de PostgreSQL
- `alembic` - Migraciones de base de datos
- `pydantic` / `pydantic-settings` - Validación de datos y configuración
- `python-jose[cryptography]` - Manejo de tokens JWT
- `passlib[bcrypt]` - Hashing de contraseñas

