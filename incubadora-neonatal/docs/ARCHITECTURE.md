# Arquitectura del Sistema

Documentación de la arquitectura del sistema de monitoreo de incubadoras neonatales, describiendo los componentes, sus interacciones, y el flujo de datos.

## Visión General

El sistema está diseñado como una arquitectura distribuida de múltiples capas que integra hardware embebido, backend API, frontend web, y servicios de infraestructura. La comunicación entre componentes utiliza protocolos estándar (HTTP, BLE, I2C) y el despliegue se realiza mediante contenedores Docker orquestados con Docker Compose.

## Componentes Principales

### 1. Hardware Embebido (ESP32-S3)

El microcontrolador ESP32-S3 actúa como el nodo de adquisición de datos y control local. Se comunica con múltiples sensores mediante I2C a través de un multiplexor TCA9548A, lee datos de temperatura, humedad y peso, controla actuadores (calefacción, humidificación), y proporciona comunicación inalámbrica mediante Bluetooth Low Energy (BLE) y WiFi.

**Responsabilidades:**
- Lectura continua de sensores (SHT41, SHT31, HX711)
- Control de actuadores mediante TRIAC y PWM
- Visualización local en pantallas OLED
- Transmisión de datos al backend mediante HTTP
- Servicio BLE para conexión directa con el frontend

### 2. Backend API (FastAPI)

API REST desarrollada en Python que gestiona la lógica de negocio, almacenamiento de datos, autenticación, y procesamiento de alertas. Utiliza PostgreSQL como base de datos relacional y SQLAlchemy como ORM.

**Responsabilidades:**
- Ingesta de datos de sensores desde dispositivos ESP32
- Almacenamiento persistente en base de datos PostgreSQL
- Autenticación y autorización mediante JWT
- Gestión de usuarios y dispositivos
- Consultas históricas y series temporales
- Generación y gestión de alertas
- API REST para el frontend

**Tecnologías:**
- FastAPI: Framework web asíncrono
- SQLAlchemy: ORM para PostgreSQL
- Alembic: Migraciones de base de datos
- Pydantic: Validación de datos
- Python-JOSE: Manejo de tokens JWT
- Passlib: Hashing de contraseñas

### 3. Frontend Web (React PWA)

Aplicación web progresiva desarrollada con React y TypeScript que proporciona la interfaz de usuario para visualización de datos, gestión de dispositivos, y administración del sistema.

**Responsabilidades:**
- Visualización de datos en tiempo real mediante gráficos
- Gestión de dispositivos (vinculación, desvinculación)
- Administración de usuarios (solo administradores)
- Autenticación y gestión de sesión
- Conexión Bluetooth directa con dispositivos ESP32
- Dashboards con series temporales

**Tecnologías:**
- React 18: Biblioteca de interfaz de usuario
- TypeScript: Tipado estático
- Vite: Herramienta de construcción
- React Router: Enrutamiento del lado del cliente
- Recharts: Visualización de gráficos
- Tailwind CSS: Estilos utility-first

### 4. Base de Datos (PostgreSQL)

Base de datos relacional que almacena todas las mediciones, usuarios, dispositivos, y metadatos del sistema.

**Esquema Principal:**
- `measurements`: Almacena todas las mediciones de sensores con timestamps
- `users`: Información de usuarios, credenciales hasheadas, y roles
- `devices`: Registro de dispositivos ESP32 y su vinculación con usuarios

### 5. Proxy Reverso (Nginx)

Servidor web que actúa como punto de entrada único para todo el tráfico HTTP/HTTPS, enrutando peticiones al frontend o backend según la ruta.

**Responsabilidades:**
- Terminación SSL/TLS con certificados Let's Encrypt
- Redirección automática de HTTP a HTTPS
- Proxy reverso para frontend (ruta `/`)
- Proxy reverso para backend API (ruta `/api/`)
- Headers de seguridad (HSTS, X-Frame-Options, etc.)

## Flujo de Datos

### Flujo de Ingesta de Datos

1. **Adquisición Local**: El ESP32-S3 lee datos de sensores en un loop continuo
2. **Procesamiento Local**: Los datos se procesan, se calculan alertas, y se muestran en pantallas OLED
3. **Transmisión**: Los datos se envían al backend mediante petición HTTP POST a `/api/incubadora/ingest`
4. **Validación**: El backend valida los datos mediante esquemas Pydantic
5. **Almacenamiento**: Los datos se persisten en la tabla `measurements` de PostgreSQL
6. **Respuesta**: El backend retorna confirmación con el ID de la medición almacenada

### Flujo de Consulta de Datos

1. **Petición del Frontend**: El usuario solicita datos mediante la interfaz web
2. **Autenticación**: El frontend incluye el token JWT en el header Authorization
3. **Validación de Token**: El backend valida el token y extrae información del usuario
4. **Consulta a Base de Datos**: Se ejecuta una consulta SQL filtrada por dispositivos vinculados al usuario
5. **Serialización**: Los resultados se serializan a JSON mediante Pydantic
6. **Respuesta**: El frontend recibe los datos y los visualiza en gráficos o tablas

### Flujo de Conexión Bluetooth

1. **Detección**: El frontend escanea dispositivos BLE disponibles mediante Web Bluetooth API
2. **Conexión**: El usuario selecciona un dispositivo ESP32 y establece conexión BLE
3. **Suscripción**: El frontend se suscribe a notificaciones del servicio UART del ESP32
4. **Recepción de Datos**: El ESP32 envía datos en formato texto UTF-8 cuando hay nuevas mediciones
5. **Parsing**: El frontend parsea los datos recibidos y los muestra en tiempo real
6. **Opcional - Envío al Backend**: Los datos pueden enviarse al backend para almacenamiento

## Arquitectura de Red

### Red Docker Interna

Todos los servicios se ejecutan en contenedores Docker conectados a la red interna `incubadora_net`. Esta red permite que los contenedores se comuniquen entre sí utilizando nombres de servicio como nombres de host:

- `db`: Base de datos PostgreSQL (puerto 5432 interno)
- `api`: Backend FastAPI (puerto 8000 interno)
- `web`: Frontend React (puerto 5173 interno)
- `nginx`: Proxy reverso (puertos 80 y 443 expuestos al exterior)

### Comunicación Externa

- **Puerto 80 (HTTP)**: Redirige automáticamente a HTTPS
- **Puerto 443 (HTTPS)**: Punto de entrada principal con certificados SSL/TLS
- **Dispositivos ESP32**: Se conectan al backend mediante WiFi y HTTP sobre HTTPS

## Seguridad

### Autenticación y Autorización

- **JWT Tokens**: Tokens firmados con algoritmo HS256, expiración configurable
- **Hashing de Contraseñas**: Bcrypt con salt automático
- **Roles**: Sistema de usuarios con roles de administrador y usuario regular
- **Protección de Rutas**: Endpoints protegidos mediante dependencias de FastAPI

### Comunicación Segura

- **HTTPS**: Todo el tráfico HTTP se redirige a HTTPS
- **Certificados SSL/TLS**: Let's Encrypt con renovación automática
- **Headers de Seguridad**: HSTS, X-Frame-Options, X-Content-Type-Options
- **CORS**: Configuración restrictiva de orígenes permitidos

### Aislamiento de Datos

- **Vinculación de Dispositivos**: Los usuarios solo pueden acceder a datos de sus dispositivos vinculados
- **Validación de Permisos**: Verificación en cada endpoint de que el usuario tiene acceso al recurso solicitado
- **Base de Datos**: Credenciales almacenadas en variables de entorno, no en código

## Escalabilidad

### Horizontal

El sistema está diseñado para escalar horizontalmente:
- Múltiples instancias del backend pueden ejecutarse detrás de un load balancer
- La base de datos PostgreSQL puede configurarse en modo réplica para lectura
- El frontend es estático y puede servirse desde CDN

### Vertical

- La base de datos puede escalarse aumentando recursos del contenedor
- El backend puede manejar múltiples peticiones concurrentes mediante Uvicorn con workers

## Monitoreo y Logs

- **Logs de Contenedores**: Docker Compose gestiona los logs de todos los servicios
- **Health Checks**: La base de datos incluye health checks para verificar disponibilidad
- **Endpoint de Salud**: `/healthz` permite verificar el estado del backend

## Despliegue

El sistema se despliega mediante Docker Compose desde la raíz del proyecto. El archivo `docker-compose.yml` define todos los servicios, sus dependencias, redes, y volúmenes. El despliegue es idempotente y puede reproducirse en cualquier entorno que tenga Docker instalado.

Los servicios se inician en orden según sus dependencias:
1. Base de datos (con health check)
2. Backend (espera a que la base de datos esté lista)
3. Frontend (depende del backend)
4. Nginx (depende de frontend y backend)

