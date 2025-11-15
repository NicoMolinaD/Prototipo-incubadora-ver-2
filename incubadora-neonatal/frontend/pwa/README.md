# Frontend - Progressive Web App (PWA)

Aplicación web progresiva desarrollada con React, TypeScript y Vite para la visualización y gestión del sistema de monitoreo de incubadoras neonatales. La aplicación proporciona una interfaz de usuario moderna con soporte para visualización de datos en tiempo real, gestión de dispositivos, administración de usuarios, y conexión Bluetooth con dispositivos ESP32.

## Tecnologías

- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático
- **Vite** - Herramienta de construcción y desarrollo
- **React Router** - Enrutamiento del lado del cliente
- **Recharts** - Biblioteca de gráficos para visualización de datos
- **Tailwind CSS** - Framework de estilos utility-first

## Estructura del Código

### Páginas Principales

- `src/pages/LoginPage.tsx` - Página de inicio de sesión con autenticación JWT y logo de Marsupia
- `src/pages/RegisterPage.tsx` - Registro de nuevos usuarios
- `src/pages/CreateFirstAdminPage.tsx` - Creación del primer usuario administrador del sistema
- `src/pages/LiveDataPage.tsx` - Visualización de datos en tiempo real desde dispositivos conectados, controles remotos, y dashboards con gráficos de series temporales integrados
- `src/pages/DevicesPage.tsx` - Gestión de dispositivos ESP32: vinculación, desvinculación, listado y conexión Bluetooth
- `src/pages/AlertsPage.tsx` - Visualización y gestión de alertas en tiempo real desde dispositivos Bluetooth y backend, con sistema de alertas del firmware ESP32 (sobretemperatura, falla de flujo, falla de sensor, falla de programa, postura incorrecta)
- `src/pages/UsersPage.tsx` - Administración de usuarios (solo administradores)
- `src/pages/ModelsPage.tsx` - Gestión y estado de modelos de machine learning
- `src/pages/DataManagementPage.tsx` - Gestión y exportación de datos históricos
- `src/pages/SettingsPage.tsx` - Configuración de la aplicación, temas, y gestión de cuenta de usuario

### Componentes Reutilizables

- `src/components/Sidebar.tsx` - Barra lateral de navegación con menú contextual
- `src/components/TopBar.tsx` - Barra superior con información de usuario y acciones
- `src/components/TimeSeriesChart.tsx` - Componente de gráfico de series temporales utilizando Recharts
- `src/components/ButtonGrid.tsx` - Grid de botones para acciones rápidas
- `src/components/ProtectedRoute.tsx` - Componente de ruta protegida que requiere autenticación

### Contextos (State Management)

- `src/contexts/AuthContext.tsx` - Gestión del estado de autenticación, tokens JWT, y sesión de usuario. Maneja el login, logout, registro, y verificación de tokens almacenados en `localStorage`.

- `src/contexts/BluetoothContext.tsx` - Gestión completa de conexiones Bluetooth Low Energy con dispositivos ESP32. Características principales:
  - Estado de conexión compartido entre todas las páginas (LiveDataPage, AlertsPage, DevicesPage)
  - Historial de datos (`dataHistory`) con hasta 500 puntos de `SeriesPoint` para visualización en gráficas
  - Estado de alertas en tiempo real (`currentAlarms`) con parsing del formato `ALR ST:1 FF:0 FS:0 FP:0 PI:0` del firmware
  - Sincronización bidireccional de setpoints (temperatura aire, temperatura piel, humedad)
  - Parsing robusto de datos BLE incluyendo temperatura, humedad, peso, setpoints, modo de operación, y alertas
  - Envío de comandos remotos al dispositivo (setpoints, iluminación, alarmas de prueba)
  - Ingesta automática de datos al backend cuando hay conexión Bluetooth activa
  - Preservación del historial de datos incluso después de desconexiones

- `src/contexts/ThemeContext.tsx` - Gestión del tema de la aplicación (claro, oscuro, azul, verde, morado) con adaptación automática de colores en inputs y componentes mediante CSS variables y atributo `data-theme` en el elemento raíz HTML.

### API Client

- `src/api/client.ts` - Cliente HTTP para comunicación con el backend. Características principales:
  - Función unificada `handleResponse<T>` para manejo consistente de respuestas JSON y errores
  - Detección automática de errores 401 (Unauthorized) con eliminación de token y redirección a login
  - Funciones para ingesta de datos (`ingest`), consultas (`getDevices`, `getLatest`, `getSeries`), gestión de dispositivos (`linkDevice`, `unlinkDevice`, `getAvailableDevices`), alertas (`getAlerts`), autenticación (`login`, `register`), y actualización de cuenta (`updateCurrentUser`)
  - Detección automática de la URL base de la API desde variables de entorno (`VITE_API_BASE`) o desde `window.location.origin + '/api/incubadora'`
  - Inclusión automática de tokens JWT en todas las peticiones mediante `getAuthHeaders()`

- `src/api/types.ts` - Definiciones de tipos TypeScript para las respuestas de la API, incluyendo `SeriesPoint`, `AlertRow`, `DeviceRow`, `MeasurementOut`, y otros tipos relacionados con la estructura de datos del sistema

### Utilidades

- `src/lib/firmwareParser.ts` - Parser para interpretar datos recibidos desde dispositivos ESP32 vía Bluetooth

## Configuración

La aplicación se configura mediante variables de entorno en tiempo de construcción:

- `VITE_API_BASE` - URL base de la API backend (opcional). Si no se define, la aplicación utiliza `window.location.origin + '/api/incubadora'` automáticamente.

En desarrollo, Vite configura un proxy en `/api` que redirige las peticiones al backend en `http://localhost:8000`.

## Desarrollo

El servidor de desarrollo de Vite se ejecuta en el puerto 5173 con hot module replacement (HMR) habilitado. El proxy configurado permite que las peticiones a `/api` se redirijan automáticamente al backend durante el desarrollo.

## Construcción y Despliegue

La aplicación se construye mediante `npm run build`, generando archivos estáticos optimizados en el directorio `dist/`. Estos archivos se sirven mediante el servidor `serve` en el contenedor Docker, o a través de Nginx en producción.

El Dockerfile utiliza una estrategia multi-stage: primero construye la aplicación con Node.js, y luego copia los archivos estáticos a una imagen de runtime más ligera que solo incluye el servidor `serve`.

## Características PWA

La aplicación incluye un `manifest.webmanifest` que la registra como Progressive Web App, permitiendo su instalación en dispositivos móviles y de escritorio. El soporte para Bluetooth Web API permite la conexión directa con dispositivos ESP32 sin necesidad de intermediarios.

## Características Principales

### Visualización en Tiempo Real
- **LiveDataPage**: Muestra datos en tiempo real desde dispositivos conectados vía Bluetooth o backend, con actualización cada 5 segundos para las tarjetas de datos. Incluye controles remotos para ajustar setpoints de temperatura y humedad (TSPA, TSPS, HSP), control de iluminación multimodal (circadiano, ictericia, PBM), y gestión de alarmas. Integra dashboards con gráficos de series temporales (Temperatura de Piel, Temperatura Ambiente, Humedad Relativa) que se actualizan cada 1 segundo, combinando datos de Bluetooth y backend en un historial unificado.

### Sistema de Alertas
- **AlertsPage**: Visualización de alertas en tiempo real desde dispositivos Bluetooth y backend, con actualización cada 1 segundo. Soporta alertas del firmware ESP32: sobretemperatura (ST), falla de flujo (FF), falla de sensor (FS), falla de programa (FP), y postura incorrecta (PI). Permite pruebas remotas de alarmas mediante comandos BLE (PRST, PRFF, PRFS, PRFP, PRPI). Muestra alertas históricas del backend y alertas activas en tiempo real desde dispositivos conectados.

### Gestión de Dispositivos
- **DevicesPage**: Vinculación y desvinculación de dispositivos ESP32 a cuentas de usuario. Conexión Bluetooth directa con dispositivos para monitoreo y control en tiempo real. El estado de conexión Bluetooth se mantiene compartido entre todas las páginas mediante BluetoothContext.

### Personalización
- **SettingsPage**: Configuración de temas (claro, oscuro, azul, verde, morado) con adaptación automática de colores en todos los componentes. Gestión de cuenta de usuario con actualización de username, email, y contraseña mediante endpoint `PUT /auth/me`. Validación de contraseñas en el cliente (mínimo 6 caracteres).

### Diseño Responsive
- Todos los componentes y páginas están diseñados para ser completamente responsive, adaptándose a dispositivos móviles, tablets y escritorio. Los inputs (text, email, password, number, textarea, select) se adaptan automáticamente al tema seleccionado mediante CSS variables y atributos `data-theme`. El logo de Marsupia se muestra en la página de login y en la parte inferior del sidebar con dimensiones adaptativas.

### Sistema de Conexión Bluetooth Compartido
- **BluetoothContext**: Contexto global que mantiene el estado de conexión Bluetooth compartido entre todas las páginas (LiveDataPage, AlertsPage, DevicesPage). Almacena un historial de hasta 500 puntos de datos para visualización en gráficas, mantiene el estado de alertas en tiempo real (`currentAlarms`), y sincroniza setpoints entre el dispositivo y la interfaz. El historial de datos se preserva incluso después de desconexiones para mantener la continuidad de las gráficas.

## Autenticación

La autenticación se gestiona mediante tokens JWT almacenados en `localStorage`. El `AuthContext` maneja el estado de autenticación globalmente, y las rutas protegidas verifican la validez del token antes de permitir el acceso. Los tokens se incluyen automáticamente en las peticiones HTTP mediante el cliente API. El sistema incluye manejo unificado de errores de autenticación con redirección automática al login cuando es necesario. La función `handleResponse` en `client.ts` detecta automáticamente errores 401, elimina el token del almacenamiento local, y redirige al usuario a la página de login (solo si no está ya en esa página).

## Actualización de Datos en Tiempo Real

- **LiveDataPage**: Las tarjetas de datos se actualizan cada 5 segundos mediante polling del backend. Los gráficos de dashboards se actualizan cada 1 segundo, combinando datos del historial de Bluetooth (`dataHistory`) con datos del backend mediante `getSeries`. Los datos se filtran y procesan para mostrar solo valores válidos y finitos.

- **AlertsPage**: Las alertas del backend se actualizan cada 1 segundo mediante `getAlerts`. Las alertas de Bluetooth se actualizan en tiempo real mediante el `BluetoothContext` cuando se reciben notificaciones BLE con el formato `ALR ST:1 FF:0 FS:0 FP:0 PI:0`.

- **Persistencia de Datos**: El historial de datos en `BluetoothContext` se preserva incluso después de desconexiones, permitiendo que las gráficas mantengan datos históricos mientras se reconecta el dispositivo o se cambia de página.

## Componentes Visuales

- **Sidebar**: Barra lateral de navegación con logo de Marsupia en la parte inferior. Incluye menú contextual que se adapta según los permisos del usuario (administrador o usuario regular). El logo se muestra con dimensiones fijas (w-20 h-20) y un fallback con emoji de canguro si la imagen no carga. El sidebar utiliza `flex flex-col` para mantener el logo siempre en la parte inferior.

- **TimeSeriesChart**: Componente de gráfico de series temporales basado en Recharts, con las siguientes características:
  - Filtrado robusto de valores inválidos (null, undefined, NaN, Infinity)
  - Parsing seguro de fechas con manejo de errores
  - Limitación a los últimos 100 puntos para optimizar rendimiento
  - Animaciones suaves con duración de 200ms
  - Formato de tiempo localizado (es-ES) en el eje X
  - Tooltips personalizados con formato de valores y unidades
  - Diseño responsive con `ResponsiveContainer`
  - Re-renderizado forzado mediante `key` prop cuando cambian los datos

- **LoginPage**: Página de inicio de sesión con logo de Marsupia en la parte superior, dimensiones adaptativas (w-32/h-32 en móvil, w-40/h-40 en tablet, w-48/h-48 en desktop), y fallback para ocultar la imagen si falla la carga. Incluye texto "MARSUPIA" y "Neonatal Incubator" debajo del logo.

- **Inputs Adaptativos**: Todos los inputs (text, email, password, number, textarea, select) se adaptan automáticamente al tema seleccionado mediante CSS global y atributo `data-theme`. En modo oscuro, los inputs tienen fondo `#1e293b` y texto `#f1f5f9` para mejor legibilidad.

