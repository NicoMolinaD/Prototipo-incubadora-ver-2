#include <Arduino.h>
#include "Config.h"
#include "TcaBus.h"
#include "SHTSensors.h"
#include "LTR390Light.h"
#include "NTC.h"
#include "WeightScale.h"
#include "OledCluster.h"
#include "ZeroCrossTriac.h"
#include "Alarms.h"
#include "Watchdog.h"
#include "DFPlayerMini.h"
#include "EspNowCam.h"
#include "Keypad25.h"
#include "HumidityPID.h"
#include "LightController.h"
#include "Telemetry.h"
#ifdef USE_BLE_COMM
  #include "CommBLE.h"
#endif
#ifdef USE_WIFI_COMM
  #include "CommWiFi.h"
#endif

// ========= Global singletons =========
SetpointModel gModel;
SHT41Muxed gSHT41_A(CH_SHT41_A), gSHT41_B(CH_SHT41_B),
           gSHT41_C(CH_SHT41_C), gSHT41_D(CH_SHT41_D);
LTR390Muxed gLTR(CH_LTR390);
// --- SHT31 ORIGINAL COMENTADO (no borrar) ---
// #include <Adafruit_SHT31.h>
// Adafruit_SHT31 gSHT31; // estaba en CH1 (0x44)
WeightScaleHX711 gScale;
OledCluster gUI(gModel);
DFPlayerMiniSvc gDFP;
Alarms gAlarms;
Keypad25 gKey;
HumidityPID gHumPID;
LightController gLight;

#ifdef USE_BLE_COMM
CommBLE gBLE;
#endif
#ifdef USE_WIFI_COMM
CommWiFi gWIFI;
#endif

// ========= Estado mediciones =========
struct Measurements {
  float tAir1=NAN, tAir2=NAN, tAir3=NAN, tSkin=NAN, rhAir=NAN, kg=0.0f;
  float lux=0; uint8_t postureCode=0; uint8_t airflowOK=0;
} gMeas;

// ========= Setpoints =========
float gSpHumidity = 55.0f;

// ========= Ajuste SP por keypad =========
volatile AdjustTarget gAdjust = ADJ_NONE;

// ========= RTOS handles =========
TaskHandle_t thUI=nullptr, thSENS=nullptr, thCTRL=nullptr, thALRM=nullptr, thCOMM=nullptr, thLIGHT=nullptr, thKEY=nullptr, thHUM=nullptr;

// ========= Utils =========
static inline uint8_t packAlerts(const Alarms &a){
  return (a.overtemp?1:0) | (a.airflowFail?2:0) | (a.sensorFail?4:0) |
         (a.programFail?8:0) | (a.badPosture?16:0);
}

// ========= Tarea: Sensores =========
void taskSensors(void*){
  Watchdog::addThisTask();
  bool okA=gSHT41_A.begin();
  bool okB=gSHT41_B.begin();
  bool okC=gSHT41_C.begin();
  bool okD=gSHT41_D.begin();
  bool okL=gLTR.begin();
  pinMode(AIRFLOW_PIN, INPUT);

  for(;;){
    auto r1=gSHT41_A.read(); auto r2=gSHT41_B.read();
    auto r3=gSHT41_C.read(); auto r4=gSHT41_D.read();
    gMeas.tAir1 = r1.tC; gMeas.tAir2 = r2.tC; gMeas.tAir3 = r3.tC;

    // humedad promedio válida
    float sumRH=0; int nRH=0;
    if (r1.ok){ sumRH+=r1.rh; nRH++; }
    if (r2.ok){ sumRH+=r2.rh; nRH++; }
    if (r3.ok){ sumRH+=r3.rh; nRH++; }
    if (r4.ok){ sumRH+=r4.rh; nRH++; }
    gMeas.rhAir = (nRH>0)? (sumRH/nRH): NAN;

    // NTC piel
    gMeas.tSkin = ntcReadTempC();

    // LTR390
    uint32_t raw=0; float lux=0;
    if(okL){ gLTR.readALS(raw,lux); gMeas.lux=lux; }

    // Balanza
    gMeas.kg = gScale.readKg(13);

    // Flujo de aire
    gMeas.airflowOK = digitalRead(AIRFLOW_PIN) ? 1 : 0;

    // Alarmas sensores
    gAlarms.sensorFail = (!r1.ok || !r2.ok || isnan(gMeas.tSkin));

    // Postura ESP-NOW
    gMeas.postureCode = EspNowCam::instance().lastCode;
    gAlarms.badPosture = (gMeas.postureCode!=0);

    Watchdog::feed();
    vTaskDelay(pdMS_TO_TICKS(300));
  }
}

// ========= Tarea: Control TRIAC (temperatura P) =========
// ========= Tarea: Control TRIAC (temperatura P) =========
void taskControl(void*){
  Watchdog::addThisTask();
  float Kp = KP_DEFAULT;
  for(;;){
    // 1) Setpoint según modo
    float sp = (gModel.mode==MODE_AIR) ? gModel.spAir : gModel.spSkin;

    // 2) Medición según modo:
    float t_meas = NAN;
    if (gModel.mode == MODE_AIR) {
      // promedio aire (SHT41 A y B), con fallback
      bool a_ok = !isnan(gMeas.tAir1);
      bool b_ok = !isnan(gMeas.tAir2);
      if (a_ok && b_ok)      t_meas = 0.5f*(gMeas.tAir1 + gMeas.tAir2);
      else if (a_ok)         t_meas = gMeas.tAir1;
      else if (b_ok)         t_meas = gMeas.tAir2;
    } else {
      // modo piel → NTC
      t_meas = gMeas.tSkin;
    }

    // 3) Control P (con saturación 0..100)
    int duty = 0;
    if (!isnan(t_meas)) {
      float err = sp - t_meas;
      duty = (int)roundf(Kp * err);
    }
    duty = constrain(duty, 0, 100);
    ZeroCrossTriac::setDuty((uint8_t)duty);

    // 4) Alarma de sobretemperatura (histeresis simple por modo)
    if (!isnan(t_meas)) {
      float margen = (gModel.mode==MODE_AIR) ? 1.5f : 1.0f;
      gAlarms.overtemp = (t_meas > (sp + margen)) ? 1 : 0;
    } else {
      gAlarms.overtemp = 0; // sin medición, no afirmamos sobretemp aquí
    }

    Watchdog::feed();
    vTaskDelay(pdMS_TO_TICKS(120));
  }
}


// ========= Tarea: UI =========
void taskUI(void*){
  Watchdog::addThisTask();
  unsigned long t0=millis();
  gUI.attachHumiditySp(&gSpHumidity);
  gUI.drawC();
  for(;;){
    if (millis()-t0 >= UI_SAMPLE_MS){
      gUI.drawA(gMeas.tAir1, !isnan(gMeas.tAir1), gMeas.tAir2, !isnan(gMeas.tAir2));
      gUI.drawB(gMeas.tAir3, !isnan(gMeas.tAir3), gMeas.kg);
      static float lastAir=-999, lastSkin=-999, lastHum=-999; static AdjustTarget lastAdj=ADJ_NONE;
      if (gModel.spAir!=lastAir || gModel.spSkin!=lastSkin || gSpHumidity!=lastHum || gAdjust!=lastAdj){
        gUI.drawC(); lastAir=gModel.spAir; lastSkin=gModel.spSkin; lastHum=gSpHumidity; lastAdj=gAdjust;
      }
      t0=millis();
    }
    Watchdog::feed();
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// ========= Tarea: Alarmas (DFPlayer + lógica) =========
void taskAlarms(void*){
  Watchdog::addThisTask();
  for(;;){
    gAlarms.airflowFail = (gMeas.airflowOK==0) ? 1:0;
    if      (gAlarms.overtemp)         gDFP.playAlert(AT_OVERTEMP);
    else if (gAlarms.airflowFail)      gDFP.playAlert(AT_AIRFLOW_FAIL);
    else if (gAlarms.sensorFail)       gDFP.playAlert(AT_SENSOR_FAIL);
    else if (gAlarms.programFail)      gDFP.playAlert(AT_PROGRAM_FAIL);
    else if (gAlarms.badPosture)       gDFP.playAlert(AT_BAD_POSTURE);
    gDFP.poll();
    Watchdog::feed();
    vTaskDelay(pdMS_TO_TICKS(300));
  }
}

// ========= Tarea: Comunicación =========
void taskComm(void*){
  Watchdog::addThisTask();
  #ifdef USE_BLE_COMM
    gBLE.begin();
  #endif
  #ifdef USE_WIFI_COMM
    gWIFI.begin();
  #endif
  for(;;){
    TelemetryPacket pkt;   // <-- ahora usa el tipo compartido
    pkt.tAir = (!isnan(gMeas.tAir1)? gMeas.tAir1 : 0.0f);
    pkt.tSkin = (!isnan(gMeas.tSkin)? gMeas.tSkin : 0.0f);
    pkt.rh = (!isnan(gMeas.rhAir)? gMeas.rhAir : 0.0f);
    pkt.kg = gMeas.kg;
    pkt.alerts = (gAlarms.overtemp?1:0) | (gAlarms.airflowFail?2:0) |
                 (gAlarms.sensorFail?4:0) | (gAlarms.programFail?8:0) |
                 (gAlarms.badPosture?16:0);
    #ifdef USE_BLE_COMM
      gBLE.send(pkt);
    #endif
    #ifdef USE_WIFI_COMM
      gWIFI.send(pkt);
    #endif
    Watchdog::feed();
    vTaskDelay(pdMS_TO_TICKS(500));
  }
}


// ========= Tarea: Luces =========
void taskLight(void*){
  Watchdog::addThisTask();
  for(;;){
    gLight.update();
    Watchdog::feed();
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

// ========= Tarea: Keypad (combinaciones 12+02 / 12+01) =========
void taskKeypad(void*){
  Watchdog::addThisTask();
  for(;;){
    uint16_t m = gKey.scanPressedMask();
    auto HAS = [&](int r,int c)->bool{ return Keypad25::has(m,r,c); };

    // Selección de ajuste
    if (HAS(1,0)) { gAdjust = ADJ_TEMP; gUI.setStatus(ADJ_TEMP); gUI.drawC(); } // 10
    if (HAS(1,2)) { if (gAdjust!=ADJ_TEMP){ gAdjust = ADJ_HUM; gUI.setStatus(ADJ_HUM); gUI.drawC(); } } // 12

    // Cambiar control AIR/SKIN
    if (HAS(0,0)) { gModel.mode = MODE_AIR;  gUI.drawC(); } // 00
    if (HAS(1,1)) { gModel.mode = MODE_SKIN; gUI.drawC(); } // 11

    // Modos de luz
    if (HAS(0,3)) { gLight.setMode(LM_CIRCADIAN); gUI.drawC(); } // 03
    if (HAS(1,3)) { gLight.setMode(LM_ICTERICIA); gUI.drawC(); } // 13
    if (HAS(0,4)) { gLight.setMode(LM_PBM);       gUI.drawC(); } // 04

    // TARA
    if (HAS(1,4)) { gScale.tare(); }

    // Ajustes combinados: 12 + 02/01
    bool mod12 = HAS(1,2);   // 12
    bool up02  = HAS(0,2);   // 02
    bool dn01  = HAS(0,1);   // 01
    if (mod12 && (up02 || dn01)) {
      if (gAdjust == ADJ_HUM) {
        if (up02) gSpHumidity = min(gSpHumidity + 0.5f, 95.0f);
        if (dn01) gSpHumidity = max(gSpHumidity - 0.5f, 30.0f);
        gUI.drawC();
      } else if (gAdjust == ADJ_TEMP) {
        if (gModel.mode==MODE_AIR){
          if (up02) gModel.spAir  = min(gModel.spAir + 0.1f, AIR_MAX);
          if (dn01) gModel.spAir  = max(gModel.spAir - 0.1f, AIR_MIN);
        } else {
          if (up02) gModel.spSkin = min(gModel.spSkin+0.1f, SKIN_MAX);
          if (dn01) gModel.spSkin = max(gModel.spSkin-0.1f, SKIN_MIN);
        }
        gUI.drawC();
      }
    }

    Watchdog::feed();
    vTaskDelay(pdMS_TO_TICKS(30));
  }
}

// ========= Tarea: PID de Humedad =========
void taskHumidity(void*){
  Watchdog::addThisTask();
  gHumPID.setSetpoint(gSpHumidity);
  gHumPID.setTunings(2.0f, 0.10f, 0.0f);
  gHumPID.setOutputLimits(0.0f, 100.0f);
  gHumPID.setSampleTime(500);
  for(;;){
    gHumPID.setSetpoint(gSpHumidity);
    gHumPID.update(gMeas.rhAir);
    Watchdog::feed();
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

void setup(){

  Serial.begin(115200); delay(100);
  // 1) Configura WDT sin reinicializar
  Watchdog::begin(10000, false);   // 10 s; puedes bajar luego

  // 2) Quita loopTask del WDT (¡¡esto elimina el reset que ves!!)
  Watchdog::detachFromLoop();
  
  TcaBus::begin();

  gScale.begin();
  gUI.attachHumiditySp(&gSpHumidity);
  gUI.begin();
  gDFP.begin(25);
  ZeroCrossTriac::begin();
  EspNowCam::instance().begin();
  gKey.begin();
  gLight.begin();
  gHumPID.begin();

  xTaskCreatePinnedToCore(taskSensors, "SENS", 4096, nullptr, 2, &thSENS, 0);
  xTaskCreatePinnedToCore(taskControl, "CTRL",  3072, nullptr, 2, &thCTRL, 1);
  xTaskCreatePinnedToCore(taskUI,      "UI",    4096, nullptr, 1, &thUI,   0);
  xTaskCreatePinnedToCore(taskAlarms,  "ALRM",  3072, nullptr, 1, &thALRM, 1);
  xTaskCreatePinnedToCore(taskComm,    "COMM",  4096, nullptr, 1, &thCOMM, 0);
  xTaskCreatePinnedToCore(taskLight,   "LIGHT", 3072, nullptr, 1, &thLIGHT,1);
  xTaskCreatePinnedToCore(taskKeypad,  "KEY",   3072, nullptr, 1, &thKEY,  0);
  xTaskCreatePinnedToCore(taskHumidity,"HUM",   3072, nullptr, 1, &thHUM,  0);

  gUI.setStatus(ADJ_NONE);
  gUI.drawC();

  Serial.println(F("Sistema integrado listo."));
}

void loop(){
  //static unsigned long t0=millis();
  //if (millis()-t0>1000){ Serial.println(F(".")); t0=millis(); }
  //Watchdog::feed();
  vTaskDelay(pdMS_TO_TICKS(200));
}

