/*
  =================================================================================
  SMART FERTIGATION AIoT - ESP32 WEBSOCKET & BLE HYBRID FIRMWARE
  =================================================================================
  Firmware Version : v2.4.0-BLE-WebSocket-Hybrid
  Release Date     : 26 Agustus 2026
  Compatibility    : ESP32 DevKit V1 / ESP32-WROOM-32 / ESP32-WROOM-DA Module
  =================================================================================
  Features:
  - Web Bluetooth Low Energy (BLE) GATT Server for Wireless Dashboard & Config
  - Wi-Fi Network Scanning, Pairing, Connection & Reset over BLE
  - Real-Time Bidirectional WebSocket Client (Secure WSS & Standard WS Support)
  - Default API Host: https://api.tirtaruna.site (WSS port 443)
  - Dynamic API URL (Host & Port) Configurable via BLE & Saved in NVS
  - Auto Wi-Fi Config Portal via WiFiManager fallback (SSID AP: ESP32-Smart-Fertigation)
  - Permanent auth_code Storage in Flash Memory (NVS / ESP32 Preferences)
  - Instant LED Verification Blink (1-8 times) with Simultaneous GPIO 2 & GPIO 4 Drive
  - Real-Time Manual LED & Valve Relay Actuation (Active-Low Non-Blocking Timers)
  - Automatic Sensor Telemetry & Heartbeat Streaming
  - Dual-Key Socket Authentication (device_code & serial_code cross-matching)
  =================================================================================
  Required Libraries (Install via Arduino Library Manager / ESP32 Core):
  - ESP32 BLE Libraries (Built-in to ESP32 Arduino Core: BLEDevice, BLEServer, BLEUtils, BLE2902)
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

// ESP32 BLE Core Libraries
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// =================================================================================
// Firmware Version & WebSocket Configuration
// =================================================================================
const char* firmware_version = "v2.4.0-BLE-WebSocket-Hybrid";

// Default API URL (bisa diubah via BLE dan disimpan permanen di NVS)
#define DEFAULT_WS_HOST "api.tirtaruna.site"
#define DEFAULT_WS_PORT 443

String ws_host_str = DEFAULT_WS_HOST;
uint16_t ws_port = DEFAULT_WS_PORT;

const char* device_code = "ESP-FERTIGASI-01";
const char* serial_code = "tes123";

// BLE GATT UUIDs
#define BLE_DEVICE_NAME        "ESP32-Fertigation"
#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID_RX "beb5483e-36e1-4688-b7f5-ea07361b26a8" // Web -> ESP32 (Write)
#define CHARACTERISTIC_UUID_TX "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e" // ESP32 -> Web (Notify)

// Permanent Storage (NVS)
Preferences preferences;
String auth_code = "";
bool is_authenticated = false;

// Pin Configurations
#define VALVE1_PIN 25       // Relay Valve 1 (Zona A) - GPIO 25
#define VALVE2_PIN 26       // Relay Valve 2 (Zona B) - GPIO 26
#define ONBOARD_LED 2       // Onboard Blue LED - GPIO 2
#define CONFIRM_LED_PIN 4   // External LED Konfirmasi - GPIO 4

// Logika Relay Valve (Modul Relay Active-Low: LOW = Valve Terbuka / ON, HIGH = Valve Tertutup / OFF)
#define RELAY_OPEN_STATE   LOW   // Sinyal LOW (0V) untuk mengaktifkan relay / membuka valve
#define RELAY_CLOSE_STATE  HIGH  // Sinyal HIGH (3.3V) untuk mematikan relay / menutup valve

// Logika LED (Active-High: HIGH = Menyala, LOW = Mati)
#define LED_ON_STATE       HIGH
#define LED_OFF_STATE      LOW

WebSocketsClient webSocket;
Ticker ledTicker;

// BLE Server & Characteristic Pointers
BLEServer *pBleServer = NULL;
BLECharacteristic *pBleTxChar = NULL;
BLECharacteristic *pBleRxChar = NULL;
bool bleDeviceConnected = false;
bool oldBleDeviceConnected = false;

unsigned long lastHeartbeat = 0;
unsigned long lastTelemetry = 0;
unsigned long lastBleStatusUpdate = 0;

// Valve States & Auto-Close Timers
bool valve1State = false;
bool valve2State = false;
unsigned long valve1TimerEnd = 0;
unsigned long valve2TimerEnd = 0;

// Sensor Dummy / Telemetry Data
float sensorSuhu = 29.4;
float sensorKelembaban = 76.0;
float sensorMedia = 63.0;
float sensorLevelAir = 72.0;
float sensorEC = 1.8;
float sensorPH = 6.2;

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

// Function to clear auth_code
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
  Serial.printf("[PAIRING] Selesai berkedip %d kali.\n\n", times);
}

// =================================================================================
// BLE Notification & Messaging Helpers
// =================================================================================
void sendBleNotify(String message) {
  if (bleDeviceConnected && pBleTxChar != NULL) {
    // Append newline delimiter for easy client buffer parsing
    String packet = message + "\n";
    pBleTxChar->setValue((uint8_t*)packet.c_str(), packet.length());
    pBleTxChar->notify();
    Serial.printf("[BLE TX] %s\n", message.c_str());
  }
}

// Helper to sanitize host string (strip https://, http://, wss://, ws://, trailing slash)
String sanitizeHostString(String host) {
  String clean = host;
  clean.trim();
  clean.replace("https://", "");
  clean.replace("http://", "");
  clean.replace("wss://", "");
  clean.replace("ws://", "");
  while (clean.endsWith("/")) {
    clean.remove(clean.length() - 1);
  }
  return clean;
}

// Connect WebSocket with current API URL (supports both WS and Secure WSS/SSL)
void connectWebSocketServer() {
  if (WiFi.status() == WL_CONNECTED && ws_host_str.length() > 0) {
    webSocket.disconnect();

    String cleanHost = sanitizeHostString(ws_host_str);
    String wsUrl = "/ws/device?device_code=" + String(device_code) + 
                   "&serial_code=" + String(serial_code) + 
                   "&auth_code=" + auth_code;

    // Check if SSL should be used (port 443, https domain, or non-IP domain)
    bool isSSL = (ws_port == 443 || cleanHost.indexOf(".site") != -1 || cleanHost.indexOf(".com") != -1 || cleanHost.indexOf(".org") != -1 || cleanHost.indexOf(".id") != -1);
    if (ws_port == 3001 || ws_port == 80) {
      isSSL = false;
    }

    if (isSSL) {
      Serial.printf("[WS] Menghubungkan secara SECURE (WSS/SSL) ke wss://%s:%d%s...\n", cleanHost.c_str(), ws_port, wsUrl.c_str());
      webSocket.beginSSL(cleanHost.c_str(), ws_port, wsUrl.c_str());
    } else {
      Serial.printf("[WS] Menghubungkan ke ws://%s:%d%s...\n", cleanHost.c_str(), ws_port, wsUrl.c_str());
      webSocket.begin(cleanHost.c_str(), ws_port, wsUrl.c_str());
    }

    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(2000);
    webSocket.enableHeartbeat(4000, 1500, 2);
  }
}

// Save API URL (host + port) permanently into NVS
void saveApiUrl(String host, uint16_t port) {
  String cleanHost = sanitizeHostString(host);
  ws_host_str = cleanHost;
  
  if (port > 0) {
    ws_port = port;
  } else {
    // Auto-detect default port: 443 for domains, 3001 for local IPs
    ws_port = (cleanHost.indexOf(".") != -1 && cleanHost.indexOf("192.168.") == -1 && cleanHost.indexOf("10.") == -1 && cleanHost.indexOf("172.") == -1) ? 443 : DEFAULT_WS_PORT;
  }

  preferences.begin("fertigation", false);
  preferences.putString("ws_host", ws_host_str);
  preferences.putUShort("ws_port", ws_port);
  preferences.end();

  Serial.printf("[API] URL API tersimpan di NVS: %s:%d\n", ws_host_str.c_str(), ws_port);
}

// Reset API URL to defaults
void resetApiUrl() {
  preferences.begin("fertigation", false);
  preferences.remove("ws_host");
  preferences.remove("ws_port");
  preferences.end();

  ws_host_str = DEFAULT_WS_HOST;
  ws_port = DEFAULT_WS_PORT;
  Serial.printf("[API] URL API dikembalikan ke default: %s:%d\n", ws_host_str.c_str(), ws_port);
}

// Reconnect WebSocket with current API URL
void reconnectWebSocket() {
  connectWebSocketServer();
}

// Send comprehensive Device & WiFi Status over BLE
void sendBleStatus() {
  StaticJsonDocument<1024> doc;
  doc["type"] = "STATUS";
  doc["device_code"] = device_code;
  doc["serial_code"] = serial_code;
  doc["firmware"] = firmware_version;
  doc["auth_code"] = auth_code;
  doc["is_authenticated"] = is_authenticated;

  // API URL info
  doc["api_host"] = ws_host_str;
  doc["api_port"] = ws_port;

  // Wi-Fi Details
  if (WiFi.status() == WL_CONNECTED) {
    doc["wifi_status"] = "CONNECTED";
    doc["ssid"] = WiFi.SSID();
    doc["ip"] = WiFi.localIP().toString();
    doc["gateway"] = WiFi.gatewayIP().toString();
    doc["mac"] = WiFi.macAddress();
    doc["rssi"] = WiFi.RSSI();
  } else if (WiFi.getMode() == WIFI_AP || WiFi.getMode() == WIFI_AP_STA) {
    doc["wifi_status"] = "AP_MODE";
    doc["ssid"] = "SmartFertigation-AP";
    doc["ip"] = WiFi.softAPIP().toString();
    doc["gateway"] = "-";
    doc["mac"] = WiFi.softAPmacAddress();
    doc["rssi"] = 0;
  } else {
    doc["wifi_status"] = "DISCONNECTED";
    doc["ssid"] = "-";
    doc["ip"] = "0.0.0.0";
    doc["gateway"] = "-";
    doc["mac"] = WiFi.macAddress();
    doc["rssi"] = 0;
  }

  doc["ws_status"] = webSocket.isConnected() ? "CONNECTED" : "DISCONNECTED";
  doc["uptime_sec"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();

  JsonObject valves = doc.createNestedObject("valves");
  valves["valve1"] = valve1State;
  valves["valve2"] = valve2State;

  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["suhu"] = sensorSuhu;
  sensors["kelembaban"] = sensorKelembaban;
  sensors["media"] = sensorMedia;
  sensors["level_air"] = sensorLevelAir;
  sensors["ec"] = sensorEC;
  sensors["ph"] = sensorPH;

  String output;
  serializeJson(doc, output);
  sendBleNotify(output);
}

// Perform Wi-Fi Scan and send results over BLE
void performBleWifiScan() {
  Serial.println("[BLE SCAN] Memulai pemindaian Wi-Fi sekitar...");

  // Pastikan Wi-Fi dalam mode Station & hentikan proses koneksi aktif di background
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(150);

  int n = WiFi.scanNetworks(false, false);
  Serial.printf("[BLE SCAN] Ditemukan %d jaringan Wi-Fi.\n", n);

  // Jika scan awal gagal (-2), coba sekali lagi setelah delay singkat
  if (n < 0) {
    delay(200);
    n = WiFi.scanNetworks(false, false);
    Serial.printf("[BLE SCAN RETRY] Ditemukan %d jaringan Wi-Fi.\n", n);
  }

  StaticJsonDocument<1024> doc;
  doc["type"] = "WIFI_SCAN_RESULT";
  doc["count"] = (n >= 0) ? n : 0;
  JsonArray networks = doc.createNestedArray("networks");

  if (n > 0) {
    for (int i = 0; i < n && i < 15; ++i) {
      JsonObject net = networks.createNestedObject();
      net["ssid"] = WiFi.SSID(i);
      net["rssi"] = WiFi.RSSI(i);
      net["secure"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
    }
  }

  String output;
  serializeJson(doc, output);
  sendBleNotify(output);

  if (n > 0) {
    // Clean up scan memory
    WiFi.scanDelete();
  }
}

// Connect to Wi-Fi via BLE Command
void connectWifiViaBle(String ssid, String pass) {
  Serial.printf("[BLE Wi-Fi] Mencoba menyambungkan ke SSID: %s\n", ssid.c_str());

  // Notify Web client that connection is in progress
  StaticJsonDocument<256> progressDoc;
  progressDoc["type"] = "WIFI_CONNECTING";
  progressDoc["ssid"] = ssid;
  progressDoc["message"] = "Menghubungkan ke Wi-Fi...";
  String progressMsg;
  serializeJson(progressDoc, progressMsg);
  sendBleNotify(progressMsg);

  WiFi.disconnect();
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  StaticJsonDocument<384> resDoc;
  resDoc["type"] = "WIFI_CONNECT_RESULT";

  if (WiFi.status() == WL_CONNECTED) {
    resDoc["success"] = true;
    resDoc["ssid"] = WiFi.SSID();
    resDoc["ip"] = WiFi.localIP().toString();
    resDoc["message"] = "Berhasil terhubung ke Wi-Fi!";
    Serial.printf("[BLE Wi-Fi] Berhasil terhubung! IP: %s\n", WiFi.localIP().toString().c_str());

    // Connect / Reconnect WebSocket
    connectWebSocketServer();
  } else {
    resDoc["success"] = false;
    resDoc["ssid"] = ssid;
    resDoc["message"] = "Gagal terhubung ke Wi-Fi. Periksa kata sandi atau sinyal.";
    Serial.println("[BLE Wi-Fi] Gagal terhubung ke Wi-Fi.");
  }

  String resMsg;
  serializeJson(resDoc, resMsg);
  sendBleNotify(resMsg);

  // Send refreshed status
  delay(200);
  sendBleStatus();
}

// Disconnect Wi-Fi via BLE Command
void disconnectWifiViaBle() {
  Serial.println("[BLE Wi-Fi] Memutuskan koneksi Wi-Fi...");
  WiFi.disconnect();
  webSocket.disconnect();

  StaticJsonDocument<256> doc;
  doc["type"] = "WIFI_DISCONNECT_RESULT";
  doc["success"] = true;
  doc["message"] = "Wi-Fi berhasil diputuskan.";

  String output;
  serializeJson(doc, output);
  sendBleNotify(output);

  delay(200);
  sendBleStatus();
}

// Reset Wi-Fi Credentials from NVS
void resetWifiCredentialsViaBle() {
  Serial.println("[BLE Wi-Fi] Menghapus kredensial Wi-Fi tersimpan...");
  WiFiManager wm;
  wm.resetSettings();
  WiFi.disconnect(true, true);
  webSocket.disconnect();

  StaticJsonDocument<256> doc;
  doc["type"] = "WIFI_RESET_RESULT";
  doc["success"] = true;
  doc["message"] = "Kredensial Wi-Fi berhasil dihapus dari flash ESP32.";

  String output;
  serializeJson(doc, output);
  sendBleNotify(output);

  delay(200);
  sendBleStatus();
}

// =================================================================================
// BLE Callbacks
// =================================================================================
class MyBleServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      bleDeviceConnected = true;
      Serial.println("\n[BLE] >>> Client Web Bluetooth TERHUBUNG! <<<");
    };

    void onDisconnect(BLEServer* pServer) {
      bleDeviceConnected = false;
      Serial.println("\n[BLE] >>> Client Web Bluetooth TERPUTUS! <<<");
    }
};

class MyBleRxCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      // Compatible with both ESP32 Core v2.x (std::string) and v3.x (String)
      String payload = String(pCharacteristic->getValue().c_str());

      if (payload.length() > 0) {
        Serial.printf("\n[BLE RX] Payload diterima: %s\n", payload.c_str());

        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
          Serial.printf("[BLE RX ERROR] JSON parse error: %s\n", error.c_str());
          return;
        }

        String cmd = doc["cmd"].as<String>();

        // 1. GET_STATUS: Kirimkan status lengkap perangkat
        if (cmd == "GET_STATUS") {
          sendBleStatus();
        }
        // 2. SCAN_WIFI: Pindai jaringan Wi-Fi sekitar
        else if (cmd == "SCAN_WIFI") {
          performBleWifiScan();
        }
        // 3. CONNECT_WIFI: Sambungkan ke SSID baru
        else if (cmd == "CONNECT_WIFI") {
          String ssid = doc["ssid"].as<String>();
          String pass = doc["password"].as<String>();
          connectWifiViaBle(ssid, pass);
        }
        // 4. DISCONNECT_WIFI: Putuskan Wi-Fi
        else if (cmd == "DISCONNECT_WIFI") {
          disconnectWifiViaBle();
        }
        // 5. RESET_WIFI: Hapus data Wi-Fi di NVS
        else if (cmd == "RESET_WIFI") {
          resetWifiCredentialsViaBle();
        }
        // 6. RESET_AUTH: Hapus auth_code NVS
        else if (cmd == "RESET_AUTH") {
          resetAuthCode();
          StaticJsonDocument<256> res;
          res["type"] = "AUTH_RESET_RESULT";
          res["success"] = true;
          res["message"] = "Auth code berhasil direset.";
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
          sendBleStatus();
        }
        // 7. SET_AUTH: Simpan auth_code baru dari BLE
        else if (cmd == "SET_AUTH") {
          String newAuth = doc["auth_code"].as<String>();
          saveAuthCode(newAuth);
          StaticJsonDocument<256> res;
          res["type"] = "AUTH_SET_RESULT";
          res["success"] = true;
          res["auth_code"] = newAuth;
          res["message"] = "Auth code baru berhasil disimpan!";
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
          sendBleStatus();
        }
        // 8. TEST_LED: Kedipkan LED konfirmasi
        else if (cmd == "TEST_LED") {
          int count = doc["times"] | 3;
          blinkConfirmationLED(count);
          StaticJsonDocument<256> res;
          res["type"] = "LED_TEST_RESULT";
          res["success"] = true;
          res["times"] = count;
          res["message"] = "LED test selesai.";
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
        }
        // 9. VALVE_CONTROL: Kendali Relay Valve
        else if (cmd == "VALVE_CONTROL") {
          int gpio = doc["gpio"] | 25;
          String action = doc["action"].as<String>();
          int duration = doc["duration"] | 0;

          pinMode(gpio, OUTPUT);
          if (action == "OPEN" || action == "TEST_OPEN") {
            digitalWrite(gpio, RELAY_OPEN_STATE);
            digitalWrite(ONBOARD_LED, LED_ON_STATE);

            if (gpio == VALVE1_PIN) {
              valve1State = true;
              valve1TimerEnd = (duration > 0) ? (millis() + ((unsigned long)duration * 1000)) : 0;
            } else if (gpio == VALVE2_PIN) {
              valve2State = true;
              valve2TimerEnd = (duration > 0) ? (millis() + ((unsigned long)duration * 1000)) : 0;
            }
          } else {
            digitalWrite(gpio, RELAY_CLOSE_STATE);
            if (gpio == VALVE1_PIN) {
              valve1State = false;
              valve1TimerEnd = 0;
            } else if (gpio == VALVE2_PIN) {
              valve2State = false;
              valve2TimerEnd = 0;
            }
            if (!valve1State && !valve2State) {
              digitalWrite(ONBOARD_LED, LED_OFF_STATE);
            }
          }

          StaticJsonDocument<256> res;
          res["type"] = "VALVE_RESULT";
          res["success"] = true;
          res["gpio"] = gpio;
          res["action"] = action;
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
          sendBleStatus();
        }
        // 10. RESTART: Restart ESP32
        else if (cmd == "RESTART") {
          StaticJsonDocument<256> res;
          res["type"] = "RESTART_RESULT";
          res["success"] = true;
          res["message"] = "ESP32 akan restart dalam 1 detik...";
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
          delay(1000);
          ESP.restart();
        }
        // 11. SET_API: Ubah URL API WebSocket (host + port)
        else if (cmd == "SET_API") {
          String newHost = doc["host"].as<String>();
          int newPort = doc["port"] | DEFAULT_WS_PORT;

          if (newHost.length() > 0) {
            saveApiUrl(newHost, (uint16_t)newPort);
            reconnectWebSocket();

            StaticJsonDocument<256> res;
            res["type"] = "API_SET_RESULT";
            res["success"] = true;
            res["host"] = ws_host_str;
            res["port"] = ws_port;
            res["message"] = "URL API berhasil disimpan!";
            String resStr;
            serializeJson(res, resStr);
            sendBleNotify(resStr);
            sendBleStatus();
          }
        }
        // 12. RESET_API: Kembalikan URL API ke default
        else if (cmd == "RESET_API") {
          resetApiUrl();
          reconnectWebSocket();

          StaticJsonDocument<256> res;
          res["type"] = "API_RESET_RESULT";
          res["success"] = true;
          res["host"] = ws_host_str;
          res["port"] = ws_port;
          res["message"] = "URL API dikembalikan ke default.";
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
          sendBleStatus();
        }
      }
    }
};

// Initialize BLE Server & Advertising
void setupBLE() {
  Serial.println("\n[BLE] Memulai Inisialisasi Bluetooth Low Energy (BLE)...");
  BLEDevice::init(BLE_DEVICE_NAME);
  BLEDevice::setMTU(512); // Mendukung payload MTU besar

  pBleServer = BLEDevice::createServer();
  pBleServer->setCallbacks(new MyBleServerCallbacks());

  BLEService *pService = pBleServer->createService(SERVICE_UUID);

  // TX Characteristic (Notify to Web)
  pBleTxChar = pService->createCharacteristic(
                      CHARACTERISTIC_UUID_TX,
                      BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
                    );
  pBleTxChar->addDescriptor(new BLE2902());

  // RX Characteristic (Write from Web)
  pBleRxChar = pService->createCharacteristic(
                      CHARACTERISTIC_UUID_RX,
                      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
                    );
  pBleRxChar->setCallbacks(new MyBleRxCallbacks());

  pService->start();

  // BLE Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // functions that help with iPhone connections issue
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.printf("[BLE] BLE Server Berhasil Berjalan! Nama: '%s', Service UUID: %s\n\n", BLE_DEVICE_NAME, SERVICE_UUID);
}

// =================================================================================
// WebSocket Communications
// =================================================================================

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

// Helper: get ws_host as const char*
const char* getWsHost() {
  return ws_host_str.c_str();
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
  doc["suhu"] = sensorSuhu;
  doc["kelembaban"] = sensorKelembaban;
  doc["media"] = sensorMedia;
  doc["level_air"] = sensorLevelAir;
  doc["ec"] = sensorEC;
  doc["ph"] = sensorPH;
  doc["status"] = "Normal";

  String msg;
  serializeJson(doc, msg);
  webSocket.sendTXT(msg);
  Serial.println("[WS Telemetry] Data sensor terkirim ke WebSocket server!");
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
      Serial.printf("[WS] TERHUBUNG KE WEBSOCKET SERVER (%s:%d)!\n", ws_host_str.c_str(), ws_port);
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
          if (bleDeviceConnected) sendBleStatus();
        }
      }

      // 3. INSTAN KENDALI VALVE
      else if (eventType == "VALVE_CONTROL") {
        int cmdId = doc["command_id"] | 0;
        int gpio = doc["gpio"] | 25;
        int duration = doc["duration"] | 5;
        String cmd = doc["command"].as<String>();

        Serial.printf("[Valve] Perintah %s pada GPIO %d (durasi: %d detik)\n", cmd.c_str(), gpio, duration);
        int targetPin = gpio;
        pinMode(targetPin, OUTPUT);
        pinMode(ONBOARD_LED, OUTPUT);

        if (cmd == "OPEN" || cmd == "TEST_OPEN") {
          digitalWrite(targetPin, RELAY_OPEN_STATE);
          digitalWrite(ONBOARD_LED, LED_ON_STATE);

          if (gpio == VALVE1_PIN) {
            valve1State = true;
            valve1TimerEnd = (duration > 0) ? (millis() + ((unsigned long)duration * 1000)) : 0;
            Serial.printf("[Valve] Valve 1 (GPIO %d) TERBUKA (Relay LOW, Timer: %ds)\n", gpio, duration);
          } else if (gpio == VALVE2_PIN) {
            valve2State = true;
            valve2TimerEnd = (duration > 0) ? (millis() + ((unsigned long)duration * 1000)) : 0;
            Serial.printf("[Valve] Valve 2 (GPIO %d) TERBUKA (Relay LOW, Timer: %ds)\n", gpio, duration);
          }
        } else {
          // CLOSE
          digitalWrite(targetPin, RELAY_CLOSE_STATE);
          if (gpio == VALVE1_PIN) {
            valve1State = false;
            valve1TimerEnd = 0;
            Serial.printf("[Valve] Valve 1 (GPIO %d) TERTUTUP (Relay HIGH)\n", gpio);
          } else if (gpio == VALVE2_PIN) {
            valve2State = false;
            valve2TimerEnd = 0;
            Serial.printf("[Valve] Valve 2 (GPIO %d) TERTUTUP (Relay HIGH)\n", gpio);
          }
          if (!valve1State && !valve2State) {
            digitalWrite(ONBOARD_LED, LED_OFF_STATE);
          }
        }

        sendWsCommandComplete(cmdId, "Perintah valve berhasil dieksekusi oleh ESP32");
        if (bleDeviceConnected) sendBleStatus();
      }

      // 4. INSTAN KENDALI LED (GPIO 4 & ONBOARD LED GPIO 2)
      else if (eventType == "LED_CONTROL") {
        String state = doc["state"].as<String>();
        int gpio = doc["gpio"] | 4;
        int duration = doc["duration"] | 0;

        Serial.printf("[LED] Menerima perintah LED %s pada GPIO %d (durasi: %d)\n", state.c_str(), gpio, duration);
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
    case WStype_ERROR:
    case WStype_PING:
    case WStype_PONG:
      break;
  }
}

// =================================================================================
// Setup
// =================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.printf("[ESP32] Smart Fertigation AIoT %s Starting...\n", firmware_version);
  Serial.println("=======================================================");

  pinMode(VALVE1_PIN, OUTPUT);
  pinMode(VALVE2_PIN, OUTPUT);
  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(CONFIRM_LED_PIN, OUTPUT);

  // Inisialisasi awal saat boot: kedua valve TERTUTUP (RELAY_CLOSE_STATE)
  digitalWrite(VALVE1_PIN, RELAY_CLOSE_STATE);
  digitalWrite(VALVE2_PIN, RELAY_CLOSE_STATE);
  digitalWrite(ONBOARD_LED, LED_OFF_STATE);
  digitalWrite(CONFIRM_LED_PIN, LED_OFF_STATE);

  // 1. Baca konfigurasi dari flash memory (NVS)
  preferences.begin("fertigation", false);
  auth_code = preferences.getString("auth_code", "");
  ws_host_str = preferences.getString("ws_host", DEFAULT_WS_HOST);
  ws_port = preferences.getUShort("ws_port", DEFAULT_WS_PORT);
  preferences.end();
  Serial.printf("[API] URL API: %s:%d\n", ws_host_str.c_str(), ws_port);

  if (auth_code.length() > 0) {
    is_authenticated = true;
    Serial.printf("[AUTH] Status: TERVERIFIKASI (Auth Code: %s)\n", auth_code.c_str());
  } else {
    is_authenticated = false;
    Serial.println("[AUTH] Status: BELUM MEMILIKI AUTH_CODE. Menunggu pairing...");
  }

  // 2. Inisialisasi Bluetooth Low Energy (BLE) Server
  setupBLE();

  // 3. Hubungkan ke Wi-Fi (non-blocking jika sudah pernah terhubung atau gunakan WiFiManager)
  WiFi.mode(WIFI_STA);
  WiFi.begin(); // Mencoba reconnect ke SSID tersimpan sebelumnya di flash

  Serial.println("[Wi-Fi] Menghubungkan ke Wi-Fi yang tersimpan di flash...");
  unsigned long startWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWifi < 6000) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[Wi-Fi] Terhubung ke %s! IP ESP32: %s\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
    digitalWrite(ONBOARD_LED, HIGH);

    // 4. Inisialisasi WebSocket Client jika Wi-Fi terhubung
    connectWebSocketServer();
  } else {
    WiFi.disconnect(); // Hentikan ongoing retry di background agar tidak memblokir scan Wi-Fi
    Serial.println("[Wi-Fi] Belum terhubung ke Wi-Fi. Anda dapat menyambungkannya sekarang via Web Bluetooth!");
  }
}

// =================================================================================
// Main Loop
// =================================================================================
void loop() {
  // Jalankan loop WebSocket client jika Wi-Fi terhubung
  if (WiFi.status() == WL_CONNECTED) {
    webSocket.loop();
  }

  unsigned long now = millis();

  // Re-start BLE Advertising if disconnected
  if (!bleDeviceConnected && oldBleDeviceConnected) {
    delay(500); // give the bluetooth stack the chance to get things ready
    pBleServer->startAdvertising(); // restart advertising
    Serial.println("[BLE] Restarting advertising...");
    oldBleDeviceConnected = bleDeviceConnected;
  }
  // Transition from disconnected to connected
  if (bleDeviceConnected && !oldBleDeviceConnected) {
    oldBleDeviceConnected = bleDeviceConnected;
    // Kirim status awal ke client saat baru tersambung
    sendBleStatus();
  }

  // Cek perintah konsol serial
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "RESET_AUTH" || cmd == "reset_auth") {
      resetAuthCode();
    } else if (cmd == "STATUS" || cmd == "status") {
      sendBleStatus();
    }
  }

  // Kirim Heartbeat WebSocket setiap 4 detik
  if (now - lastHeartbeat >= 4000 || lastHeartbeat == 0) {
    lastHeartbeat = now;
    if (WiFi.status() == WL_CONNECTED && webSocket.isConnected()) {
      sendWsHeartbeat();
    }
  }

  // Kirim Telemetri Sensor setiap 15 detik ke WebSocket
  if (now - lastTelemetry >= 15000 || lastTelemetry == 0) {
    lastTelemetry = now;
    if (WiFi.status() == WL_CONNECTED && webSocket.isConnected()) {
      sendWsTelemetry();
    }
  }

  // Auto-close valve 1 timer
  if (valve1TimerEnd > 0 && now >= valve1TimerEnd) {
    valve1TimerEnd = 0;
    digitalWrite(VALVE1_PIN, RELAY_CLOSE_STATE);
    valve1State = false;
    Serial.println("[Valve] Valve 1 (GPIO 25) otomatis TERTUTUP (durasi timer selesai)");
    if (!valve2State) digitalWrite(ONBOARD_LED, LED_OFF_STATE);
    if (bleDeviceConnected) sendBleStatus();
  }

  // Auto-close valve 2 timer
  if (valve2TimerEnd > 0 && now >= valve2TimerEnd) {
    valve2TimerEnd = 0;
    digitalWrite(VALVE2_PIN, RELAY_CLOSE_STATE);
    valve2State = false;
    Serial.println("[Valve] Valve 2 (GPIO 26) otomatis TERTUTUP (durasi timer selesai)");
    if (!valve1State) digitalWrite(ONBOARD_LED, LED_OFF_STATE);
    if (bleDeviceConnected) sendBleStatus();
  }
}
