# Firmware ESP32-S3

Código embebido para microcontroladores ESP32-S3 que gestiona la lectura de sensores, control de actuadores, comunicación Bluetooth Low Energy (BLE), y envío de datos al backend del sistema de monitoreo de incubadoras neonatales.

## Hardware

El firmware está diseñado para ESP32-S3 WROOM-1 con los siguientes componentes:

- **TCA9548A** - Multiplexor I2C para gestionar múltiples dispositivos en el bus I2C
- **SHT41** (2 unidades) - Sensores de temperatura y humedad de alta precisión
- **SHT31** (1 unidad) - Sensor adicional de temperatura y humedad
- **OLED SH1106/SSD1306** (3 unidades) - Pantallas OLED para visualización local de datos
- **Matriz LED NeoPixel 2x5** - Indicadores visuales de estado
- **HX711** - Módulo de amplificación para sensor de peso (célula de carga)
- **DFPlayer Mini** - Reproductor de audio para alarmas sonoras
- **TRIAC + Zero Crossing** - Control de calefacción mediante modulación de fase
- **LEDC PWM** - Control de humidificación mediante modulación por ancho de pulso

## Funcionalidades

### Lectura de Sensores

El firmware lee continuamente datos de múltiples sensores:
- Temperatura del aire (2 sensores SHT41)
- Temperatura de la piel (1 sensor SHT31)
- Humedad relativa
- Peso (mediante HX711 y célula de carga)

Los datos se muestran en tiempo real en las tres pantallas OLED, cada una configurada para mostrar información específica del sistema.

### Control de Actuadores

- **Control de Temperatura**: Utiliza un TRIAC con detección de cruce por cero para controlar la potencia de calefacción de forma segura.
- **Control de Humedad**: Implementa control PWM mediante LEDC con bandas de control (0%, 30%, 60%, 100%) basado en el error entre setpoint y valor medido.

### Comunicación Bluetooth Low Energy (BLE)

El firmware implementa un servicio BLE UART que permite:
- Transmisión de datos de sensores en tiempo real
- Notificaciones automáticas cuando hay nuevos datos
- Formato de datos en texto UTF-8 que puede ser parseado por el frontend

El frontend web puede conectarse directamente al dispositivo mediante Web Bluetooth API, recibiendo un resumen de los datos mostrados en las pantallas OLED.

### Comunicación HTTP

El firmware puede enviar datos al backend mediante peticiones HTTP POST al endpoint `/api/incubadora/ingest`. Esta funcionalidad permite la integración con el sistema de monitoreo centralizado sin necesidad de conexión Bluetooth.

### Sistema de Alarmas

- **Alarmas Visuales**: La matriz NeoPixel muestra indicadores de estado y alertas
- **Alarmas Sonoras**: El DFPlayer Mini reproduce sonidos de alarma cuando se detectan condiciones fuera de rango

## Estructura del Código

- `arduino/esp32s3_incubadora/COMPLETE_REMOTE.ino` - Código principal del firmware
- `include/secrets_example.h` - Plantilla para configuración de credenciales (WiFi, API URL, etc.)

## Configuración

Antes de compilar, es necesario crear un archivo `secrets.h` basado en `secrets_example.h` con las credenciales reales:
- Credenciales de WiFi (SSID y contraseña)
- URL del backend API
- Identificador único del dispositivo

## Compilación

El proyecto puede compilarse utilizando:
- **Arduino IDE** - Con el soporte para ESP32 instalado
- **PlatformIO** - Utilizando el archivo `platformio.ini` incluido

El archivo `platformio.ini` define las dependencias de librerías necesarias:
- Adafruit SHT4x Library (sensores SHT41)
- Adafruit SHT31 Library (sensor SHT31)
- Adafruit SH110x Library / Adafruit SSD1306 (pantallas OLED)
- Adafruit NeoPixel (matriz LED)
- Librerías BLE nativas de ESP32

## Flujo de Operación

1. Inicialización: El dispositivo se conecta a WiFi, inicializa todos los sensores y actuadores, y configura el servicio BLE.
2. Loop Principal: En cada iteración:
   - Lee datos de todos los sensores
   - Actualiza las pantallas OLED con la información más reciente
   - Ejecuta el algoritmo de control para temperatura y humedad
   - Verifica condiciones de alarma
   - Envía datos al backend si está configurado
   - Prepara datos para transmisión BLE si hay clientes conectados
3. Comunicación: Responde a conexiones BLE y envía notificaciones cuando hay nuevos datos disponibles.

## Integración con el Sistema

El firmware está diseñado para integrarse con el backend FastAPI y el frontend React. Los datos enviados mediante HTTP se almacenan en la base de datos PostgreSQL, y el frontend puede visualizarlos en tiempo real. La conexión BLE permite una interfaz directa entre el dispositivo y la aplicación web sin necesidad de intermediarios.

