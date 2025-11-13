// ===== Marsupia JYNCS - Temp PI + Humedad PWM por bandas + UI 3xOLED + Light + BLE (ESP32 BLE Arduino) =====
//  - ESP32-S3 WROOM-1
//  - TCA9548A (I2C mux) 2x SHT41 + 1x SHT31 + 3x OLED
//  - Matriz 2x5
//  - TRIAC temp (ZC + gate) y LEDC PWM humedad (GPIO 8)
//  - BLE (ESP32 BLE Arduino): Servicio UART (TX notify) con resumen UTF-8 de las OLED
//
//  HUMEDAD (HUM_CONTROL_MODE=0 por defecto):
//    error = spHum - RH -> PWM 0/30/60/100 % (bandas)
// ============================================================================

#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_SH110X.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>
#include <math.h>
#include "driver/ledc.h"
#include "LightController.h"

// ===== BLE (ESP32 BLE Arduino) =====
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

// ====== AÑADIR: HX711 (peso) ======
#include "HX711.h"

// ====== AÑADIR: DFPlayer Mini (audio por alarmas) ======
#include <HardwareSerial.h>
#include <DFRobotDFPlayerMini.h>

// =========================
// I2C / TCA9548A
#define I2C_SDA   1
#define I2C_SCL   2
#define TCA_ADDR  0x70
static inline void tcaSelect(uint8_t ch) {
  if (ch > 7) return;
  Wire.beginTransmission(TCA_ADDR);
  Wire.write(1 << (ch & 7));
  Wire.endTransmission();
  delay(3);
}

// =========================
constexpr uint8_t CH_SHT41_A = 6;   // air1
constexpr uint8_t CH_SHT41_B = 7;   // air2
constexpr uint8_t CH_SHT31   = 1;   // air3
constexpr uint8_t CH_OLED_A  = 4;   // SH1106 (Temp: air/skin)
constexpr uint8_t CH_OLED_B  = 3;   // SH1106 (Humidity/weight)
constexpr uint8_t CH_OLED_C  = 2;   // SSD1306 (UI setpoint)

// =========================
// Teclado 2x5
const int F = 2;
const int C = 5;
int filas[F]    = {41, 40};
int columnas[C] = {39, 38, 37, 36, 35};
uint8_t keyNow[2][5], keyPrev[2][5];
unsigned long keyLastEdgeMs[2][5];
const unsigned long DEBOUNCE_MS = 40;
const unsigned long HOLD_START_MS = 450;
const unsigned long HOLD_REPEAT_MS = 120;
struct RepeatKey { bool isDown=false; unsigned long tDown=0, tLast=0; };
RepeatKey repInc, repDec;

// Alias
#define BTN_MODO_AIRE_R   0
#define BTN_MODO_AIRE_C   0   // "00"
#define BTN_BAJAR_R       0
#define BTN_BAJAR_C       1   // "01"
#define BTN_SUBIR_R       0
#define BTN_SUBIR_C       2   // "02"
#define BTN_CIRCADIANO_R  0
#define BTN_CIRCADIANO_C  3   // "03"
#define BTN_PBM_R         0
#define BTN_PBM_C         4   // "04"
#define BTN_TEMP_R        1
#define BTN_TEMP_C        0   // "10"
#define BTN_MODO_PIEL_R   1
#define BTN_MODO_PIEL_C   1   // "11"
#define BTN_HUM_R         1
#define BTN_HUM_C         2   // "12"
#define BTN_ICTERICIA_R   1
#define BTN_ICTERICIA_C   3   // "13"

// ====== AÑADIR: TARA en b14 ======
#define BTN_TARE_R  1
#define BTN_TARE_C  4   // "14": fila 1, col 4

// =========================
// ALARMAS (LEDs) y ENTRADAS
#define LED_OVERTEMP_PIN      45   // 1) Sobretemperatura 45
#define LED_FLOWFAIL_PIN      48   // 2) Falla flujo aire 48
#define LED_SENSORFAIL_PIN    47   // 3) Falla de sensor 
#define LED_WDFAIL_PIN        21   // 4) Falla programa (watchdog) 21
#define LED_POSTURE_PIN       20   // 5) Postura incorrecta (salida LED) 20

#define FLOW_IN_PIN            3   // Entrada digital de flujo (0/1)
#define POSTURE_IN_PIN        46   // Entrada desde ESP32-CAM (ajusta si usas otro pin)

// Polaridades (ajusta si lo necesitas)
#define LED_ACTIVE_HIGH        1
#define FLOW_FAIL_ACTIVE_LOW   1   // 1 ⇒ 0V = falla ; 3.3V = OK

// ===== FLAGS de salud de sensores =====
volatile bool gOkSHT41_A = false;
volatile bool gOkSHT41_B = false;
volatile bool gOkSHT31   = false;
volatile bool gOkNTC     = false;

// ===== Watchdog de lecturas de sensores (solo ese bloque) =====
const unsigned long SENSOR_WD_MS = 3000;
static bool   gSensorReadRunning = false;
static bool   gWatchdogTrip      = false;
static unsigned long gSensorReadStart = 0;

// Helper: set LED según polaridad
static inline void setLed(uint8_t pin, bool on) {
  digitalWrite(pin, (LED_ACTIVE_HIGH ? (on?HIGH:LOW) : (on?LOW:HIGH)));
}

// =========================
Adafruit_SHT4x  sht41_a;
Adafruit_SHT4x  sht41_b;
Adafruit_SHT31  sht31;
Adafruit_SH1106G oledA(128, 64, &Wire);
Adafruit_SH1106G oledB(128, 64, &Wire);
Adafruit_SSD1306  oledC(128, 64, &Wire, -1);

// =========================
// TRIAC (temperatura)
const uint8_t ZC_PIN       = 7;
const uint8_t TRIAC_PIN    = 15;
const uint16_t GATE_US     = 500;
const unsigned long HALF_CYCLE_US = 8333UL;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
volatile unsigned long lastZeroMicros = 0;
volatile uint8_t  brillo_percent = 0;     // 0..100
volatile bool     skipFiring     = true;
TaskHandle_t      triacTaskHandle = NULL;

// =========================
// HUMEDAD - PWM LEDC  (GPIO 8)
#define HUM_PWM_PIN 8
const ledc_mode_t    HUM_SPEED    = LEDC_LOW_SPEED_MODE;
const ledc_timer_t   HUM_TIMER    = LEDC_TIMER_0;
const ledc_channel_t HUM_CHANNEL  = LEDC_CHANNEL_0;
const uint32_t       HUM_FREQ_HZ  = 20000;   // 20 kHz
const uint8_t        HUM_RES_BITS = 8;       // 8-bit

// ===== Selección control humedad =====
#define HUM_CONTROL_MODE 0   // 0: PWM por bandas | 1: PI “duro” 60–100%

// Bandas de error
const float HUM_E0 = 2.0f;   // <2% => 0%
const float HUM_E1 = 5.0f;   // 2–5% => 30%
const float HUM_E2 = 10.0f;  // 6–10% => 60%
const float HUM_E3 = 11.0f;  // >=11% => 100%

// =========================
enum Mode : uint8_t { MODE_AIR = 0, MODE_SKIN = 1 };
enum AdjustTarget : uint8_t { ADJ_TEMP = 0, ADJ_HUM = 1 };
Mode         currentMode  = MODE_AIR;
AdjustTarget adjustTarget = ADJ_TEMP;

float spAir  = 35.0f;  // °C
float spSkin = 34.0f;  // °C
float spHum  = 55.0f;  // %RH

const float AIR_MIN  = 25.0f, AIR_MAX  = 40.0f;
const float SKIN_MIN = 30.0f, SKIN_MAX = 37.0f;
const float HUM_MIN  = 30.0f, HUM_MAX  = 100.0f;

// =========================
// Filtro/lecturas (aire)
static const float   OUTLIER_THRESH_C = 1.0f;  // °C
static const float   ALPHA = 0.15f;            // IIR temp
static const uint8_t MAX_RETRIES = 3;
static const float RH_OUTLIER_THRESH_PCT = 1.0f;  // %RH máximo de desvío permitido respecto a la mediana
bool  filt_ok = false;
bool  filtRH_ok = false;
float filtC   = NAN;
float filtRH   = NAN;

// =========================
// NTC (modo piel)
const int    NTC_ADC_PIN   = 4;
const float  NTC_PULLUP    = 10000.0f;
const float  NTC_ADC_REF   = 3.3f;
const int    NTC_ADC_MAX   = 4095;
const float  NTC_BETA      = 3950.0f;
const float  NTC_R0        = 10000.0f;
const float  NTC_T0        = 298.15f;
float readSkinTempNTC();

// ====== AÑADIR: Pines HX711 y estado ======
#define HX_DT   6
#define HX_SCK  5
HX711 gScale;
float gCalib = 9360.0f;     // factor de calibración por defecto
bool  gScaleReady = false;


// ====== AÑADIR: Suavizado y helpers de peso ======
static inline float median3f(float a, float b, float c) {
  if (a > b) { float t=a; a=b; b=t; }
  if (b > c) { float t=b; b=c; c=t; }
  if (a > b) { float t=a; a=b; b=t; }
  return b;
}
float weightKg_raw = NAN;
float weightKg_lpf = NAN;
const float WEIGHT_LPF_ALPHA = 0.45f;

// Solo refrescar si el cambio supera 0.01 kg (10 g)
const float WEIGHT_UI_EPS_KG = 0.001f;
const float WEIGHT_SNAP_ZERO_KG = 0.01f;   // 20 g: snap a 0 para evitar ruido cerca de cero

// ===== Manual alarm triggers via BLE =====
// =========================
// UI / Redibujar setpoint desde loop() para evitar I2C en callbacks
volatile bool gNeedRedrawSP = false;
volatile bool gReqAlarm_ST = false;  // Sobretemperatura
volatile bool gReqAlarm_FF = false;  // Falla flujo
volatile bool gReqAlarm_FS = false;  // Falla sensor
volatile bool gReqAlarm_FP = false;  // Falla programa
volatile bool gReqAlarm_PI = false;  // Postura incorrecta

// =========================
// Prototipos
static bool readSHT41_on(Adafruit_SHT4x& dev, uint8_t ch, float &tC, float &rh);
static bool readSHT31_on(uint8_t ch, float &tC, float &rh);
bool getAirFiltered(float &tC_out, float &rh_out);
void drawOledA(float t_air, float t_skin);
void drawOledB(float rh_avg, float uHumPct);
void drawOledC();
void leerMatriz();
void handleButtonsMapped();
void handleSerial();
void IRAM_ATTR crucePorCeroISR();
void triacTask(void *);
static inline void setHumDutyPct(float pct);
static inline float humDiscretePWM(float err);
void updateAlarms(float t_air_now, float t_skin_now, float rh_now);
void handleBleAlarmCommand(const String& raw);


// === BLE ===
void bleInit();
String buildBleStatus();
void bleSendStatus();

// ====== AÑADIR: Peso (funciones) ======
void weightBegin();
float readWeightKg();
void drawWeightOverlay(float kg);
void drawWeightOverlay_force();
String buildBleStatusPlusWeight(float kg);

// ====== AÑADIR: DFPlayer (funciones) ======
void dfInitDFPlayer();
bool dfPlayIdx(uint16_t idx);   // idx 1..3000 => /MP3/0001.mp3, etc.
// (Opcional mute por si luego lo usas)
void dfSetMute(bool on);

// =========================
// UI helpers & OLEDs
static inline String f1(float v) { char b[16]; snprintf(b,sizeof(b),"%.1f", v); return String(b); }
static inline String f2(float v) { char b[16]; snprintf(b,sizeof(b),"%.2f", v); return String(b); }

// =========================
unsigned long tLastUI_ms      = 0;
unsigned long tLastCtrl_ms    = 0;
unsigned long tLastCtrlHum_ms = 0;
unsigned long tLastBle_ms     = 0;

const unsigned long T_UI_MS       = 500;   // OLEDs
const unsigned long T_CTRL_MS     = 1000;  // PI temperatura
const unsigned long T_CTRL_HUM_MS = 1000;  // control humedad
const unsigned long T_READ_MS     = 500;   // lecturas aire/peso
const unsigned long T_BLE_MS      = 1000;  // envío BLE

float t_air= NAN, rh_air = NAN;
float t_skin= NAN;
float uHumPct = 0.0f;

// =========================
// Teclado y setpoints
inline unsigned long nowMs(){ return millis(); }
unsigned long repeatInterval(unsigned long heldMs){
  if (heldMs>4000) return 40; if (heldMs>2000) return 60; return HOLD_REPEAT_MS;
}
bool edgePressed(int r,int c,unsigned long now){
  if (keyPrev[r][c]==1 && keyNow[r][c]==0){
    if (now - keyLastEdgeMs[r][c] >= DEBOUNCE_MS){
      keyLastEdgeMs[r][c]=now; return true;
    }
  }
  return false;
}
void updateRepeatStateInc(bool isDown, unsigned long now){
  if (isDown){
    if (!repInc.isDown){ repInc.isDown = true; repInc.tDown = now; repInc.tLast = now; }
  } else { repInc.isDown = false; }
}
void updateRepeatStateDec(bool isDown, unsigned long now){
  if (isDown){
    if (!repDec.isDown){ repDec.isDown = true; repDec.tDown = now; repDec.tLast = now; }
  } else { repDec.isDown = false; }
}

inline void incTempSP(){ if (currentMode==MODE_AIR) spAir = fminf(spAir + 0.1f, AIR_MAX);
                         else                      spSkin= fminf(spSkin+ 0.1f, SKIN_MAX); }
inline void decTempSP(){ if (currentMode==MODE_AIR) spAir = fmaxf(spAir - 0.1f, AIR_MIN);
                         else                      spSkin= fmaxf(spSkin- 0.1f, SKIN_MIN); }
inline void incHumSP(){ spHum = fminf(spHum + 0.5f, HUM_MAX); }
inline void decHumSP(){ spHum = fmaxf(spHum - 0.5f, HUM_MIN); }

// Botonera
LightController gLight;
void handleButtonsMapped(){
  unsigned long now = nowMs();
  bool changed=false;

  if (edgePressed(BTN_TEMP_R, BTN_TEMP_C, now)){ adjustTarget=ADJ_TEMP; changed=true; }
  if (edgePressed(BTN_HUM_R,  BTN_HUM_C,  now)){ adjustTarget=ADJ_HUM;  changed=true; }

  if (adjustTarget==ADJ_TEMP){
    if (edgePressed(BTN_MODO_AIRE_R, BTN_MODO_AIRE_C, now)){ currentMode=MODE_AIR;  changed=true; }
    if (edgePressed(BTN_MODO_PIEL_R, BTN_MODO_PIEL_C, now)){ currentMode=MODE_SKIN; changed=true; }
  }

  if (edgePressed(BTN_SUBIR_R, BTN_SUBIR_C, now)){
    if (adjustTarget==ADJ_TEMP) incTempSP(); else incHumSP(); changed=true;
  }
  if (edgePressed(BTN_BAJAR_R, BTN_BAJAR_C, now)){
    if (adjustTarget==ADJ_TEMP) decTempSP(); else decHumSP(); changed=true;
  }

  if (edgePressed(BTN_CIRCADIANO_R, BTN_CIRCADIANO_C, now)) { gLight.setMode(LM_CIRCADIAN); changed=true; }
  if (edgePressed(BTN_ICTERICIA_R,  BTN_ICTERICIA_C,  now)) { gLight.setMode(LM_ICTERICIA); changed=true; }
  if (edgePressed(BTN_PBM_R,        BTN_PBM_C,        now)) { gLight.setMode(LM_PBM);       changed=true; }

  updateRepeatStateInc((keyNow[BTN_SUBIR_R][BTN_SUBIR_C] == 0), now);
  updateRepeatStateDec((keyNow[BTN_BAJAR_R][BTN_BAJAR_C] == 0), now);
  if (repInc.isDown){
    unsigned long held = now - repInc.tDown;
    if (held >= HOLD_START_MS){
      unsigned long period = repeatInterval(held);
      if (now - repInc.tLast >= period){
        if (adjustTarget==ADJ_TEMP) incTempSP(); else incHumSP();
        changed=true; repInc.tLast=now;
      }
    }
  }
  if (repDec.isDown){
    unsigned long held = now - repDec.tDown;
    if (held >= HOLD_START_MS){
      unsigned long period = repeatInterval(held);
      if (now - repDec.tLast >= period){
        if (adjustTarget==ADJ_TEMP) decTempSP(); else decHumSP();
        changed=true; repDec.tLast=now;
      }
    }
  }

  // ====== AÑADIR: TARA en b14 ======
  if (edgePressed(BTN_TARE_R, BTN_TARE_C, now)) {
    if (gScaleReady) {
      gScale.tare();
      weightKg_lpf = NAN; // reinicia suavizado para cero inmediato
    }
  }
  if (edgePressed(BTN_TARE_R, BTN_TARE_C, now)) {
    if (gScaleReady) {
      gScale.tare();
      weightKg_lpf = 0.0f;
      drawWeightOverlay_force();
    }
  }

    if (changed) {
    gNeedRedrawSP = true;   // que el loop sea el que dibuje
  }
}

// =========================
// Controlador PI temperatura (anti-windup)
struct PI_AW {
  float Kp   = 44.0f;
  float Ti   = 2344.0f;      // s
  float Kaw  = 1.0f/2344.0f; // 1/s
  float xI   = 0.0f, u=0.0f, uc=0.0f, Ts=1.0f;
  void setTs_ms(unsigned long Ts_ms){ Ts = Ts_ms/1000.0f; }
  float step(float sp, float pv){
    float e = sp - pv;
    uc = Kp*e + xI;
    float u_sat = constrain(uc, 0.0f, 100.0f);
    float Ki = Kp / Ti;
    xI += (Ki*e + Kaw*(u_sat - uc)) * Ts;
    u = u_sat;
    return u;
  }
  void reset(){ xI=0; u=0; uc=0; }
} piT;

// =========================
// LPF humedad
float rh_lpf = NAN;
const float HUM_LPF_ALPHA = 0.15f;

// =========================
// Control HUM (PI opcional)
struct PI_AW_HUM {
  float Kp   = 5.0f;
  float Ti   = 80.0f;
  float Kaw  = 1.0f/80.0f;
  float Ts   = 1.0f;
  float xI=0.0f, u=0.0f, uc=0.0f;
  void setTs_ms(unsigned long Ts_ms){ Ts = Ts_ms/1000.0f; }
  float step(float sp, float pv){
    sp = constrain(sp, HUM_MIN, HUM_MAX);
    float e  = sp - pv;
    float Ki = Kp / Ti;
    uc = Kp*e + xI;
    float u_sat = constrain(uc, 0.0f, 100.0f);
    xI += (Ki*e + Kaw*(u_sat - uc)) * Ts;
    u = u_sat;
    return u;
  }
  void reset(){ xI=0; u=0; uc=0; }
} piH;

// =========================
// TRIAC ISR / task
void IRAM_ATTR crucePorCeroISR(){
  static unsigned long lastIsr=0;
  unsigned long now = micros();
  if (now - lastIsr < 500) return;
  lastIsr = now;
  lastZeroMicros = now;
  BaseType_t hpw = pdFALSE;
  vTaskNotifyGiveFromISR(triacTaskHandle, &hpw);
  if (hpw) portYIELD_FROM_ISR();
}
void triacTask(void *){
  for(;;){
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    unsigned long zt; uint8_t p; bool skip;
    portENTER_CRITICAL(&mux);
    zt = lastZeroMicros; p = brillo_percent; skip = skipFiring;
    portEXIT_CRITICAL(&mux);
    if (skip) continue;
    unsigned long delayUS = map((int)p, 0, 100, (int)HALF_CYCLE_US, 0);
    unsigned long target  = zt + delayUS;
    while ((long)(micros() - target) < 0) { /* espera activa */ }
    digitalWrite(TRIAC_PIN, HIGH);
    delayMicroseconds(GATE_US);
    digitalWrite(TRIAC_PIN, LOW);
  }
}

// =========================
// Humedad PWM helpers
static inline void setHumDutyPct(float pct){
  pct = constrain(pct, 0.0f, 100.0f);
  uint32_t duty = (uint32_t) lroundf( (pct * ((1<<HUM_RES_BITS)-1)) / 100.0f );
  ledc_set_duty(HUM_SPEED, HUM_CHANNEL, duty);
  ledc_update_duty(HUM_SPEED, HUM_CHANNEL);
}
static inline float humDiscretePWM(float err){
  if (isnan(err)) return 0.0f;
  if (err < HUM_E0)       return 0.0f;   // <2% => OFF
  else if (err <= HUM_E1) return 30.0f;  // 2–5%
  else if (err <= HUM_E2) return 60.0f;  // 6–10%
  else if (err >= HUM_E3) return 100.0f; // >=11%
  return 60.0f;
}

// =========================
// Serial (opcional)
void handleSerial(){
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n'); cmd.trim();
  if (!cmd.length()) return;
  Serial.print(F("[RX] ")); Serial.println(cmd);
}

// =========================
// ======== BLE (UART Nordic en ESP32 BLE Arduino) ========
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

BLEServer *pServer = nullptr;
BLECharacteristic *pTxCharacteristic = nullptr;
BLECharacteristic *pRxCharacteristic = nullptr;
volatile bool deviceConnected = false;
volatile bool oldDeviceConnected = false;

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *s) { deviceConnected = true; }
  void onDisconnect(BLEServer *s) {
    deviceConnected = false;
    BLEDevice::startAdvertising();    // reinicia advertising
  }
};

class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    // Usa Arduino String porque getValue() devuelve String en tu core
    String v = c->getValue();
    if (v.length() > 0) {
      Serial.print("[BLE RX] ");
      Serial.println(v);  // imprime UTF-8 tal cual
      // <<< AÑADIR: parseo de comandos de alarmas >>>
      handleBleAlarmCommand(v);
    }
  }
};


void bleInit(){
  BLEDevice::init("Marsupia-JYNCS"); // nombre visible en el scan
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  pRxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();

  BLEAdvertising *pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  pAdv->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE listo: advertising...");
}

// Construye el mismo texto que muestran las OLEDs (UTF-8)
String buildBleStatus(){
  String line1 = "TEMP Air: ";
  line1 += isnan(t_air) ? "--.-" : f1(t_air);
  line1 += " C | Skin: ";
  line1 += isnan(t_skin) ? "--.-" : f1(t_skin);
  line1 += " C\n";

  String line2 = "RH: ";
  line2 += isnan(rh_lpf) ? (isnan(rh_air) ? "--.-" : f1(rh_air)) : f1(rh_lpf);
  line2 += " % | uHum: ";
  line2 += String((int)roundf((double)uHumPct));
  line2 += " %\n";

  String line3 = "Mode: ";
  line3 += (currentMode==MODE_AIR) ? "AIR" : "SKIN";
  line3 += " | Target: ";
  line3 += (adjustTarget==ADJ_TEMP) ? "TEMP" : "HUM";
  line3 += "\n";

  String line4 = "SP Air: ";
  line4 += f1(spAir);
  line4 += " C | SP Skin: ";
  line4 += f1(spSkin);
  line4 += " C | SP Hum: ";
  line4 += f1(spHum);
  line4 += " %";

  String line5 = "Light: ";
  switch (gLight.getMode()) {
    case LM_CIRCADIAN: line5 += "CIRC"; break;
    case LM_ICTERICIA: line5 += "ICT"; break;
    case LM_PBM:       line5 += "PBM"; break;
  }

  return line1 + line2 + line3 + line4 + line5;
}

// ====== AÑADIR: BLE con peso agregado ======
String buildBleStatusPlusWeight(float kg) {
  String base = buildBleStatus();
  base += "\nWeight: ";
  if (isnan(kg)) base += "--.--";
  else           base += f2(kg);
  base += " kg";
  return base;
}

void bleSendStatus(){
  if (!deviceConnected || pTxCharacteristic==nullptr) return;
  String s = buildBleStatusPlusWeight(weightKg_lpf); // UTF-8
  pTxCharacteristic->setValue((uint8_t*)s.c_str(), s.length());
  pTxCharacteristic->notify();
}

// =========================
// OLEDs
void drawOledA(float t_air, float t_skin) {
  tcaSelect(CH_OLED_A);
  oledA.clearDisplay(); oledA.setTextColor(SH110X_WHITE);
  oledA.setTextSize(1); oledA.setCursor(0,0); oledA.println(F("TEMPERATURE"));
  oledA.setCursor(0,20); oledA.print(F("Air: "));
  oledA.setTextSize(2); oledA.setCursor(40,14);
  if (isnan(t_air)) oledA.print(F("--.-")); else oledA.print(f1(t_air));
  oledA.setTextSize(1); oledA.print(" C");
  oledA.setCursor(0,48); oledA.print(F("Skin: "));
  oledA.setTextSize(2); oledA.setCursor(56,42);
  if (isnan(t_skin)) oledA.print(F("--.-")); else oledA.print(f1(t_skin));
  oledA.setTextSize(1); oledA.print(" C");
  oledA.display();
}

void drawOledB(float rh_avg, float uHumPct_) {
  tcaSelect(CH_OLED_B);
  oledB.clearDisplay(); oledB.setTextColor(SH110X_WHITE);
  oledB.setTextSize(1); oledB.setCursor(0,0); oledB.println(F("HUMIDITY & WEIGHT"));
  oledB.setCursor(0,20); oledB.print(F("RH: "));
  oledB.setTextSize(2); oledB.setCursor(36,14);
  if (isnan(rh_avg)) oledB.print(F("--.-")); else oledB.print(f1(rh_avg));
  oledB.setTextSize(1); oledB.print(" %");

  oledB.setCursor(80, 32);
  oledB.print(F("u=")); oledB.print((int)roundf(uHumPct_)); oledB.print(F("%"));

  // ===== Peso (igual estilo que overlay) =====
  oledB.setTextSize(1);
  oledB.setCursor(0,48);
  oledB.print(F("Weight: "));
  oledB.setTextSize(2);
  oledB.setCursor(60,42);
  if (isnan(weightKg_lpf)) {
    oledB.print(F("--.--"));
  } else {
    char buf[16];
    snprintf(buf, sizeof(buf), "%.2f", (double)weightKg_lpf);
    oledB.print(buf);
  }
  oledB.setTextSize(1);
  oledB.print(F(" kg"));

  oledB.display();
}

void drawOledC() {
  tcaSelect(CH_OLED_C);
  oledC.clearDisplay(); oledC.setTextColor(SSD1306_WHITE);
  oledC.setTextSize(1); oledC.setCursor(0,0);
  if (adjustTarget == ADJ_TEMP)
    oledC.println( (currentMode==MODE_AIR) ? F("SETPOINT TEMP: AIR") : F("SETPOINT TEMP: SKIN") );
  else
    oledC.println(F("SETPOINT HUMIDITY"));
  const int yLine=14; for(int x=0;x<128;x++) oledC.drawPixel(x,yLine,SSD1306_WHITE);
  oledC.setTextSize(3); oledC.setCursor(12,28);
  if (adjustTarget==ADJ_TEMP) {
    float val = (currentMode==MODE_AIR)? spAir : spSkin;
    oledC.print(f1(val)); oledC.setTextSize(1); oledC.print(" C");
  } else {
    oledC.print(f1(spHum)); oledC.setTextSize(1); oledC.print(" %");
  }
  oledC.setTextSize(1); oledC.setCursor(0,56);
  if (adjustTarget==ADJ_TEMP)
    oledC.print(F("00:AIR 11:SKIN 02:+ 01:- 12:HUM 10:TEMP 03:CIRC 13:ICT 04:PBM"));
  else
    oledC.print(F("12:HUM 10:TEMP 02:+ 01:- 03:CIRC 13:ICT 04:PBM"));
  oledC.display();
}

// ====== AÑADIR: Overlay del peso en OLED-B, misma línea y sin titilar ======
void drawWeightOverlay(float kg) {
  static float lastShown = NAN;

  if (!isfinite(kg)) {
    if (isfinite(lastShown)) kg = lastShown;
    else                     kg = 0.0f;
  }

  if (isfinite(lastShown) && fabsf(kg - lastShown) < WEIGHT_UI_EPS_KG) {
    return;
  }

  tcaSelect(CH_OLED_B);
  for (int y=40; y<=62; ++y) {
    for (int x=58; x<=124; ++x) {
      oledB.drawPixel(x, y, SH110X_BLACK);
    }
  }

  oledB.setTextColor(SH110X_WHITE);
  oledB.setTextSize(1);  oledB.setCursor(0,48);    oledB.print(F("Weight: "));
  oledB.setTextSize(2);  oledB.setCursor(60,42);
  {
    char buf[16];
    snprintf(buf, sizeof(buf), "%.2f", (double)kg);
    oledB.print(buf);
  }
  oledB.setTextSize(1);  oledB.print(F(" kg"));
  oledB.display();

  lastShown = kg;
}

void drawWeightOverlay_force() {
  tcaSelect(CH_OLED_B);
  for (int y=40; y<=62; ++y)
    for (int x=58; x<=124; ++x)
      oledB.drawPixel(x, y, SH110X_BLACK);
  oledB.setTextColor(SH110X_WHITE);
  oledB.setTextSize(1);  oledB.setCursor(0,48);  oledB.print(F("Weight: "));
  oledB.setTextSize(2);  oledB.setCursor(60,42); oledB.print(F("0.00"));
  oledB.setTextSize(1);  oledB.print(F(" kg"));
  oledB.display();
}

// =========================
// Lecturas SHT y NTC
static bool readSHT41_on(Adafruit_SHT4x& dev, uint8_t ch, float &tC, float &rh) {
  sensors_event_t h, t;
  tcaSelect(ch);
  for (uint8_t k=0; k<MAX_RETRIES; ++k) {
    if (dev.getEvent(&h, &t) && !isnan(t.temperature) && !isnan(h.relative_humidity)) {
      tC = t.temperature; rh = h.relative_humidity; return true;
    }
    delay(5);
  }
  return false;
}
static bool readSHT31_on(uint8_t ch, float &tC, float &rh) {
  tcaSelect(ch);
  for (uint8_t k=0; k<MAX_RETRIES; ++k) {
    float t = sht31.readTemperature();
    float h = sht31.readHumidity();
    if (!isnan(t) && !isnan(h)) { tC = t; rh = h; return true; }
    delay(5);
  }
  return false;
}
static inline float median3(float a, float b, float c) {
  if (a > b) { float t=a; a=b; b=t; }
  if (b > c) { float t=b; b=c; c=t; }
  if (a > b) { float t=a; a=b; b=t; }
  return b;
}
static inline float avg3(float a, float b, float c) {
  float s=0; int n=0;
  if (!isnan(a)) { s+=a; n++; }
  if (!isnan(b)) { s+=b; n++; }
  if (!isnan(c)) { s+=c; n++; }
  return n? s/n : NAN;
}
bool getAirFiltered(float &tC_out, float &rh_out) {
  float t1=NAN,h1=NAN, t2=NAN,h2=NAN, t3=NAN,h3=NAN;
  bool ok1 = readSHT41_on(sht41_a, CH_SHT41_A, t1, h1);
  bool ok2 = readSHT41_on(sht41_b, CH_SHT41_B, t2, h2);
  bool ok3 = readSHT31_on(      CH_SHT31,   t3, h3);

  // <<< NUEVO: publica estado de salud >>>
  gOkSHT41_A = ok1;
  gOkSHT41_B = ok2;
  gOkSHT31   = ok3;

  if (!(ok1||ok2||ok3)) return false;

  float t_med = (ok1&&ok2&&ok3) ? median3(t1,t2,t3) :
                (ok1&&ok2) ? 0.5f*(t1+t2) :
                (ok1&&ok3) ? 0.5f*(t1+t3) :
                (ok2&&ok3) ? 0.5f*(t2+t3) :
                (ok1? t1 : ok2? t2 : t3);

  float tvals[3]; int n=0;
  if (ok1 && fabs(t1-t_med) <= OUTLIER_THRESH_C) tvals[n++]=t1;
  if (ok2 && fabs(t2-t_med) <= OUTLIER_THRESH_C) tvals[n++]=t2;
  if (ok3 && fabs(t3-t_med) <= OUTLIER_THRESH_C) tvals[n++]=t3;
  float tavg = n? ( (n==1)? tvals[0] : (n==2? 0.5f*(tvals[0]+tvals[1]) : (tvals[0]+tvals[1]+tvals[2])/3.0f) ) : t_med;

    // ==== RH: mediana + recorte de atípicos (igual criterio que temperatura) ====
  float rh_med = (ok1&&ok2&&ok3) ? median3(h1,h2,h3) :
                 (ok1&&ok2) ? 0.5f*(h1+h2) :
                 (ok1&&ok3) ? 0.5f*(h1+h3) :
                 (ok2&&ok3) ? 0.5f*(h2+h3) :
                 (ok1? h1 : ok2? h2 : h3);

  float rhvals[3]; int nh=0;
  if (ok1 && fabs(h1 - rh_med) <= RH_OUTLIER_THRESH_PCT) rhvals[nh++]=h1;
  if (ok2 && fabs(h2 - rh_med) <= RH_OUTLIER_THRESH_PCT) rhvals[nh++]=h2;
  if (ok3 && fabs(h3 - rh_med) <= RH_OUTLIER_THRESH_PCT) rhvals[nh++]=h3;

  float rhavg = nh? ( (nh==1)? rhvals[0] : (nh==2? 0.5f*(rhvals[0]+rhvals[1]) : (rhvals[0]+rhvals[1]+rhvals[2])/3.0f) )
                  : rh_med;


  if (!filt_ok || isnan(filtC)) { filtC = tavg; filt_ok = true; }
  else                          { filtC = ALPHA*tavg + (1.0f-ALPHA)*filtC; }

    // Filtrado IIR de humedad (simétrico al de temperatura)
  if (!filtRH_ok || isnan(filtRH)) { filtRH = rhavg; filtRH_ok = true; }
  else                             { filtRH = HUM_LPF_ALPHA*rhavg + (1.0f - HUM_LPF_ALPHA)*filtRH; }

  tC_out = filtC;
  rh_out = filtRH;   // << ahora RH sale ya filtrada
  return true;

}

float readSkinTempNTC() {
  int raw = analogRead(NTC_ADC_PIN);
  if (raw <= 0) { gOkNTC = false; return NAN; }

  // Convertir a voltaje (V)
  float voltage = (raw * NTC_ADC_REF) / NTC_ADC_MAX;

  // Calcular la temperatura en °C con tu calibración lineal
  float c = 8.76f * voltage + 17.67f;

  gOkNTC = isfinite(c);
  return c;
}


// ====== AÑADIR: Inicialización y lectura de balanza ======
void weightBegin() {
  gScale.begin(HX_DT, HX_SCK);
  gScale.set_scale(gCalib); // 9653 -> gramos
  gScale.tare();
  gScale.power_up();        // asegura alimentación lógica
  gScaleReady = true;
}
float readWeightKg() {
  if (!gScaleReady) return NAN;

  if (!gScale.is_ready()) {
    return weightKg_lpf;
  }

  float g1 = gScale.get_units(3);
  float g2 = gScale.get_units(3);
  float g3 = gScale.get_units(3);

  float g_med = median3f(g1, g2, g3); // gramos
  if (!isfinite(g_med) || fabsf(g_med) > 500000.0f) {
    return weightKg_lpf;
  }

  float kg = g_med;

  if (isnan(weightKg_lpf)) weightKg_lpf = kg;
  else                     weightKg_lpf = WEIGHT_LPF_ALPHA*kg + (1.0f-WEIGHT_LPF_ALPHA)*weightKg_lpf;

  // Diagnóstico rápido: mantener TARE (b14) presionado >=2 s para imprimir crudo
  static bool diagWasDown=false;
  static unsigned long diagDownMs=0;
  bool tareDown = (keyNow[BTN_TARE_R][BTN_TARE_C]==0);
  if (tareDown && !diagWasDown){ diagWasDown=true; diagDownMs = millis(); }
  if (!tareDown && diagWasDown){ diagWasDown=false; }
  if (diagWasDown && millis() - diagDownMs >= 2000) {
    diagWasDown = false;
    long raw = gScale.read_average(10);
    Serial.print(F("[HX711] raw=")); Serial.print(raw);
    Serial.print(F("  grams=")); Serial.print(g_med, 2);
    Serial.print(F("  kg=")); Serial.println(kg, 3);
  }

  return weightKg_lpf;
}

// =========================
// Teclado y setpoints: lectura de matriz
void leerMatriz() {
  for (int i=0;i<F;i++) pinMode(filas[i], INPUT);
  for (int j=0;j<C;j++) pinMode(columnas[j], INPUT);
  for (int i=0;i<F;i++) {
    pinMode(filas[i], OUTPUT); digitalWrite(filas[i], LOW);
    for (int j=0;j<C;j++) {
      pinMode(columnas[j], INPUT_PULLUP);
      keyNow[i][j] = digitalRead(columnas[j]); // 1 libre, 0 pulsado
      pinMode(columnas[j], INPUT);
    }
    pinMode(filas[i], INPUT);
  }
}

// =========================
// ====== AÑADIR: DFPlayer (objetos y pines) ======
HardwareSerial DFSerial(2);         // UART2 del S3
DFRobotDFPlayerMini dfplayer;
static bool dfReady = false;


// Ajusta si necesitas otros pines UART2
static const int DF_RX = 18;        // ESP32-S3 RX ← DF TX
static const int DF_TX = 17;        // ESP32-S3 TX → DF RX
static const uint8_t DF_DEFAULT_VOL = 25; // 0..30

// ====== AÑADIR: Audio volumen por ble
uint8_t gDfVolume = DF_DEFAULT_VOL;   // 0..30
bool    gDfMuted  = false;


void dfInitDFPlayer() {
  DFSerial.begin(9600, SERIAL_8N1, DF_RX, DF_TX);
  // Intento único de begin para no bloquear
  dfReady = dfplayer.begin(DFSerial, /*isACK=*/true, /*doReset=*/true);
  if (dfReady) {
    dfplayer.volume(DF_DEFAULT_VOL);
    dfplayer.EQ(DFPLAYER_EQ_NORMAL);
  }
  // No imprimimos nada aquí para respetar tu requisito
}

bool dfPlayIdx(uint16_t idx) {
  if (!dfReady || idx == 0) return false;
  // /MP3/0001.mp3 -> idx=1; /MP3/0002.mp3 -> idx=2 ...
  dfplayer.playMp3Folder(idx);
  return true;
}

  void dfSetMute(bool on) {
  if (!dfReady) return;

  if (on) {
    dfplayer.volume(0);
    gDfMuted = true;
  } else {
    dfplayer.volume(gDfVolume);
    gDfMuted = false;
  }
}


// =========================
// Setup
void setup(){
  Serial.begin(115200);
  delay(100);

  for (int i=0;i<F;i++) for(int j=0;j<C;j++){ keyPrev[i][j]=keyNow[i][j]=1; keyLastEdgeMs[i][j]=0; }

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);

  // SHT41 A/B y SHT31
  tcaSelect(CH_SHT41_A);
  if (!sht41_a.begin()) Serial.println(F("SHT41_A no encontrado (CH6)"));
  else { sht41_a.setPrecision(SHT4X_HIGH_PRECISION); sht41_a.setHeater(SHT4X_NO_HEATER); }
  tcaSelect(CH_SHT41_B);
  if (!sht41_b.begin()) Serial.println(F("SHT41_B no encontrado (CH7)"));
  else { sht41_b.setPrecision(SHT4X_HIGH_PRECISION); sht41_b.setHeater(SHT4X_NO_HEATER); }
  tcaSelect(CH_SHT31);
  if (!sht31.begin(0x44)) Serial.println(F("SHT31 no encontrado (CH1 0x44)"));
  else sht31.heater(false);

  // OLEDs
  tcaSelect(CH_OLED_A);
  if (!oledA.begin(0x3C,true)) Serial.println(F("SH1106 A no encontrada (CH4)")); else { oledA.clearDisplay(); oledA.display(); }
  tcaSelect(CH_OLED_B);
  if (!oledB.begin(0x3C,true)) Serial.println(F("SH1106 B no encontrada (CH3)")); else { oledB.clearDisplay(); oledB.display(); }
  tcaSelect(CH_OLED_C);
  if (!oledC.begin(SSD1306_SWITCHCAPVCC, 0x3C)) Serial.println(F("SSD1306 no encontrada (CH2)")); else { oledC.clearDisplay(); oledC.display(); }
  drawOledC();

  // Warm-up filtro aire
  for (int tries=0; tries<20 && !filt_ok; ++tries){ float tC,rh; if (getAirFiltered(tC,rh)) break; delay(20); }

  // NTC
  analogReadResolution(12);
  pinMode(NTC_ADC_PIN, INPUT);

  // TRIAC
  pinMode(TRIAC_PIN, OUTPUT); digitalWrite(TRIAC_PIN, LOW);
  xTaskCreatePinnedToCore(triacTask, "triacTask", 2048, NULL, 2, &triacTaskHandle, 1);
  delay(50);
  pinMode(ZC_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(ZC_PIN), crucePorCeroISR, CHANGE);

  // PI temperatura
  piT.setTs_ms(T_CTRL_MS); piT.reset();

  // LEDC HUMEDAD
  ledc_timer_config_t timer = {
    .speed_mode       = HUM_SPEED,
    .duty_resolution  = (ledc_timer_bit_t)HUM_RES_BITS,
    .timer_num        = HUM_TIMER,
    .freq_hz          = HUM_FREQ_HZ,
    .clk_cfg          = LEDC_AUTO_CLK
  };
  ledc_timer_config(&timer);

  ledc_channel_config_t ch = {
    .gpio_num   = HUM_PWM_PIN,
    .speed_mode = HUM_SPEED,
    .channel    = HUM_CHANNEL,
    .intr_type  = LEDC_INTR_DISABLE,
    .timer_sel  = HUM_TIMER,
    .duty       = 0,
    .hpoint     = 0
  };
  ledc_channel_config(&ch);
  setHumDutyPct(0.0f);

  // PI humedad (si activas modo 1)
  piH.setTs_ms(T_CTRL_HUM_MS); piH.reset();

  // Luces
  gLight.begin();

  // BLE
  bleInit();

  // ====== Balanza ======
  weightBegin();

  // ====== Alarmas (LEDs) =====
  
  pinMode(LED_OVERTEMP_PIN,   OUTPUT); digitalWrite(LED_OVERTEMP_PIN, LOW);
  pinMode(LED_FLOWFAIL_PIN,   OUTPUT); digitalWrite(LED_FLOWFAIL_PIN, LOW);
  pinMode(LED_SENSORFAIL_PIN, OUTPUT); digitalWrite(LED_SENSORFAIL_PIN, LOW);
  pinMode(LED_WDFAIL_PIN,     OUTPUT); digitalWrite(LED_WDFAIL_PIN, LOW);
  pinMode(LED_POSTURE_PIN,    OUTPUT); digitalWrite(LED_POSTURE_PIN, LOW);

  // Si quieres intentar activar pulldown interno:
  gpio_pulldown_en((gpio_num_t)LED_OVERTEMP_PIN);
  gpio_pulldown_en((gpio_num_t)LED_FLOWFAIL_PIN);
  gpio_pulldown_en((gpio_num_t)LED_SENSORFAIL_PIN);
  gpio_pulldown_en((gpio_num_t)LED_WDFAIL_PIN);
  gpio_pulldown_en((gpio_num_t)LED_POSTURE_PIN);

  // ====== Entradas =====
  pinMode(FLOW_IN_PIN,    (FLOW_FAIL_ACTIVE_LOW? INPUT_PULLUP : INPUT)); // si activo en bajo, PULLUP
  pinMode(POSTURE_IN_PIN, INPUT_PULLDOWN);  // Señal lógica desde ESP32-CAM
  gpio_pulldown_en((gpio_num_t)POSTURE_IN_PIN);  // refuerza el pulldown en el S3

  // ====== AÑADIR: DFPlayer ======
  dfInitDFPlayer();   // no imprime por Serial
}

// =========================
// Loop
void loop(){
  handleSerial();

  // Teclado
  leerMatriz();
  handleButtonsMapped();
  for (int i=0;i<F;i++) for (int j=0;j<C;j++) keyPrev[i][j] = keyNow[i][j];

  // Sensores + Peso (con watchdog SOLO aquí)
  unsigned long now = millis();
  static unsigned long lastRead_ms_local = 0;

  // Vigila si una lectura quedó "colgada" > 3 s
  if (gSensorReadRunning && (now - gSensorReadStart > SENSOR_WD_MS)) {
    gWatchdogTrip = true;
  }

  if (now - lastRead_ms_local >= T_READ_MS){
    lastRead_ms_local = now;

    // Inicia sección vigilada por watchdog
    gSensorReadRunning = true;
    gSensorReadStart   = now;

    bool gotAir = getAirFiltered(t_air, rh_air);
    (void)gotAir; // no se usa explícitamente aquí
    t_skin = readSkinTempNTC();

    // Fin de sección vigilada
    gSensorReadRunning = false;

    // LPF humedad
    // if (isnan(rh_lpf)) rh_lpf = rh_air;
    // else if (!isnan(rh_air)) rh_lpf = HUM_LPF_ALPHA*rh_air + (1.0f-HUM_LPF_ALPHA)*rh_lpf;
    rh_lpf = rh_air;
    // Peso
    readWeightKg();
  }

  // Control PI (temperatura)
  if (now - tLastCtrl_ms >= T_CTRL_MS){
    tLastCtrl_ms = now;
    float pv = (currentMode==MODE_AIR)? t_air : t_skin;
    float sp = (currentMode==MODE_AIR)? spAir : spSkin;
    float u = 0.0f;
    if (!isnan(pv)) u = piT.step(sp, pv);
    else { piT.reset(); u = 0.0f; }
    portENTER_CRITICAL(&mux);
    brillo_percent = (uint8_t)lroundf(u);
    skipFiring = (brillo_percent==0);
    portEXIT_CRITICAL(&mux);
  }

  // Control HUM
  if (now - tLastCtrlHum_ms >= T_CTRL_HUM_MS){
    tLastCtrlHum_ms = now;
    float pvRH = isnan(rh_lpf) ? rh_air : rh_lpf;
    float spRH = spHum;

    if (isnan(pvRH) || isnan(spRH)) {
      uHumPct = 0.0f;
    } else {
#if HUM_CONTROL_MODE == 0
      float err = spRH - pvRH;
      uHumPct = humDiscretePWM(err);
#else
      float u = piH.step(spRH, pvRH);
      if (u > 0.0f && u < 60.0f) u = 60.0f; // fuerza banda útil
      uHumPct = u;
#endif
    }
    setHumDutyPct(uHumPct);
  }

  // UI
  if (now - tLastUI_ms >= T_UI_MS){
    tLastUI_ms = now;
    drawOledA(t_air, t_skin);
    drawOledB(rh_air, uHumPct);
    drawWeightOverlay(weightKg_lpf);
    // drawOledC(); // se actualiza al cambiar algo en la botonera
  }
  
  if (gNeedRedrawSP) {
    drawOledC();
    gNeedRedrawSP = false;
  }
  // BLE: envía cada T_BLE_MS
  if (now - tLastBle_ms >= T_BLE_MS){
    tLastBle_ms = now;
    bleSendStatus();
  }

  // Luces
  gLight.update();

  // ======= ALARMAS (se evalúan cada ciclo) =======
  updateAlarms(t_air, t_skin, (isnan(rh_lpf)? rh_air : rh_lpf));
}

// =========================


void handleBleAlarmCommand(const String& raw) {
  String s = raw;
  s.trim();
  if (!s.length()) return;

  String sUpper = s;
  sUpper.toUpperCase();

  // ======== 1) Comandos de prueba de alarmas ========
  if (sUpper.indexOf("PRST") >= 0) gReqAlarm_ST = true;
  if (sUpper.indexOf("PRFF") >= 0) gReqAlarm_FF = true;
  if (sUpper.indexOf("PRFS") >= 0) gReqAlarm_FS = true;
  if (sUpper.indexOf("PRFP") >= 0) gReqAlarm_FP = true;
  if (sUpper.indexOf("PRPI") >= 0) gReqAlarm_PI = true;

  // ======== 2) KEY = VALUE ========
  int eqPos = s.indexOf('=');
  if (eqPos < 0) return;

  String key = s.substring(0, eqPos); key.trim();
  String val = s.substring(eqPos + 1); val.trim();
  String keyU = key; keyU.toUpperCase();
  String valU = val; valU.toUpperCase();

  bool needDrawSP = false;

  // ======== NUEVO: volumen DFPLAYER ========
  if (keyU == "VOL") {
    int v = val.toInt();
    v = constrain(v, 0, 30);
    gDfVolume = v;
    if (!gDfMuted) dfplayer.volume(gDfVolume);
    return;
  }

  // ======== NUEVO: mute ON/OFF ========
  if (keyU == "MUTE") {
    if (valU == "ON"  || valU == "1" || valU == "TRUE")  dfSetMute(true);
    if (valU == "OFF" || valU == "0" || valU == "FALSE") dfSetMute(false);
    return;
  }

  // ======== NUEVO: TSPA / TSPS / HSP ========
  if (keyU == "TSPA") {
    float v = val.toFloat();
    spAir = constrain(v, AIR_MIN, AIR_MAX);
    currentMode = MODE_AIR;
    adjustTarget = ADJ_TEMP;
    needDrawSP = true;
  }
  else if (keyU == "TSPS") {
    float v = val.toFloat();
    spSkin = constrain(v, SKIN_MIN, SKIN_MAX);
    currentMode = MODE_SKIN;
    adjustTarget = ADJ_TEMP;
    needDrawSP = true;
  }
  else if (keyU == "HSP") {
    float v = val.toFloat();
    spHum = constrain(v, HUM_MIN, HUM_MAX);
    adjustTarget = ADJ_HUM;
    needDrawSP = true;
  }
  else if (keyU == "LIGHT" || keyU == "LI") {
    if (valU == "CIRC") gLight.setMode(LM_CIRCADIAN);
    else if (valU == "ICT") gLight.setMode(LM_ICTERICIA);
    else if (valU == "PBM") gLight.setMode(LM_PBM);
  }

      if (needDrawSP) {
    gNeedRedrawSP = true;   // solo marcamos la bandera
  }

}




// Alarmas + AUDIO DFPlayer (añadido)
void updateAlarms(float t_air_now, float t_skin_now, float rh_now) {
  static unsigned long holdUntil_ST = 0, holdUntil_FF = 0, holdUntil_FS = 0, holdUntil_FP = 0, holdUntil_PI = 0;
  const  unsigned long MANUAL_HOLD_MS = 2500;
  unsigned long nowMs = millis();


  if (gReqAlarm_ST) { holdUntil_ST = nowMs + MANUAL_HOLD_MS; gReqAlarm_ST = false; }
  if (gReqAlarm_FF) { holdUntil_FF = nowMs + MANUAL_HOLD_MS; gReqAlarm_FF = false; }
  if (gReqAlarm_FS) { holdUntil_FS = nowMs + MANUAL_HOLD_MS; gReqAlarm_FS = false; }
  if (gReqAlarm_FP) { holdUntil_FP = nowMs + MANUAL_HOLD_MS; gReqAlarm_FP = false; }
  if (gReqAlarm_PI) { holdUntil_PI = nowMs + MANUAL_HOLD_MS; gReqAlarm_PI = false; }

  bool manST = (nowMs < holdUntil_ST);
  bool manFF = (nowMs < holdUntil_FF);
  bool manFS = (nowMs < holdUntil_FS);
  bool manFP = (nowMs < holdUntil_FP);
  bool manPI = (nowMs < holdUntil_PI);

  // ===== Estados actuales por sensores (tu lógica original) =====
  bool overtemp = (isfinite(t_air_now)  && t_air_now  > 40.0f) ||
                  (isfinite(t_skin_now) && t_skin_now > 38.0f);

  int flowIn = digitalRead(FLOW_IN_PIN);
  bool flowFail = (FLOW_FAIL_ACTIVE_LOW ? (flowIn == LOW) : (flowIn == HIGH));

  bool anySensorFail = !(gOkSHT41_A && gOkSHT41_B && gOkSHT31 && gOkNTC);

  bool wdFail = gWatchdogTrip;

  bool postureBad = (digitalRead(POSTURE_IN_PIN) == HIGH);

  // ===== OR con los triggers manuales =====
  overtemp    = overtemp    || manST;
  flowFail    = flowFail    || manFF;
  anySensorFail = anySensorFail || manFS;
  wdFail      = wdFail      || manFP;
  postureBad  = postureBad  || manPI;


  // LEDs (original)
  setLed(LED_OVERTEMP_PIN,   overtemp);
  setLed(LED_FLOWFAIL_PIN,   flowFail);
  setLed(LED_SENSORFAIL_PIN, anySensorFail);
  setLed(LED_WDFAIL_PIN,     wdFail);
  setLed(LED_POSTURE_PIN,    postureBad);

  // ===== AUDIO: reproducir SOLO en flanco de subida =====
  static bool last_overtemp=false, last_flow=false, last_sensor=false, last_wd=false, last_posture=false;
  static unsigned long lastPlayMs = 0;
  const unsigned long PLAY_GUARD_MS = 1500; // anti-retrigger muy rápido

  unsigned long now = millis();
  auto tryPlay = [&](uint16_t idx){
    if (now - lastPlayMs >= PLAY_GUARD_MS) {
      dfPlayIdx(idx);
      lastPlayMs = now;
    }
  };

  if (overtemp && !last_overtemp)   tryPlay(1); // 0001.mp3
  if (flowFail && !last_flow)       tryPlay(2); // 0002.mp3
  if (anySensorFail && !last_sensor)tryPlay(3); // 0003.mp3
  if (wdFail && !last_wd)           tryPlay(4); // 0004.mp3
  if (postureBad && !last_posture)  tryPlay(5); // 0005.mp3

  last_overtemp = overtemp;
  last_flow     = flowFail;
  last_sensor   = anySensorFail;
  last_wd       = wdFail;
  last_posture  = postureBad;
}
