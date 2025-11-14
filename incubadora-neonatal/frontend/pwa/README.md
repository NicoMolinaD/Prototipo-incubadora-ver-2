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

- `src/pages/LoginPage.tsx` - Página de inicio de sesión con autenticación JWT
- `src/pages/RegisterPage.tsx` - Registro de nuevos usuarios
- `src/pages/CreateFirstAdminPage.tsx` - Creación del primer usuario administrador del sistema
- `src/pages/DashboardsPage.tsx` - Dashboards con visualización de datos históricos y gráficos de series temporales
- `src/pages/LiveDataPage.tsx` - Visualización de datos en tiempo real desde dispositivos conectados
- `src/pages/DevicesPage.tsx` - Gestión de dispositivos ESP32: vinculación, desvinculación, listado
- `src/pages/AlertsPage.tsx` - Visualización y gestión de alertas generadas por el sistema
- `src/pages/UsersPage.tsx` - Administración de usuarios (solo administradores)
- `src/pages/ModelsPage.tsx` - Gestión y estado de modelos de machine learning
- `src/pages/DataManagementPage.tsx` - Gestión y exportación de datos históricos
- `src/pages/SettingsPage.tsx` - Configuración de la aplicación

### Componentes Reutilizables

- `src/components/Sidebar.tsx` - Barra lateral de navegación con menú contextual
- `src/components/TopBar.tsx` - Barra superior con información de usuario y acciones
- `src/components/TimeSeriesChart.tsx` - Componente de gráfico de series temporales utilizando Recharts
- `src/components/ButtonGrid.tsx` - Grid de botones para acciones rápidas
- `src/components/ProtectedRoute.tsx` - Componente de ruta protegida que requiere autenticación

### Contextos (State Management)

- `src/contexts/AuthContext.tsx` - Gestión del estado de autenticación, tokens JWT, y sesión de usuario
- `src/contexts/BluetoothContext.tsx` - Gestión de conexiones Bluetooth Low Energy con dispositivos ESP32
- `src/contexts/ThemeContext.tsx` - Gestión del tema de la aplicación (claro/oscuro)

### API Client

- `src/api/client.ts` - Cliente HTTP para comunicación con el backend. Incluye funciones para ingesta de datos, consultas, gestión de dispositivos, alertas, y autenticación. Detecta automáticamente la URL base de la API desde variables de entorno o desde `window.location.origin`.
- `src/api/types.ts` - Definiciones de tipos TypeScript para las respuestas de la API

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

## Autenticación

La autenticación se gestiona mediante tokens JWT almacenados en `localStorage`. El `AuthContext` maneja el estado de autenticación globalmente, y las rutas protegidas verifican la validez del token antes de permitir el acceso. Los tokens se incluyen automáticamente en las peticiones HTTP mediante el cliente API.

