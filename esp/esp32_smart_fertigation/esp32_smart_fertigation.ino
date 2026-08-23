/*
  =================================================================================
  SMART FERTIGATION AIoT - ESP32 FIRMWARE
  =================================================================================
  Features:
  - Connects to Wi-Fi using WiFiManager
  - Sends Heartbeat & Sensor Telemetry to Backend (/api/device/telemetry & /api/device/heartbeat)
  - Claims & Executes Manual Valve Commands from WhatsApp Chatbot (/api/device/commands/claim)
  - Controls Relay 1 (Valve 1 / Zona A) on GPIO 25 & Relay 2 (Valve 2 / Zona B) on GPIO 26
  =================================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <Ticker.h>

// Server API Configuration
const char* api_host = "http://192.168.1.5:3001"; // Ganti dengan IP Server Hono API Anda
const char* device_code = "ESP-FERTIGASI-01";

// Pin Configurations
#define VALVE1_PIN 25  // Valve 1 (Zona A) - GPIO 25
#define VALVE2_PIN 26  // Valve 2 (Zona B) - GPIO 26
#define ONBOARD_LED 2  // LED Status - GPIO 2

#define RELAY_ON  LOW
#define RELAY_OFF HIGH

Ticker ledTicker;
unsigned long lastHeartbeat = 0;
unsigned long lastTelemetry = 0;
unsigned long lastCommandCheck = 0;

void tickLED() {
  digitalWrite(ONBOARD_LED, !digitalRead(ONBOARD_LED));
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[ESP32] Smart Fertigation AIoT Firmware Starting...");

  pinMode(VALVE1_PIN, OUTPUT);
  pinMode(VALVE2_PIN, OUTPUT);
  pinMode(ONBOARD_LED, OUTPUT);

  digitalWrite(VALVE1_PIN, RELAY_OFF);
  digitalWrite(VALVE2_PIN, RELAY_OFF);
  digitalWrite(ONBOARD_LED, LOW);

  WiFiManager wm;
  ledTicker.attach(0.3, tickLED);
  Serial.println("[Wi-Fi] Connecting to Wi-Fi via WiFiManager...");

  if (!wm.autoConnect("SmartFertigation-AP")) {
    Serial.println("[Wi-Fi] Connection failed. Restarting...");
    delay(3000);
    ESP.restart();
  }

  ledTicker.detach();
  digitalWrite(ONBOARD_LED, HIGH);
  Serial.print("[Wi-Fi] Connected! IP: ");
  Serial.println(WiFi.localIP());
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(api_host) + "/api/device/heartbeat";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["device_code"] = device_code;
  doc["mode"] = "AUTO";
  doc["ip_address"] = WiFi.localIP().toString();
  doc["firmware_version"] = "v2.0.0-Baileys";

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.printf("[Heartbeat] Sent OK (%d)\n", httpCode);
  } else {
    Serial.printf("[Heartbeat] Failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(api_host) + "/api/device/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Telemetry sensor readings (matching Chatbot Infographic)
  StaticJsonDocument<256> doc;
  doc["device_code"] = device_code;
  doc["suhu"] = 29.4;
  doc["kelembaban"] = 76.0;
  doc["media"] = 63.0;
  doc["level_air"] = 72.0;
  doc["ec"] = 1.8;
  doc["ph"] = 6.2;
  doc["status"] = "Normal";

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.printf("[Telemetry] Sent Sensor Data OK (%d)\n", httpCode);
  }
  http.end();
}

void checkDeviceCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(api_host) + "/api/device/commands/claim";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["device_code"] = device_code;
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<512> resDoc;
    deserializeJson(resDoc, response);

    if (resDoc["success"] == true && !resDoc["command"].isNull()) {
      int cmdId = resDoc["command"]["id"];
      int gpio = resDoc["command"]["gpio"];
      int durationSec = resDoc["command"]["duration_seconds"];
      const char* type = resDoc["command"]["type"];
      const char* valveName = resDoc["command"]["valve_name"];

      Serial.printf("[Command] Executing %s on %s (GPIO %d) for %d seconds\n", type, valveName, gpio, durationSec);

      int targetPin = (gpio == 26) ? VALVE2_PIN : VALVE1_PIN;
      if (strcmp(type, "OPEN") == 0) {
        digitalWrite(targetPin, RELAY_ON);
        delay(durationSec * 1000);
        digitalWrite(targetPin, RELAY_OFF);
      } else {
        digitalWrite(targetPin, RELAY_OFF);
      }

      // Mark command as completed
      HTTPClient completeHttp;
      String completeUrl = String(api_host) + "/api/device/commands/" + String(cmdId) + "/complete";
      completeHttp.begin(completeUrl);
      completeHttp.addHeader("Content-Type", "application/json");
      StaticJsonDocument<128> compDoc;
      compDoc["device_code"] = device_code;
      compDoc["success"] = true;
      compDoc["message"] = "Executed successfully by ESP32";
      String compPayload;
      serializeJson(compDoc, compPayload);
      completeHttp.POST(compPayload);
      completeHttp.end();
    }
  }
  http.end();
}

void loop() {
  unsigned long now = millis();

  // Send Heartbeat every 15 seconds
  if (now - lastHeartbeat >= 15000 || lastHeartbeat == 0) {
    lastHeartbeat = now;
    sendHeartbeat();
  }

  // Send Sensor Telemetry every 30 seconds
  if (now - lastTelemetry >= 30000 || lastTelemetry == 0) {
    lastTelemetry = now;
    sendTelemetry();
  }

  // Check for Manual Valve Commands from WhatsApp every 3 seconds
  if (now - lastCommandCheck >= 3000 || lastCommandCheck == 0) {
    lastCommandCheck = now;
    checkDeviceCommands();
  }
}
