# Análisis de Amenazas y Seguridad

Documentación del análisis de amenazas de seguridad, vulnerabilidades identificadas, y medidas de mitigación implementadas en el sistema de monitoreo de incubadoras neonatales.

## Contexto de Seguridad

El sistema maneja información crítica relacionada con la salud de neonatos, incluyendo datos de sensores en tiempo real, información de usuarios, y control de dispositivos médicos. La seguridad es fundamental para garantizar la integridad de los datos, la disponibilidad del sistema, y la privacidad de la información.

## Amenazas Identificadas

### 1. Acceso No Autorizado a la API

**Descripción:** Atacantes intentan acceder a endpoints protegidos sin autenticación válida o con credenciales robadas.

**Vectores de Ataque:**
- Fuerza bruta en endpoint de login
- Robo de tokens JWT
- Reutilización de tokens expirados
- Ataques de inyección en formularios de autenticación

**Medidas de Mitigación Implementadas:**
- Autenticación mediante tokens JWT con expiración configurable (30 minutos por defecto)
- Hashing de contraseñas con bcrypt y salt automático
- Validación de tokens en cada petición mediante middleware de FastAPI
- Headers de seguridad (HSTS, X-Frame-Options) para prevenir ataques de sesión

**Recomendaciones Adicionales:**
- Implementar rate limiting en endpoints de autenticación
- Agregar verificación de dos factores (2FA) para usuarios administradores
- Monitoreo de intentos de login fallidos
- Rotación periódica de la clave secreta JWT

### 2. Exposición de Datos Sensibles

**Descripción:** Información confidencial de usuarios o datos de pacientes expuestos mediante vulnerabilidades en la aplicación o configuración incorrecta.

**Vectores de Ataque:**
- Logs que contienen información sensible
- Respuestas de API que exponen más información de la necesaria
- Archivos de configuración con credenciales en repositorios públicos
- Errores de aplicación que revelan información del sistema

**Medidas de Mitigación Implementadas:**
- Variables de entorno para credenciales (no hardcodeadas)
- Esquemas Pydantic que limitan los campos expuestos en respuestas
- Validación estricta de entrada para prevenir inyección
- Archivo `.env` excluido del control de versiones

**Recomendaciones Adicionales:**
- Encriptación de datos sensibles en la base de datos
- Auditoría de logs para detectar accesos no autorizados
- Implementar políticas de retención de datos
- Revisión periódica de permisos de acceso

### 3. Ataques de Inyección

**Descripción:** Atacantes intentan ejecutar código malicioso o manipular consultas mediante inyección SQL, inyección de comandos, o inyección de templates.

**Vectores de Ataque:**
- Inyección SQL en consultas a la base de datos
- Inyección de comandos en scripts del sistema
- Manipulación de parámetros de URL o cuerpo de peticiones

**Medidas de Mitigación Implementadas:**
- Uso de ORM (SQLAlchemy) que previene inyección SQL mediante consultas parametrizadas
- Validación de entrada mediante esquemas Pydantic
- Sanitización de datos antes de almacenamiento
- Parsing seguro de datos de texto desde dispositivos ESP32

**Recomendaciones Adicionales:**
- Implementar WAF (Web Application Firewall) en Nginx
- Revisión de código para identificar puntos de inyección potenciales
- Pruebas de penetración regulares
- Monitoreo de patrones sospechosos en peticiones

### 4. Ataques de Denegación de Servicio (DoS)

**Descripción:** Atacantes intentan sobrecargar el sistema para hacerlo inaccesible a usuarios legítimos.

**Vectores de Ataque:**
- Peticiones HTTP masivas al backend
- Ataques de amplificación
- Consumo excesivo de recursos mediante peticiones complejas

**Medidas de Mitigación Implementadas:**
- Timeouts configurados en Nginx para prevenir conexiones colgadas
- Health checks en la base de datos para detectar problemas temprano
- Restart policies en Docker para recuperación automática

**Recomendaciones Adicionales:**
- Implementar rate limiting en Nginx o en el backend
- Configurar límites de recursos en contenedores Docker
- Utilizar servicios de protección DDoS (Cloudflare, AWS Shield)
- Monitoreo de métricas de rendimiento

### 5. Interceptación de Comunicaciones

**Descripción:** Atacantes interceptan comunicaciones entre componentes del sistema para leer o modificar datos en tránsito.

**Vectores de Ataque:**
- Man-in-the-middle (MITM) en conexiones no encriptadas
- Interceptación de tokens JWT en tráfico HTTP
- Sniffing de comunicaciones Bluetooth

**Medidas de Mitigación Implementadas:**
- HTTPS obligatorio con redirección automática de HTTP
- Certificados SSL/TLS de Let's Encrypt con renovación automática
- Headers HSTS para forzar HTTPS en navegadores
- Tokens JWT transmitidos solo sobre HTTPS

**Recomendaciones Adicionales:**
- Implementar certificate pinning en aplicaciones móviles
- Utilizar BLE con encriptación para comunicaciones Bluetooth
- Revisión periódica de configuración SSL/TLS
- Monitoreo de certificados próximos a expirar

### 6. Vulnerabilidades en Dependencias

**Descripción:** Bibliotecas o frameworks utilizados contienen vulnerabilidades conocidas que pueden ser explotadas.

**Vectores de Ataque:**
- Explotación de vulnerabilidades en dependencias de Python
- Vulnerabilidades en imágenes Docker base
- Dependencias desactualizadas con CVE conocidos

**Medidas de Mitigación Implementadas:**
- Uso de versiones específicas de dependencias en `requirements.txt`
- Imágenes Docker oficiales y mantenidas
- Actualización periódica de dependencias

**Recomendaciones Adicionales:**
- Escaneo automático de vulnerabilidades (Dependabot, Snyk)
- Actualización regular de dependencias
- Revisión de changelogs antes de actualizar
- Monitoreo de avisos de seguridad

### 7. Acceso No Autorizado a Dispositivos

**Descripción:** Atacantes intentan acceder a dispositivos ESP32 o manipular datos enviados desde los dispositivos.

**Vectores de Ataque:**
- Envío de datos falsos desde dispositivos comprometidos
- Acceso no autorizado a dispositivos mediante WiFi o Bluetooth
- Manipulación de firmware en dispositivos

**Medidas de Mitigación Implementadas:**
- Vinculación de dispositivos a usuarios específicos
- Validación de datos recibidos en el backend
- Autenticación requerida para vincular dispositivos

**Recomendaciones Adicionales:**
- Autenticación mutua entre dispositivos y backend
- Firmware signing para prevenir modificaciones
- Encriptación de comunicaciones WiFi
- Monitoreo de anomalías en datos recibidos

### 8. Escalación de Privilegios

**Descripción:** Usuarios regulares intentan obtener privilegios de administrador o acceder a recursos restringidos.

**Vectores de Ataque:**
- Manipulación de tokens JWT para cambiar roles
- Explotación de vulnerabilidades en lógica de autorización
- Acceso a endpoints de administración mediante fuerza bruta

**Medidas de Mitigación Implementadas:**
- Verificación de roles en cada endpoint mediante dependencias de FastAPI
- Tokens JWT firmados que incluyen información de roles
- Validación estricta de permisos antes de operaciones sensibles
- Prevención de auto-modificación de roles (no se puede cambiar el propio estado de admin)

**Recomendaciones Adicionales:**
- Auditoría de cambios de roles
- Principio de menor privilegio en asignación de permisos
- Revisión periódica de usuarios con privilegios elevados
- Logging de todas las operaciones administrativas

## Configuración de Seguridad

### Variables de Entorno

Las credenciales y configuraciones sensibles se gestionan mediante variables de entorno:
- `SECRET_KEY`: Clave secreta para firmar tokens JWT (debe ser fuerte y única)
- `DATABASE_URL`: Credenciales de base de datos
- `CORS_ORIGINS`: Lista restrictiva de orígenes permitidos

### Headers de Seguridad

Nginx está configurado con los siguientes headers de seguridad:
- `Strict-Transport-Security`: Fuerza HTTPS
- `X-Frame-Options`: Previene clickjacking
- `X-Content-Type-Options`: Previene MIME sniffing
- `Permissions-Policy`: Restringe características del navegador

### Base de Datos

- Credenciales almacenadas en variables de entorno
- Conexiones solo desde la red Docker interna
- Health checks para detectar problemas de conexión

## Mejoras de Seguridad Recomendadas

### Corto Plazo
1. Implementar rate limiting en endpoints de autenticación
2. Agregar logging de eventos de seguridad
3. Configurar alertas para intentos de acceso fallidos
4. Revisar y actualizar dependencias regularmente

### Mediano Plazo
1. Implementar autenticación de dos factores (2FA)
2. Agregar encriptación de datos sensibles en la base de datos
3. Implementar WAF en Nginx
4. Configurar monitoreo de seguridad continuo

### Largo Plazo
1. Realizar auditorías de seguridad periódicas
2. Implementar sistema de gestión de vulnerabilidades
3. Desarrollar plan de respuesta a incidentes
4. Capacitación en seguridad para desarrolladores

## Cumplimiento y Regulaciones

El sistema debe cumplir con regulaciones aplicables según el contexto de uso:
- **HIPAA** (si se usa en Estados Unidos): Requiere medidas específicas para protección de información de salud
- **GDPR** (si se usa en Europa): Requiere protección de datos personales y derecho al olvido
- **Regulaciones locales**: Verificar requisitos específicos del país de despliegue

## Responsabilidades

- **Desarrolladores**: Implementar medidas de seguridad, revisar código, actualizar dependencias
- **Administradores**: Configurar correctamente el sistema, gestionar credenciales, monitorear logs
- **Usuarios**: Utilizar contraseñas fuertes, no compartir credenciales, reportar incidentes

## Reporte de Vulnerabilidades

Las vulnerabilidades de seguridad deben reportarse de forma responsable. Se recomienda establecer un proceso de divulgación responsable que permita corregir vulnerabilidades antes de su divulgación pública.

