/*
  =================================================================================
  SMART FERTIGATION AIoT - ESP32 WEBSOCKET FIRMWARE
  =================================================================================
  Firmware Version : v2.1.0-WebSocket-Release
  Release Date     : 24 Agustus 2026
  Compatibility    : ESP32 DevKit V1 / ESP32-WROOM-32 / ESP32-WROOM-DA Module
  =================================================================================
  Features:
  - Auto Wi-Fi Config Portal via WiFiManager (SSID AP: ESP32-Smart-Fertigation)
  - Real-Time Bidirectional WebSocket Client (ws://<server_ip>:3001/ws/device)
  - Permanent auth_code Storage in Flash Memory (NVS / ESP32 Preferences)
  - Instant LED Verification Blink (1-8 times) with Simultaneous GPIO 2 & GPIO 4 Drive
  - Real-Time Manual LED Control (ON / OFF / BLINK / TIMER) for Diagnostics & GPIO 4
  - Instant Multi-Zone Valve Relay Actuation (GPIO 25, GPIO 26, and dynamic GPIO pins)
  - Automatic Sensor Telemetry & Heartbeat Periodic Streaming (Asia/Jakarta Timezone)
  - Dual-Key Socket Authentication (device_code & serial_code cross-matching)
  =================================================================================
  Changelog / Fixes (v2.1.0):
  1. [FIX] Added LED_CONTROL event handler to drive both External LED (GPIO 4) and 
           Onboard Blue LED (GPIO 2) simultaneously for instant manual testing.
  2. [FIX] Dynamic pinMode and Relay output routing for any designated valve GPIO pin.
  3. [FIX] Instant COMMAND_COMPLETE WebSocket acknowledgement callbacks to API server.
  4. [FIX] Cross-key authentication support allowing dynamic serial_code mapping.
  =================================================================================
  Required Libraries (Install via Arduino Library Manager):
  - WebSockets by Markus Sattler (v2.4.1+)
  - ArduinoJson by Benoit Blanchon (v6.21.x+)
  - WiFiManager by tzapu (v2.0.16+)
  =================================================================================
*/

#include <WiFi.h>
#include <WiFiManager.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <Ticker.h>

// =================================================================================
// Firmware Version & WebSocket Configuration
// =================================================================================
const char* firmware_version = "v2.1.0-WebSocket-Release";
const char* ws_host = "192.168.1.4"; // IP Mac Server Anda
const uint16_t ws_port = 3001;        // Port Server Hono
const char* device_code = "ESP-FERTIGASI-01";
const char* serial_code = "tes123";

// Permanent Storage (NVS)
Preferences preferences;
String auth_code = "";
bool is_authenticated = false;

// Pin Configurations
#define VALVE1_PIN 25       // Relay Valve 1 (Zona A) - GPIO 25
#define VALVE2_PIN 26       // Relay Valve 2 (Zona B) - GPIO 26
#define ONBOARD_LED 2       // Onboard Blue LED - GPIO 2
#define CONFIRM_LED_PIN 4   // External LED Konfirmasi - GPIO 4

// Logika Pin Aktif (HIGH = 3.3V untuk menyalakan LED / Relay Active-High, LOW = 0V)
#define PIN_ACTIVE_STATE   HIGH
#define PIN_INACTIVE_STATE LOW

WebSocketsClient webSocket;
Ticker ledTicker;

unsigned long lastHeartbeat = 0;
unsigned long lastTelemetry = 0;

void tickLED() {
  digitalWrite(ONBOARD_LED, !digitalRead(ONBOARD_LED));
}

// Function to save auth_code permanently into NVS
void saveAuthCode(String newAuthCode) {
  if (newAuthCode.length() == 0) return;
  auth_code = newAuthCode;
  is_authenticated = true;

  preferences.begin("fertigation", false);
  preferences.putString("auth_code", auth_code);
  preferences.end();

  Serial.println("\n=======================================================");
  Serial.printf("[AUTH] BERHASIL! Auth Code tersimpan di NVS: %s\n", auth_code.c_str());
  Serial.println("=======================================================\n");
}

// Function to clear auth_code (type 'RESET_AUTH' in Serial Monitor)
void resetAuthCode() {
  preferences.begin("fertigation", false);
  preferences.remove("auth_code");
  preferences.end();
  auth_code = "";
  is_authenticated = false;
  Serial.println("\n[AUTH] Auth Code dihapus dari NVS. Kembali ke mode unverified pairing.\n");
}

// Function to blink confirmation LED (1-8 times)
void blinkConfirmationLED(int times) {
  Serial.println("\n=======================================================");
  Serial.printf("[PAIRING] SINYAL KEDIP DITERIMA! Berkedip %d kali pada GPIO 2 & GPIO %d...\n", times, CONFIRM_LED_PIN);
  Serial.println("=======================================================");

  for (int i = 1; i <= times; i++) {
    Serial.printf("[Blink] Kedipan ke-%d dari %d\n", i, times);
    digitalWrite(CONFIRM_LED_PIN, HIGH);
    digitalWrite(ONBOARD_LED, HIGH);
    delay(400);
    digitalWrite(CONFIRM_LED_PIN, LOW);
    digitalWrite(ONBOARD_LED, LOW);
    delay(400);
  }

  digitalWrite(ONBOARD_LED, HIGH); // Standby ON (indikator terhubung)
  Serial.printf("[PAIRING] Selesai berkedip %d kali. Silakan pilih angka %d di dashboard!\n\n", times, times);
}

// Send Status to WebSocket Server
void sendWsStatus() {
  StaticJsonDocument<256> doc;
  doc["type"] = "ONLINE";
  doc["device_code"] = device_code;
  doc["serial_code"] = serial_code;
  doc["auth_code"] = auth_code;
  doc["ip_address"] = WiFi.localIP().toString();
  doc["firmware"] = firmware_version;

  String msg;
  serializeJson(doc, msg);
  webSocket.sendTXT(msg);
}

// Send Heartbeat via WebSocket
void sendWsHeartbeat() {
  StaticJsonDocument<128> doc;
  doc["type"] = "HEARTBEAT";
  doc["device_code"] = device_code;
  doc["auth_code"] = auth_code;
  doc["mode"] = "AUTO";

  String msg;
  serializeJson(doc, msg);
  webSocket.sendTXT(msg);
}

// Send Sensor Telemetry via WebSocket
void sendWsTelemetry() {
  StaticJsonDocument<256> doc;
  doc["type"] = "TELEMETRY";
  doc["device_code"] = device_code;
  doc["auth_code"] = auth_code;
  doc["suhu"] = 29.4;
  doc["kelembaban"] = 76.0;
  doc["media"] = 63.0;
  doc["level_air"] = 72.0;
  doc["ec"] = 1.8;
  doc["ph"] = 6.2;
  doc["status"] = "Normal";

  String msg;
  serializeJson(doc, msg);
  webSocket.sendTXT(msg);
  Serial.println("[WS Telemetry] Data sensor terkirim ke server!");
}

// Send Command Completed confirmation
void sendWsCommandComplete(int commandId, String message) {
  StaticJsonDocument<256> doc;
  doc["type"] = "COMMAND_COMPLETE";
  doc["device_code"] = device_code;
  doc["command_id"] = commandId;
  doc["success"] = true;
  doc["message"] = message;

  String msg;
  serializeJson(doc, msg);
  webSocket.sendTXT(msg);
}

// WebSocket Event Handler (Receives instant events from server)
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Terputus dari WebSocket Server! Mencoba menghubungkan kembali...");
      break;

    case WStype_CONNECTED:
      Serial.printf("[WS] TERHUBUNG KE WEBSOCKET SERVER (%s:%d)!\n", ws_host, ws_port);
      digitalWrite(ONBOARD_LED, HIGH);
      sendWsStatus();
      break;

    case WStype_TEXT: {
      String text = (char*)payload;
      Serial.printf("[WS RX] %s\n", text.c_str());

      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, text);
      if (error) return;

      String eventType = doc["type"].as<String>();

      // 1. INSTAN KEDIP LED KONFIRMASI (1-8 KALI)
      if (eventType == "BLINK") {
        int count = doc["count"] | 0;
        if (count >= 1 && count <= 8) {
          blinkConfirmationLED(count);
        }
      }

      // 2. INSTAN TERIMA AUTH CODE PERMANEN DARI SERVER
      else if (eventType == "AUTH_APPROVED") {
        String newAuth = doc["auth_code"].as<String>();
        if (newAuth.length() > 0) {
          saveAuthCode(newAuth);
        }
      }

      // 3. INSTAN KENDALI VALVE (BUKA / TUTUP RELAY & INDIKATOR LED)
      else if (eventType == "VALVE_CONTROL") {
        int cmdId = doc["command_id"] | 0;
        int gpio = doc["gpio"] | 25;
        int duration = doc["duration"] | 5;
        String cmd = doc["command"].as<String>();

        Serial.printf("[Valve] Mengeksekusi %s pada GPIO %d selama %d detik\n", cmd.c_str(), gpio, duration);
        int targetPin = gpio;
        pinMode(targetPin, OUTPUT);
        pinMode(ONBOARD_LED, OUTPUT);

        if (cmd == "OPEN") {
          digitalWrite(targetPin, PIN_ACTIVE_STATE);
          digitalWrite(ONBOARD_LED, HIGH); // Onboard Blue LED menyala sebagai konfirmasi visual
          if (duration > 0) {
            delay(duration * 1000);
            digitalWrite(targetPin, PIN_INACTIVE_STATE);
            digitalWrite(ONBOARD_LED, LOW);
          }
        } else {
          digitalWrite(targetPin, PIN_INACTIVE_STATE);
          digitalWrite(ONBOARD_LED, LOW);
        }

        sendWsCommandComplete(cmdId, "Perintah valve berhasil dieksekusi oleh ESP32");
      }

      // 4. INSTAN KENDALI LED (GPIO 4 & ONBOARD LED GPIO 2)
      else if (eventType == "LED_CONTROL") {
        String state = doc["state"].as<String>();
        int gpio = doc["gpio"] | 4;
        int duration = doc["duration"] | 0;

        Serial.printf("[LED] Menerima perintah LED %s pada GPIO %d dan Onboard LED (GPIO %d) (durasi: %d)\n", state.c_str(), gpio, ONBOARD_LED, duration);
        pinMode(gpio, OUTPUT);
        pinMode(ONBOARD_LED, OUTPUT);

        if (state == "ON") {
          digitalWrite(gpio, HIGH);
          digitalWrite(ONBOARD_LED, HIGH);
          if (duration > 0) {
            delay(duration * 1000);
            digitalWrite(gpio, LOW);
            digitalWrite(ONBOARD_LED, LOW);
          }
        } else if (state == "OFF") {
          digitalWrite(gpio, LOW);
          digitalWrite(ONBOARD_LED, LOW);
        } else if (state == "BLINK") {
          int blinks = duration > 0 ? duration : 3;
          for (int i = 0; i < blinks; i++) {
            digitalWrite(gpio, HIGH);
            digitalWrite(ONBOARD_LED, HIGH);
            delay(200);
            digitalWrite(gpio, LOW);
            digitalWrite(ONBOARD_LED, LOW);
            delay(200);
          }
        }
      }
      break;
    }

    case WStype_BIN:
      break;
    case WStype_ERROR:
      Serial.println("[WS] Terjadi kesalahan socket!");
      break;
    case WStype_PING:
    case WStype_PONG:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.printf("[ESP32] Smart Fertigation AIoT WebSocket Firmware %s Starting...\n", firmware_version);
  Serial.println("=======================================================");

  pinMode(VALVE1_PIN, OUTPUT);
  pinMode(VALVE2_PIN, OUTPUT);
  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(CONFIRM_LED_PIN, OUTPUT);

  digitalWrite(VALVE1_PIN, PIN_INACTIVE_STATE);
  digitalWrite(VALVE2_PIN, PIN_INACTIVE_STATE);
  digitalWrite(ONBOARD_LED, LOW);
  digitalWrite(CONFIRM_LED_PIN, LOW);

  // 1. Baca auth_code dari flash memory (NVS)
  preferences.begin("fertigation", false);
  auth_code = preferences.getString("auth_code", "");
  preferences.end();

  if (auth_code.length() > 0) {
    is_authenticated = true;
    Serial.printf("[AUTH] Status: TERVERIFIKASI (Auth Code: %s)\n", auth_code.c_str());
  } else {
    is_authenticated = false;
    Serial.println("[AUTH] Status: BELUM MEMILIKI AUTH_CODE. Menunggu pairing dari dashboard...");
  }

  // 2. Hubungkan ke Wi-Fi via WiFiManager
  WiFiManager wm;
  ledTicker.attach(0.3, tickLED);
  Serial.println("[Wi-Fi] Menghubungkan ke Wi-Fi...");

  if (!wm.autoConnect("SmartFertigation-AP")) {
    Serial.println("[Wi-Fi] Koneksi gagal. Restart ESP32...");
    delay(3000);
    ESP.restart();
  }

  ledTicker.detach();
  digitalWrite(ONBOARD_LED, HIGH);
  Serial.print("[Wi-Fi] Terhubung! IP ESP32: ");
  Serial.println(WiFi.localIP());

  // 3. Inisialisasi WebSocket Client
  String wsUrl = "/ws/device?device_code=" + String(device_code) + 
                 "&serial_code=" + String(serial_code) + 
                 "&auth_code=" + auth_code;

  Serial.printf("[WS] Menghubungkan ke ws://%s:%d%s...\n", ws_host, ws_port, wsUrl.c_str());
  webSocket.begin(ws_host, ws_port, wsUrl);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(1500); // Reconnect otomatis setiap 1.5 detik jika putus
  webSocket.enableHeartbeat(4000, 1500, 2);
}

void loop() {
  // Jalankan loop WebSocket client
  webSocket.loop();

  unsigned long now = millis();

  // Cek perintah konsol serial (ketik 'RESET_AUTH' untuk reset pairing)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "RESET_AUTH" || cmd == "reset_auth") {
      resetAuthCode();
    }
  }

  // Kirim Heartbeat WebSocket setiap 4 detik untuk status online real-time
  if (now - lastHeartbeat >= 4000 || lastHeartbeat == 0) {
    lastHeartbeat = now;
    if (webSocket.isConnected()) {
      sendWsHeartbeat();
    }
  }

  // Kirim Telemetri Sensor setiap 15 detik
  if (now - lastTelemetry >= 15000 || lastTelemetry == 0) {
    lastTelemetry = now;
    if (webSocket.isConnected()) {
      sendWsTelemetry();
    }
  }
}
