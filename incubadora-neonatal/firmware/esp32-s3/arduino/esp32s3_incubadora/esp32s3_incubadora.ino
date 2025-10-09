#include <WiFi.h>

void setup() {
  balanza.begin(DOUT, CLK);
  balanza.set_scale();
  balanza.tare();

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("No OLED");
  } else {
    display.clearDisplay();
    display.display();
  }
}

void loop() {
  float temp = -1000, hum = -1;

  #if USE_SHT4X
    sensors_event_t h, t;
    if (sht4.getEvent(&h, &t)) {
      temp = t.temperature;
      hum  = h.relative_humidity;
    }
  #else
    temp = sht31.readTemperature();
    hum  = sht31.readHumidity();
  #endif

  float luz   = ltr.readALS();
  int   ntcRaw = analogRead(NTC_PIN);
  float ntcC   = ntcCelsiusFromRaw(ntcRaw);
  float peso   = balanza.get_units(10);

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.printf(
    "%s\n"
    "T:%.2fC H:%.1f%%\n"
    "L:%.0f\n"
    "NTC:%.2fC\n"
    "P:%.2fg\n",
    DEVICE_ID, temp, hum, luz, ntcC, peso
  );
  display.display();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", API_KEY);

    unsigned long ms = millis();

    String payload = "{";
    payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
    payload += "\"ts_ms\":" + String(ms) + ",";
    payload += "\"temperatura\":" + String(temp, 2) + ",";
    payload += "\"humedad\":" + String(hum, 1) + ",";
    payload += "\"luz\":" + String(luz, 0) + ",";
    payload += "\"ntc_c\":" + String(ntcC, 2) + ",";
    payload += "\"ntc_raw\":" + String(ntcRaw) + ",";
    payload += "\"peso_g\":" + String(peso, 2) + "}";
    int code = http.POST(payload);

    Serial.printf("POST %d\n", code);
    http.end();
  }

  delay(5000);
}
