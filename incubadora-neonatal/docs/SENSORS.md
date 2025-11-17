# Especificaciones de Sensores y Hardware

Documentación técnica de los sensores, actuadores, y componentes hardware utilizados en el sistema de monitoreo de incubadoras neonatales.

## Microcontrolador Principal

### ESP32-S3 WROOM-1

Microcontrolador principal que gestiona toda la adquisición de datos, control de actuadores, y comunicación inalámbrica.

**Características:**
- Procesador dual-core Xtensa LX7 a 240 MHz
- WiFi 802.11 b/g/n
- Bluetooth 5.0 (incluyendo BLE)
- Múltiples interfaces: I2C, SPI, UART, ADC, PWM
- Memoria Flash y RAM integradas

## Sensores de Temperatura y Humedad

### SHT41 (3 unidades)

Sensores de temperatura y humedad de alta precisión fabricados por Sensirion, utilizados para medir la temperatura del aire en la incubadora.

**Especificaciones:**
- Rango de temperatura: -40°C a +125°C
- Precisión de temperatura: ±0.2°C (típico)
- Rango de humedad: 0% a 100% RH
- Precisión de humedad: ±1.5% RH (típico)
- Interfaz: I2C
- Dirección I2C: Configurable mediante TCA9548A

**Ubicación en el Sistema:**
- `CH_SHT41_A` (Canal 6 del multiplexor): Sensor de temperatura del aire 1
- `CH_SHT41_B` (Canal 7 del multiplexor): Sensor de temperatura del aire 2

### SHT31 (1 unidad)

Sensor de temperatura y humedad utilizado para medir la temperatura del aire.

**Especificaciones:**
- Rango de temperatura: -40°C a +125°C
- Precisión de temperatura: ±0.3°C (típico)
- Rango de humedad: 0% a 100% RH
- Precisión de humedad: ±2% RH (típico)
- Interfaz: I2C
- Dirección I2C: Configurable mediante TCA9548A

**Ubicación en el Sistema:**
- `CH_SHT31` (Canal 1 del multiplexor): Sensor de temperatura de la piel

### Termistor NTC 10K 3950 (1 unidad)  

Sensor de temperatura Piel

**Especificaciones:**
- Resistencia: 10 kΩ ±1% a 25 °C
- Constante de tiempo térmica (tiempo de respuesta): ≤ 15 s
- Disipación de potencia (factor de disipación): ~5 mW/°C en aire estático.



## Sensor de Peso

### HX711 + Célula de Carga

Módulo amplificador para célula de carga que permite medir el peso del neonato.

**Especificaciones:**
- Resolución: 24 bits
- Interfaz: Serial (clock y data)
- Rango de medición: Depende de la célula de carga utilizada
- Precisión: Alta resolución para mediciones precisas de peso

**Funcionalidad:**
- Permite realizar tara (zero) del peso
- Conversión de valores raw a gramos mediante calibración
- Integrado con el sistema de alarmas para detectar bajo peso

## Multiplexor I2C

### TCA9548A

Multiplexor I2C de 8 canales que permite conectar múltiples dispositivos I2C al mismo bus, resolviendo conflictos de direcciones.

**Especificaciones:**
- 8 canales I2C independientes
- Dirección I2C: 0x70 (configurable)
- Permite selección dinámica de canal mediante software

**Configuración de Canales:**
- Canal 1: SHT31 (temperatura aire 1)
- Canal 2: OLED C (SSD1306 - UI setpoint)
- Canal 3: OLED B (SH1106 - Humedad/peso)
- Canal 4: OLED A (SH1106 - Temperatura aire/piel)
- Canal 5: SHT41 A (temperatura aire 2)
- Canal 6: SHT41 B (temperatura aire 3)
- Canal 7: SHT41 C (temperatura aire 4)

## Pantallas de Visualización

### OLED SH1106 (2 unidades)

Pantallas OLED monocromáticas de 128x64 píxeles utilizadas para mostrar información de temperatura y humedad/peso.

**Especificaciones:**
- Resolución: 128x64 píxeles
- Interfaz: I2C
- Tamaño de pantalla: 1.3 pulgadas
- Contraste alto, visible en diversas condiciones de iluminación

**Contenido Mostrado:**
- OLED A: Temperatura del aire y temperatura de la piel
- OLED B: Humedad relativa y peso

### OLED SSD1306 (1 unidad)

Pantalla OLED monocromática de 128x64 píxeles utilizada para mostrar información de UI y setpoints de control.

**Especificaciones:**
- Resolución: 128x64 píxeles
- Interfaz: I2C
- Similar a SH1106 pero con controlador diferente

**Contenido Mostrado:**
- UI de setpoints y modo de control actual

## Actuadores

### Control de Temperatura - TRIAC

Sistema de control de calefacción mediante modulación de fase con TRIAC y detección de cruce por cero.

**Componentes:**
- TRIAC: Dispositivo semiconductor para control de potencia AC
- Zero Crossing Detector: Detecta el cruce por cero de la señal AC
- Gate Control: Controla el disparo del TRIAC

**Funcionalidad:**
- Control de potencia mediante modulación de fase
- Disparo seguro en cruce por cero para reducir interferencias
- Control de brillo/calefacción en porcentaje (0-100%)

**Pines:**
- `ZC_PIN`: Pin de detección de cruce por cero (GPIO 7)
- `TRIAC_PIN`: Pin de control del gate del TRIAC (GPIO 15)

### Control de Humedad - PWM LEDC

Sistema de control de humidificación mediante modulación por ancho de pulso (PWM) utilizando el módulo LEDC del ESP32.

**Especificaciones:**
- Frecuencia PWM: Configurable mediante LEDC
- Resolución: Hasta 16 bits
- Control por bandas: 0%, 30%, 60%, 100%

**Funcionalidad:**
- Control proporcional basado en error entre setpoint y humedad medida
- Bandas de control para evitar oscilaciones
- Modo de control configurable

**Pines:**
- `HUM_PWM_PIN`: GPIO 8

## Indicadores y Alarmas

### Matriz LED NeoPixel 2x5

Matriz de LEDs direccionables RGB utilizada como indicador visual de estado y alarmas.

**Especificaciones:**
- 10 LEDs NeoPixel (2 filas x 5 columnas)
- Control mediante protocolo WS2812
- Colores RGB configurables
- Indicadores visuales de estado del sistema

### LEDs de Alarma

LEDs individuales para indicar diferentes tipos de alarmas:

- `LED_OVERTEMP_PIN` (GPIO 45): Sobretemperatura
- `LED_FLOWFAIL_PIN` (GPIO 48): Falla de flujo de aire
- `LED_SENSORFAIL_PIN` (GPIO 47): Falla de sensor
- `LED_WDFAIL_PIN` (GPIO 21): Falla de programa (watchdog)
- `LED_POSTURE_PIN` (GPIO 20): Postura incorrecta

### DFPlayer Mini

Reproductor de audio MP3 utilizado para alarmas sonoras.

**Especificaciones:**
- Reproducción de archivos MP3 desde tarjeta microSD
- Control mediante UART
- Amplificador integrado
- Permite diferentes tonos de alarma según el tipo de alerta

## Entradas Digitales

### Sensor de Flujo de Aire

Entrada digital que detecta el estado del flujo de aire en la incubadora.

**Pin:** `FLOW_IN_PIN` (GPIO 3)
**Lógica:** Configurable (activo alto/bajo)

### Sensor de Postura

Entrada digital desde cámara ESP32-CAM u otro sensor que detecta la postura del neonato.

**Pin:** `POSTURE_IN_PIN` (GPIO 46)
**Funcionalidad:** Detecta postura incorrecta y activa alarma correspondiente

## Teclado Matricial

### Matriz 2x5

Teclado matricial de 2 filas y 5 columnas (10 teclas) para control local del dispositivo.

**Configuración de Teclas:**
- Fila 0: Modo Aire, Bajar, Subir, Circadiano, PBM
- Fila 1: Temp, Modo Piel, Humedad, Ictericia, Tara (peso)

**Funcionalidad:**
- Control de setpoints
- Cambio de modos de operación
- Ajuste de parámetros
- Realización de tara del peso

## Comunicación Inalámbrica

### Bluetooth Low Energy (BLE)

Servicio BLE UART implementado en el ESP32 que permite comunicación directa con el frontend web.

**Características:**
- Servicio UART estándar
- Notificaciones automáticas cuando hay nuevos datos
- Formato de datos: Texto UTF-8 con resumen de las pantallas OLED
- Permite conexión directa sin necesidad de WiFi

### WiFi

Conexión WiFi para comunicación con el backend mediante HTTP.

**Funcionalidad:**
- Conexión a red WiFi configurable
- Envío de datos al backend mediante peticiones HTTP POST
- Reconexión automática en caso de pérdida de conexión

## Alimentación y Energía

El sistema está diseñado para funcionar con alimentación AC estándar, con el ESP32-S3 alimentado a 3.3V y los actuadores (TRIAC) manejando voltajes AC de línea.

## Calibración y Configuración

Los sensores requieren calibración inicial:
- **Sensores SHT**: Generalmente no requieren calibración, pero pueden verificarse contra referencias conocidas
- **HX711**: Requiere calibración con pesos conocidos para convertir valores raw a gramos
- **TRIAC**: Requiere ajuste de tiempos de disparo según la carga
- **PWM Humedad**: Requiere ajuste de bandas según el sistema de humidificación utilizado

## Integración con el Backend

Todos los datos de sensores se envían al backend mediante el endpoint `/api/incubadora/ingest` con el siguiente formato:

```json
{
  "device_id": "esp32-001",
  "temp_aire_c": 26.5,
  "temp_piel_c": 36.8,
  "humedad": 65.0,
  "peso_g": 2500.0,
  "alerts": 0
}
```

El campo `alerts` es una máscara de bits que indica qué alarmas están activas en el momento de la medición.

