# Documentación de la API REST

Documentación completa de los endpoints de la API REST del sistema de monitoreo de incubadoras neonatales. La API está desarrollada con FastAPI y utiliza autenticación basada en tokens JWT.

## Base URL

Todos los endpoints están bajo el prefijo `/api/incubadora`, por lo que la URL base completa es:
- Producción: `https://marsupia.online/api/incubadora`
- Desarrollo: `http://localhost:8000/api/incubadora`

## Autenticación

La mayoría de los endpoints requieren autenticación mediante tokens JWT. El token se obtiene mediante el endpoint `/auth/login` y debe incluirse en las peticiones HTTP en el header `Authorization` con el formato:

```
Authorization: Bearer <token>
```

Los tokens tienen una validez configurable (por defecto 30 minutos) y contienen información del usuario, incluyendo si es administrador.

## Endpoints de Autenticación

### POST `/auth/register`

Registra un nuevo usuario en el sistema.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "is_admin": false,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Errores:**
- `400`: Username o email ya registrado

### POST `/auth/login`

Inicia sesión y obtiene un token JWT.

**Request Body:** (form-data, OAuth2 password flow)
```
username: string
password: string
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errores:**
- `401`: Credenciales incorrectas

### GET `/auth/me`

Obtiene la información del usuario autenticado actual.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "is_admin": false,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### POST `/auth/create-first-admin`

Crea el primer usuario administrador del sistema. Solo funciona si no existe ningún administrador en la base de datos.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK` - Usuario administrador creado

**Errores:**
- `403`: Ya existen usuarios administradores
- `400`: Username o email ya registrado

### POST `/auth/create-admin`

Crea un nuevo usuario administrador. Requiere autenticación como administrador.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK` - Usuario administrador creado

### GET `/auth/users`

Lista todos los usuarios del sistema. Requiere autenticación como administrador.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK` - Lista de usuarios

### PUT `/auth/users/{user_id}`

Actualiza la información de un usuario. Requiere autenticación como administrador.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "username": "string (opcional)",
  "email": "string (opcional)",
  "password": "string (opcional)"
}
```

**Response:** `200 OK` - Usuario actualizado

### PATCH `/auth/users/{user_id}/toggle-admin`

Alterna el estado de administrador de un usuario. Requiere autenticación como administrador.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK` - Usuario actualizado

**Errores:**
- `400`: No se puede cambiar el propio estado de administrador

### PATCH `/auth/users/{user_id}/toggle-active`

Alterna el estado activo/inactivo de un usuario. Requiere autenticación como administrador.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK` - Usuario actualizado

**Errores:**
- `400`: No se puede desactivar a uno mismo

### DELETE `/auth/users/{user_id}`

Elimina un usuario del sistema. Requiere autenticación como administrador.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK` - `{"ok": true}`

**Errores:**
- `400`: No se puede eliminar a uno mismo

## Endpoints de Ingesta de Datos

### POST `/ingest`

Recibe mediciones de sensores desde dispositivos ESP32. Soporta múltiples formatos de payload: JSON estructurado, texto plano con parsing automático, y aliases para compatibilidad con versiones anteriores del firmware.

**Content-Type:** `application/json` o `text/plain`

**Request Body (JSON):**
```json
{
  "device_id": "esp32-001",
  "ts": "2024-01-01T00:00:00Z",
  "temp_aire_c": 26.5,
  "temp_piel_c": 36.8,
  "humedad": 65.0,
  "peso_g": 2500.0,
  "alerts": 0
}
```

**Request Body (Texto):**
```
Temp Air: 26.5 C | Skin: 36.8 C | RH: 65.0 | Weight: 2.5 kg
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "id": 12345
}
```

**Campos soportados:**
- `device_id`: Identificador único del dispositivo
- `ts`: Timestamp ISO 8601 (opcional, se usa el tiempo actual si no se proporciona)
- `temp_aire_c`: Temperatura del aire en grados Celsius
- `temp_piel_c`: Temperatura de la piel en grados Celsius
- `humedad`: Humedad relativa en porcentaje
- `peso_g`: Peso en gramos
- `luz`: Nivel de luz (opcional)
- `ntc_raw`: Valor raw del sensor NTC (opcional)
- `ntc_c`: Temperatura del sensor NTC en Celsius (opcional)
- `set_control`: Valor de setpoint de control (opcional)
- `alerts`: Máscara de bits para alertas (opcional)

**Aliases soportados:** El endpoint acepta múltiples nombres alternativos para los campos (por ejemplo, `temperatura`, `temp`, `tAir` para `temp_aire_c`).

## Endpoints de Consulta

### GET `/query/devices`

Lista los dispositivos vinculados al usuario autenticado junto con su última medición.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": "esp32-001",
    "last_seen": "2024-01-01T00:00:00Z",
    "is_linked": true,
    "name": "Incubadora Principal",
    "metrics": {
      "temp_aire_c": 26.5,
      "temp_piel_c": 36.8,
      "humedad": 65.0,
      "peso_g": 2500.0
    }
  }
]
```

### GET `/query/latest?device_id={device_id}`

Obtiene la última medición de un dispositivo específico. El dispositivo debe estar vinculado al usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `device_id` (requerido): Identificador del dispositivo

**Response:** `200 OK`
```json
{
  "id": 12345,
  "device_id": "esp32-001",
  "ts": "2024-01-01T00:00:00Z",
  "temp_aire_c": 26.5,
  "temp_piel_c": 36.8,
  "humedad": 65.0,
  "peso_g": 2500.0
}
```

**Errores:**
- `403`: Dispositivo no vinculado al usuario
- `404`: No se encontraron mediciones

### GET `/query/series?device_id={device_id}&since_minutes={minutes}&limit={limit}`

Obtiene una serie temporal de mediciones. Si no se especifica `device_id`, retorna mediciones de todos los dispositivos vinculados al usuario.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `device_id` (opcional): Filtrar por dispositivo específico
- `since_minutes` (opcional): Filtrar mediciones desde hace X minutos
- `limit` (opcional): Limitar número de resultados

**Response:** `200 OK`
```json
[
  {
    "ts": "2024-01-01T00:00:00Z",
    "device_id": "esp32-001",
    "temp_aire_c": 26.5,
    "temp_piel_c": 36.8,
    "humedad": 65.0,
    "peso_g": 2500.0,
    "alerts": 0
  }
]
```

## Endpoints de Alertas

### GET `/alerts?limit={limit}`

Obtiene las alertas más recientes del sistema. Solo muestra alertas de dispositivos vinculados al usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (opcional, default: 100): Número máximo de alertas a retornar

**Response:** `200 OK`
```json
[
  {
    "ts": "2024-01-01T00:00:00Z",
    "device_id": "esp32-001",
    "mask": 1,
    "labels": ["Alta temp aire"]
  }
]
```

**Máscaras de alerta:**
- `1`: Alta temperatura del aire
- `2`: Baja temperatura del aire
- `4`: Alta humedad
- `8`: Baja humedad
- `16`: Bajo peso

## Endpoints de Dispositivos

### GET `/devices/available`

Lista todos los dispositivos disponibles en el sistema (con mediciones), indicando cuáles están vinculados al usuario actual y cuáles están disponibles para vincular.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK` - Lista de dispositivos con estado de vinculación

### POST `/devices/{device_id}/link`

Vincula un dispositivo al usuario autenticado actual.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": 1,
  "device_id": "esp32-001",
  "name": null,
  "user_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Errores:**
- `403`: El dispositivo ya está vinculado a otro usuario

### POST `/devices/{device_id}/unlink`

Desvincula un dispositivo del usuario autenticado actual.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK` - Dispositivo desvinculado

**Errores:**
- `404`: Dispositivo no encontrado o no vinculado al usuario

### GET `/devices/my-devices`

Lista todos los dispositivos vinculados al usuario autenticado actual.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK` - Lista de dispositivos del usuario

## Endpoints de Modelos de Machine Learning

### GET `/models/status`

Obtiene el estado actual del modelo de machine learning. Requiere autenticación como administrador.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK`
```json
{
  "algo": "demo",
  "version": "v0.0.1",
  "training": false,
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### POST `/models/retrain`

Inicia el reentrenamiento del modelo de machine learning en background. Requiere autenticación como administrador.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK` - Estado del modelo con `training: true`

## Endpoint de Salud

### GET `/healthz`

Endpoint de salud del sistema, no requiere autenticación.

**Response:** `200 OK`
```json
{
  "ok": true
}
```

## Códigos de Estado HTTP

- `200 OK`: Petición exitosa
- `400 Bad Request`: Error en los datos de la petición
- `401 Unauthorized`: No autenticado o token inválido
- `403 Forbidden`: No tiene permisos para realizar la acción
- `404 Not Found`: Recurso no encontrado
- `415 Unsupported Media Type`: Tipo de contenido no soportado
- `422 Unprocessable Entity`: Error de validación de datos

## Manejo de Errores

Los errores se retornan en formato JSON con el siguiente formato:

```json
{
  "detail": "Mensaje de error descriptivo"
}
```

En caso de errores de validación (422), el formato puede incluir detalles específicos del campo que falló la validación.

