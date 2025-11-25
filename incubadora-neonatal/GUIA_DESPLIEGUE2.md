# Guía de Despliegue Pt. 2

A partir de aquí, la guía detalla los pasos necesarios para desplegar la aplicación Incubadora Neonatal dentro de la máquina virtual.

## 1. Configuración de Variables de Entorno

El sistema requiere la configuración de variables de entorno en tres ubicaciones principales.

### 1.1. Raíz del Proyecto (`/`)
Se requiere un archivo `.env` en la raíz para la configuración de Docker Compose y variables compartidas.

**Opción A: Usar script de configuración (Recomendado)**
Ejecutar el script incluido para generar el archivo interactivamente:
```bash
./setup-env.sh
```

**Opción B: Manualmente**
Copia el archivo de ejemplo y ajústalo:
```bash
cp .env.example .env
```

**Contenido esperado (`.env`):**
```ini
# Configuración de Base de Datos
DATABASE_URL=postgresql+psycopg2://incubadora:incubadora@db:5432/incubadora

# CORS - Orígenes permitidos
CORS_ORIGINS=http://localhost:5173,http://localhost

# JWT Secret Key
SECRET_KEY=your-secret-key-change-in-production-use-env-var
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Info
API_TITLE=Incubadora API
API_VERSION=v0.1.0
```

### 1.2. Backend (`/backend`)
El backend necesita su propio archivo `.env` (o utiliza las variables pasadas por Docker Compose, pero es buena práctica tenerlo para desarrollo local).

```bash
cd backend
cp .env.example .env
```

### 1.3. Frontend (`/frontend/pwa`)
El frontend requiere variables de entorno para la compilación.

```bash
cd frontend/pwa
cp .env.example .env
```

## 2. Configuración de Nginx y Certificados SSL

Para que el proxy inverso Nginx funcione correctamente con HTTPS, es necesario generar los certificados SSL.

**Ubicación:** `ops/nginx/`

### Windows (PowerShell)
```powershell
cd ops/nginx
./generate-certs-windows.ps1
```

### Linux / macOS (Bash)
```bash
cd ops/nginx
chmod +x generate-certs.sh
./generate-certs.sh
```

> **Nota:** Esto generará certificados autofirmados en la carpeta `ops/nginx/certs`. Para producción, considere usar certificados válidos (Let's Encrypt).

## 3. Despliegue con Docker

Una vez configuradas las variables de entorno y generados los certificados, levante los servicios con Docker Compose.

**Desde la raíz del proyecto:**

```bash
docker compose up -d --build
```

### Solución de problemas de permisos (Linux)
Si encuentra errores de permisos (ej. "permission denied" al conectar al socket de Docker), use `sudo`:

```bash
sudo docker compose up -d --build
```

### Verificar el estado
Para ver si los contenedores están corriendo:
```bash
docker compose ps
```

Para ver los logs:
```bash
docker compose logs -f
```
