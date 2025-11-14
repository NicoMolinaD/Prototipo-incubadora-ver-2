# Sistema de Monitoreo de Incubadora Neonatal

Sistema completo de monitoreo y gestión para incubadoras neonatales que integra hardware embebido, backend API, frontend web y servicios de infraestructura. El sistema permite la recolección de datos en tiempo real de sensores, almacenamiento en base de datos, visualización mediante interfaz web, y gestión de alertas y dispositivos.

## Arquitectura del Sistema

El proyecto está estructurado en cuatro componentes principales:

### Backend (FastAPI)
API REST desarrollada en Python con FastAPI que gestiona la ingesta de datos de sensores, consultas históricas, sistema de autenticación con JWT, gestión de usuarios y dispositivos, y generación de alertas. Utiliza PostgreSQL como base de datos y Alembic para migraciones.

### Frontend (React + TypeScript)
Aplicación web progresiva (PWA) desarrollada con React, TypeScript y Vite. Proporciona una interfaz de usuario para visualización de datos en tiempo real, gestión de dispositivos, administración de usuarios, dashboards con gráficos de series temporales, y soporte para conexión Bluetooth con dispositivos ESP32.

### Firmware (ESP32-S3)
Código embebido para microcontroladores ESP32-S3 que gestiona la lectura de sensores (temperatura, humedad, peso), control de actuadores (calefacción, humidificación), comunicación Bluetooth Low Energy (BLE), y envío de datos al backend mediante HTTP.

### Infraestructura (Docker + Nginx)
Configuración de despliegue con Docker Compose que orquesta los servicios de base de datos, backend, frontend y proxy reverso Nginx. Incluye configuración SSL/TLS para el dominio de producción, scripts de gestión de certificados, y configuración de red interna entre contenedores.

## Estructura del Proyecto

```
incubadora-neonatal/
├── backend/          # API FastAPI con modelos, routers y lógica de negocio
├── frontend/         # Aplicación React PWA
│   └── pwa/         # Código fuente del frontend
├── firmware/         # Código embebido para ESP32-S3
│   └── esp32-s3/    # Proyecto Arduino/PlatformIO
├── ops/              # Configuración de infraestructura
│   ├── nginx/       # Configuración de Nginx y certificados SSL
│   └── mosquitto/   # Configuración de MQTT (opcional)
├── docs/             # Documentación técnica
├── docker-compose.yml # Orquestación de servicios
└── .env              # Variables de entorno (no versionado)
```

## Despliegue

El sistema se despliega mediante Docker Compose desde la raíz del proyecto. Todos los servicios se comunican a través de una red Docker interna (`incubadora_net`), y Nginx actúa como proxy reverso exponiendo los puertos 80 (HTTP) y 443 (HTTPS) al exterior.

El dominio de producción está configurado para `marsupia.online`, con redirección automática de HTTP a HTTPS y certificados SSL gestionados mediante Let's Encrypt.

## Configuración

La configuración del sistema se gestiona mediante variables de entorno definidas en el archivo `.env` en la raíz del proyecto. Este archivo contiene la URL de conexión a la base de datos, orígenes CORS permitidos, clave secreta para JWT, y otras configuraciones del backend.

El script `setup-env.sh` facilita la creación inicial del archivo `.env` con valores por defecto apropiados para producción.

## Documentación Adicional

- `docs/API.md` - Documentación de la API REST
- `docs/ARCHITECTURE.md` - Detalles de arquitectura del sistema
- `docs/SENSORS.md` - Especificaciones de sensores y hardware
- `docs/THREATS.md` - Análisis de amenazas y seguridad
- `INSTRUCCIONES-SETUP.md` - Guía de configuración inicial
- `ENV_SETUP.md` - Documentación de variables de entorno

