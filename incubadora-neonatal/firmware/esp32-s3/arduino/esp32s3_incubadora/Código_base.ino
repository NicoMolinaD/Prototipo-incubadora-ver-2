#include <Arduino.h>
#include <HX711.h>
#include <Adafruit_SHT4x.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// -------- CONFIGURACIÓN HX711 --------
#define HX711_DOUT  4
#define HX711_SCK   5
HX711 balanza;

// -------- CONFIGURACIÓN LED --------
#define LED_PIN 2  // Puedes cambiarlo por el pin donde conectes la tira blanca

// -------- SENSOR SHT41 --------
Adafruit_SHT4x sht4 = Adafruit_SHT4x();

// -------- VARIABLES GLOBALES --------
float peso = 0;
float temperatura = 0;
float humedad = 0;
int setControl = 37; // Valor inicial entre 34 y 40 (por ejemplo)

// -------- CONFIGURACIÓN BLE --------
#define BLE_DEVICE_NAME "ESP32_BLE_Base"

BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic;
bool deviceConnected = false;

// UUIDs personalizados (puedes generarlos en https://www.uuidgenerator.net/)
#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_TX   "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"  // Enviar datos al cliente
#define CHARACTERISTIC_RX   "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"  // Recibir datos del cliente

// -------- CALLBACKS BLE --------
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
  }
};

// Cuando el ESP32 recibe un dato por BLE
class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    std::string rxValue = pCharacteristic->getValue();

    if (rxValue.length() > 0) {
      Serial.print("Dato recibido por BLE: ");
      Serial.println(rxValue.c_str());

      // Si se recibe un comando "LED_ON" o "LED_OFF"
      if (rxValue == "LED_ON") {
        digitalWrite(LED_PIN, HIGH);
        Serial.println("LED encendido");
      } else if (rxValue == "LED_OFF") {
        digitalWrite(LED_PIN, LOW);
        Serial.println("LED apagado");
      }

      // Si se recibe un comando de setControl (ej: "SET:38")
      if (rxValue.find("SET:") != std::string::npos) {
        int valor = atoi(rxValue.substr(4).c_str());
        if (valor >= 34 && valor <= 40) {
          setControl = valor;
          Serial.print("Set control actualizado a: ");
          Serial.println(setControl);
        } else {
          Serial.println("Valor fuera de rango (34–40)");
        }
      }
    }
  }
};

// -------- FUNCIONES AUXILIARES --------
void leerSensores() {
  // HX711
  if (balanza.is_ready()) {
    peso = balanza.get_units(3); // promedio de 3 lecturas
  }

  // SHT41
  sensors_event_t humidity, temp;
  sht4.getEvent(&humidity, &temp);
  temperatura = temp.temperature;
  humedad = humidity.relative_humidity;
}

void enviarDatosBLE() {
  if (deviceConnected) {
    String data = "Peso:" + String(peso, 2) +
                  ",Temp:" + String(temperatura, 1) +
                  ",Hum:" + String(humedad, 1) +
                  ",Set:" + String(setControl);
    pTxCharacteristic->setValue(data.c_str());
    pTxCharacteristic->notify();
    Serial.println("Datos enviados por BLE: " + data);
  }
}

// -------- SETUP --------
void setup() {
  Serial.begin(115200);

  // Inicializar LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Inicializar HX711
  balanza.begin(HX711_DOUT, HX711_SCK);
  balanza.set_scale(2280.f); // Ajusta según calibración
  balanza.tare();

  // Inicializar SHT41
  if (!sht4.begin()) {
    Serial.println("No se encontró el SHT4x");
    while (1) delay(1);
  }

  // Inicializar BLE
  BLEDevice::init(BLE_DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Característica TX (envía datos)
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  // Característica RX (recibe datos)
  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                                           CHARACTERISTIC_RX,
                                           BLECharacteristic::PROPERTY_WRITE
                                         );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();

  // Iniciar advertising (modo visible)
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();

  Serial.println("Esperando conexión BLE...");
}

// -------- LOOP --------
void loop() {
  leerSensores();
  enviarDatosBLE();
  delay(2000); // Enviar datos cada 2 segundos
}
