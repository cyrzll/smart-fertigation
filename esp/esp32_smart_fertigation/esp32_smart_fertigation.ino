/*
  =================================================================================
  SMART FERTIGATION AIoT - ESP32 WEBSOCKET & BLE HYBRID FIRMWARE
  =================================================================================
  Firmware Version : v2.5.0-BLE-WebSocket-Hybrid
  Release Date     : 27 Agustus 2026
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
  - DHT sensor library by Adafruit (beserta Adafruit Unified Sensor)
  =================================================================================
*/

#include <WiFi.h>
#include <WiFiManager.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <Ticker.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <time.h>

// ESP32 BLE Core Libraries
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// =================================================================================
// Firmware Version & WebSocket Configuration
// =================================================================================
const char* firmware_version = "v2.5.4-BLE-Optimized";

// Default API URL (bisa diubah via BLE dan disimpan permanen di NVS)
#define DEFAULT_WS_HOST "api.tirtaruna.site"
#define DEFAULT_WS_PORT 443

// ISRG Root X2 - trust anchor untuk sertifikat Let's Encrypt YE2 yang saat ini
// digunakan api.tirtaruna.site. Root berlaku sampai September 2040.
static const char LETS_ENCRYPT_ROOT_X2[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn
-----END CERTIFICATE-----
)EOF";

String ws_host_str = DEFAULT_WS_HOST;
uint16_t ws_port = DEFAULT_WS_PORT;

const char* device_code = "ESP-FERTIGASI-02";
const char* serial_code = "tes123-2";

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

// Modul lampu indikator common-ground (GND bersama, warna aktif-HIGH)
// Sambungan: GND -> GND ESP32, R -> GPIO 16, Y -> GPIO 17, G -> GPIO 18
#define STATUS_RED_PIN       16
#define STATUS_YELLOW_PIN    17
#define STATUS_GREEN_PIN     18

// Pin Konfigurasi Sensor Fisik:
//   - SENSOR_PH_PIN   : GPIO 34 (ADC1 ESP32) -> Pin Po Modul pH-4502C [TERPASANG AKTIF]
//   - SENSOR_TDS_PIN  : GPIO 32 (ADC1 ESP32) -> Pin A Modul TDS Meter V1.0 [TERPASANG AKTIF]
//   - SENSOR_TEMP_PIN : GPIO 33 -> Pin OUT/DATA Modul DHT22 [TERPASANG AKTIF]
//
// Pinout Sensor Suhu (3-Pin: +, -, OUT):
//   - '+'   : Power VCC 3.3V atau 5V -> Hubungkan ke 3.3V ESP32 (disarankan) atau VIN 5V
//   - '-'   : Ground                 -> Hubungkan ke GND ESP32
//   - 'OUT' : Data Digital            -> Hubungkan ke GPIO 33 (D33) ESP32
#define SENSOR_PH_PIN          34   // Pin Po Modul Sensor pH-4502C
#define SENSOR_TDS_PIN         32   // Pin A Modul Sensor TDS Meter V1.0 (GPIO 32)
#define SENSOR_TEMP_PIN        33   // Pin OUT Modul Sensor Suhu (GPIO 33)
#define SENSOR_TEMP_TYPE       DHT22

#define DEFAULT_PH_CALIBRATION_OFFSET   0.0  // Offset kalibrasi pH (sesuaikan dengan larutan buffer pH 4 / 7)
#define DEFAULT_TDS_CALIBRATION_FACTOR  1.0  // Faktor kalibrasi TDS default (dapat dikalibrasi dinamis via Flash NVS)
#define DEFAULT_TEMP_CALIBRATION_OFFSET 0.0  // Offset kalibrasi Suhu (°C)
#define WATER_TEMP_ESTIMATE             25.0 // DHT22 mengukur udara; kompensasi TDS tetap memakai estimasi suhu air

// Faktor Kalibrasi Aktif (Disimpan & Dimuat dari Flash NVS)
float tds_calibration_factor = DEFAULT_TDS_CALIBRATION_FACTOR;
float ph_calibration_offset = DEFAULT_PH_CALIBRATION_OFFSET;

// Logika Relay Valve (Active-High: HIGH = Valve Terbuka / ON, LOW = Valve Tertutup / OFF)
#define RELAY_OPEN_STATE   HIGH  // Sinyal HIGH (3.3V) untuk mengaktifkan relay / membuka valve
#define RELAY_CLOSE_STATE  LOW   // Sinyal LOW (0V) untuk mematikan relay / menutup valve (Standby saat boot)

// Logika LED (Active-High: HIGH = Menyala, LOW = Mati)
#define LED_ON_STATE       HIGH
#define LED_OFF_STATE      LOW

WebSocketsClient webSocket;
Ticker ledTicker;
DHT dht(SENSOR_TEMP_PIN, SENSOR_TEMP_TYPE);

// BLE Server & Characteristic Pointers
BLEServer *pBleServer = NULL;
BLECharacteristic *pBleTxChar = NULL;
BLECharacteristic *pBleRxChar = NULL;
bool bleDeviceConnected = false;
bool oldBleDeviceConnected = false;
bool wifiConnecting = false;
String wsDiagnostic = "NOT_CONNECTED";
IPAddress wsResolvedIp;
bool bleStackInitialized = false;
volatile bool bleNotifyInProgress = false;

// Perbarui indikator tanpa delay:
// hijau tetap = Wi-Fi tersambung, hijau berkedip = mencoba Wi-Fi,
// kuning = client BLE tersambung, merah = ESP hidup/standby.
void updateStatusIndicator() {
  bool redOn = false;
  bool yellowOn = false;
  bool greenOn = false;

  if (WiFi.status() == WL_CONNECTED) {
    greenOn = true;
  } else if (wifiConnecting) {
    greenOn = ((millis() / 400) % 2) == 0;
  } else if (bleDeviceConnected) {
    yellowOn = true;
  } else {
    redOn = true;
  }

  digitalWrite(STATUS_RED_PIN, redOn ? LED_ON_STATE : LED_OFF_STATE);
  digitalWrite(STATUS_YELLOW_PIN, yellowOn ? LED_ON_STATE : LED_OFF_STATE);
  digitalWrite(STATUS_GREEN_PIN, greenOn ? LED_ON_STATE : LED_OFF_STATE);
}

unsigned long lastHeartbeat = 0;
unsigned long lastTelemetry = 0;
unsigned long lastBleStatusUpdate = 0;

// Valve States
bool valve1State = false;
bool valve2State = false;
unsigned long valve1AutoCloseTime = 0;
unsigned long valve2AutoCloseTime = 0;

// Dynamic Valve Timers Structure (Mendukung GPIO 25, 26, 27, dan pin kustom apapun)
struct DynamicValveTimer {
  int gpio;
  unsigned long timerEnd;
  bool active;
};

#define MAX_VALVE_TIMERS 16
DynamicValveTimer dynamicValves[MAX_VALVE_TIMERS];

// Helper function to control any valve pin (supports dynamic GPIOs and auto-close timer)
void setValvePin(int gpio, bool open, int durationSeconds) {
  pinMode(gpio, OUTPUT);
  if (open) {
    digitalWrite(gpio, RELAY_OPEN_STATE);
    digitalWrite(ONBOARD_LED, LED_ON_STATE);
    Serial.printf("[Valve] GPIO %d TERBUKA (Relay HIGH, Durasi: %ds)\n", gpio, durationSeconds);

    if (gpio == VALVE1_PIN) valve1State = true;
    if (gpio == VALVE2_PIN) valve2State = true;

    if (durationSeconds > 0) {
      unsigned long timerEnd = millis() + ((unsigned long)durationSeconds * 1000);
      for (int i = 0; i < MAX_VALVE_TIMERS; i++) {
        if (dynamicValves[i].gpio == gpio || !dynamicValves[i].active) {
          dynamicValves[i].gpio = gpio;
          dynamicValves[i].timerEnd = timerEnd;
          dynamicValves[i].active = true;
          break;
        }
      }
    }
  } else {
    digitalWrite(gpio, RELAY_CLOSE_STATE);
    Serial.printf("[Valve] GPIO %d TERTUTUP (Relay LOW)\n", gpio);

    if (gpio == VALVE1_PIN) valve1State = false;
    if (gpio == VALVE2_PIN) valve2State = false;

    // Matikan timer aktif jika ada untuk GPIO ini
    for (int i = 0; i < MAX_VALVE_TIMERS; i++) {
      if (dynamicValves[i].gpio == gpio) {
        dynamicValves[i].active = false;
      }
    }

    // Matikan LED jika tidak ada valve lain yang sedang terbuka
    bool anyActive = false;
    for (int i = 0; i < MAX_VALVE_TIMERS; i++) {
      if (dynamicValves[i].active) {
        anyActive = true;
        break;
      }
    }
    if (!anyActive && !valve1State && !valve2State) {
      digitalWrite(ONBOARD_LED, LED_OFF_STATE);
    }
  }
}

// Sensor Telemetry Data (Real Hardware Reading)
float sensorPH = 7.0;
float sensorTDS = 0.0;
float sensorEC = 0.0;
float sensorTemp = 25.0;
bool sensorTempValid = false;

unsigned long lastSensorCheck = 0;
float lastSentPH = -999.0;
float lastSentTDS = -999.0;
float lastSentTemp = -999.0;
unsigned long lastDhtRead = 0;

// Buffer TDS non-blocking: 30 sampel x 40 ms = jendela pengukuran sekitar 1,2 detik.
// Sampling berkala jauh lebih stabil daripada membaca beruntun dalam beberapa ms.
#define TDS_SAMPLE_COUNT 30
uint32_t tdsMilliVoltBuffer[TDS_SAMPLE_COUNT];
int tdsSampleIndex = 0;
int tdsSamplesAvailable = 0;
unsigned long lastTdsSample = 0;
float filteredTdsVoltage = 0.0;

// Fungsi Membaca Nilai pH Aktual Cepat dari Sensor pH-4502C (Pin Po - GPIO 34)
float readPHSensor() {
  const int samples = 15;
  long adcSum = 0;
  for (int i = 0; i < samples; i++) {
    adcSum += analogRead(SENSOR_PH_PIN);
    delayMicroseconds(200); // Sampling instan non-blocking
  }
  float avgAdc = (float)adcSum / (float)samples;
  float voltage = (avgAdc / 4095.0) * 3.3; // Konversi ADC 12-bit ke Volt (0 - 3.3V)

  // Rumus Linear pH-4502C: pH 7.0 ~ 2.50V (dapat dikalibrasi via trimpot modul)
  // Slope: 5.70 pH/Volt
  float calculatedPH = 7.0 + ((2.50 - voltage) * 5.70) + ph_calibration_offset;
  if (calculatedPH < 0.0) calculatedPH = 0.0;
  if (calculatedPH > 14.0) calculatedPH = 14.0;
  return calculatedPH;
}

// DHT22 tidak boleh dibaca lebih cepat dari sekitar 2 detik. Pemanggilan di antara
// interval tersebut mengembalikan nilai valid terakhir.
float readTempSensor() {
  unsigned long now = millis();
  if (lastDhtRead != 0 && now - lastDhtRead < 2200) return sensorTemp;
  lastDhtRead = now;

  float measuredTemp = dht.readTemperature();
  if (isnan(measuredTemp)) {
    Serial.println("[DHT22] Pembacaan suhu gagal; memakai nilai valid terakhir.");
    return sensorTemp;
  }

  measuredTemp += DEFAULT_TEMP_CALIBRATION_OFFSET;
  // Tolak data ber-checksum valid tetapi tidak masuk akal untuk lingkungan kebun.
  // Kondisi ini biasanya disebabkan tipe sensor salah, kabel DATA tanpa pull-up,
  // kabel terlalu panjang, atau suplai sensor yang tidak stabil.
  if (measuredTemp < -10.0 || measuredTemp > 60.0) {
    Serial.printf("[DHT22] Nilai tidak wajar ditolak: %.1f °C. Periksa wiring/pull-up DATA.\n", measuredTemp);
    return sensorTemp;
  }

  sensorTempValid = true;
  return measuredTemp;
}

// Ambil tepat satu sampel agar loop WebSocket/BLE tidak terblokir.
void updateTdsSampling() {
  unsigned long now = millis();
  if (lastTdsSample != 0 && now - lastTdsSample < 40) return;
  lastTdsSample = now;

  // Gunakan kalibrasi ADC bawaan chip, bukan asumsi linear 0-4095 = 0-3,3 V.
  tdsMilliVoltBuffer[tdsSampleIndex] = analogReadMilliVolts(SENSOR_TDS_PIN);
  tdsSampleIndex = (tdsSampleIndex + 1) % TDS_SAMPLE_COUNT;
  if (tdsSamplesAvailable < TDS_SAMPLE_COUNT) tdsSamplesAvailable++;
}

// Fungsi simpan faktor kalibrasi TDS ke Flash Memory (NVS)
void saveTdsCalibrationFactor(float factor) {
  if (factor <= 0.05 || factor > 10.0) {
    Serial.println("[TDS] Faktor kalibrasi tidak valid (harus antara 0.05 s.d 10.0)");
    return;
  }
  tds_calibration_factor = factor;
  preferences.begin("fertigation", false);
  preferences.putFloat("tds_factor", tds_calibration_factor);
  preferences.end();
  Serial.printf("\n=======================================================\n");
  Serial.printf("[TDS] BERHASIL! Faktor Kalibrasi Tersimpan di Flash: %.4f\n", tds_calibration_factor);
  Serial.printf("=======================================================\n\n");
}

// Fungsi reset kalibrasi TDS ke default (1.0)
void resetTdsCalibration() {
  tds_calibration_factor = DEFAULT_TDS_CALIBRATION_FACTOR;
  preferences.begin("fertigation", false);
  preferences.remove("tds_factor");
  preferences.end();
  Serial.println("[TDS] Faktor kalibrasi dikembalikan ke default (1.0000).");
}

// Fungsi 1-Click Kalibrasi Otomatis TDS Menggunakan Larutan Standar (misal 1382 PPM)
bool calibrateTdsWithStandard(float standardPpm) {
  if (standardPpm <= 0.0) {
    Serial.println("[TDS] Gagal: Nilai standar PPM harus lebih besar dari 0!");
    return false;
  }
  if (filteredTdsVoltage < 0.035) {
    Serial.println("[TDS] Gagal: Tegangan sensor terlalu rendah (< 35 mV). Pastikan probe terendam di larutan!");
    return false;
  }

  // Hitung nilai PPM mentah sebelum dikalikan faktor
  float tempCoeff = 1.0 + 0.02 * (WATER_TEMP_ESTIMATE - 25.0);
  float compVolt = filteredTdsVoltage / tempCoeff;
  float uncalibratedPpm = (133.42 * pow(compVolt, 3) - 255.86 * pow(compVolt, 2) + 857.39 * compVolt) * 0.5;

  if (uncalibratedPpm <= 10.0) {
    Serial.println("[TDS] Gagal: Pembacaan sensor terlalu kecil untuk larutan standar.");
    return false;
  }

  float newFactor = standardPpm / uncalibratedPpm;
  saveTdsCalibrationFactor(newFactor);
  return true;
}

// Hitung TDS dari buffer tersaring (Pin A - GPIO 32).
float readTDSSensor() {
  // Tunggu inisialisasi cukup sampel sebelum mengganti nilai terakhir.
  if (tdsSamplesAvailable < 5) return sensorTDS;

  uint32_t sortedBuffer[TDS_SAMPLE_COUNT];
  int samples = tdsSamplesAvailable;
  for (int i = 0; i < samples; i++) sortedBuffer[i] = tdsMilliVoltBuffer[i];

  // Median filtering untuk menghilangkan noise spike ADC
  for (int i = 0; i < samples - 1; i++) {
    for (int j = i + 1; j < samples; j++) {
      if (sortedBuffer[i] > sortedBuffer[j]) {
        uint32_t temp = sortedBuffer[i];
        sortedBuffer[i] = sortedBuffer[j];
        sortedBuffer[j] = temp;
      }
    }
  }

  // Buang sekitar 20% nilai terendah dan tertinggi (trimmed mean)
  int trim = samples / 5;
  if (trim < 1) trim = 0;
  uint32_t milliVoltSum = 0;
  int count = 0;
  for (int i = trim; i < samples - trim; i++) {
    milliVoltSum += sortedBuffer[i];
    count++;
  }
  float measuredVoltage = (count > 0) ? (((float)milliVoltSum / (float)count) / 1000.0) : 0.0;

  // Exponential moving average (EMA) smoothing untuk stabilitas
  if (filteredTdsVoltage <= 0.0) filteredTdsVoltage = measuredVoltage;
  else filteredTdsVoltage = (filteredTdsVoltage * 0.80) + (measuredVoltage * 0.20);

  // Jika tegangan terlalu kecil (< 35 mV), probe di udara / kering -> 0 PPM
  if (filteredTdsVoltage < 0.035) {
    return 0.0;
  }

  // DHT22 mengukur suhu udara, bukan suhu larutan. Gunakan estimasi suhu air
  // sampai tersedia probe suhu air terpisah agar kompensasi TDS tidak keliru.
  float currentWaterTemp = WATER_TEMP_ESTIMATE;
  float compensationCoefficient = 1.0 + 0.02 * (currentWaterTemp - 25.0);
  float compensationVoltage = filteredTdsVoltage / compensationCoefficient;

  // Rumus Kurva Karakteristik Non-Linear TDS Gravity / TDS Meter V1.0:
  // TDS (ppm) = (133.42 * V^3 - 255.86 * V^2 + 857.39 * V) * 0.5 * factor
  float calculatedTDS = (133.42 * pow(compensationVoltage, 3) - 255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) * 0.5 * tds_calibration_factor;

  if (calculatedTDS < 0.0) calculatedTDS = 0.0;
  return calculatedTDS;
}

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
    delay(120);
    digitalWrite(CONFIRM_LED_PIN, LOW);
    digitalWrite(ONBOARD_LED, LOW);
    delay(120);
  }

  digitalWrite(ONBOARD_LED, HIGH); // Standby ON (indikator terhubung)
  Serial.printf("[PAIRING] Selesai berkedip %d kali.\n\n", times);
}

// =================================================================================
// BLE Notification & Messaging Helpers (Safe Chunking for Long Payloads)
// =================================================================================
void sendBleNotify(String message) {
  if (bleNotifyInProgress || !bleDeviceConnected || pBleTxChar == NULL) return;
  bleNotifyInProgress = true;

  // Append newline delimiter for easy client buffer parsing
  String packet = message + "\n";
  size_t totalLen = packet.length();
  size_t chunkSize = 120; // Chunk optimal agar tidak membebani buffer GATT

  if (totalLen <= chunkSize) {
    pBleTxChar->setValue((uint8_t*)packet.c_str(), totalLen);
    pBleTxChar->notify();
  } else {
    for (size_t offset = 0; offset < totalLen; offset += chunkSize) {
      size_t len = min(chunkSize, totalLen - offset);
      pBleTxChar->setValue((uint8_t*)(packet.c_str() + offset), len);
      pBleTxChar->notify();
      delay(8); // Jeda kecil non-blocking agar buffer stack BLE tidak overflow
    }
  }
  Serial.printf("[BLE TX] %s\n", message.c_str());

  bleNotifyInProgress = false;
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

bool syncClockForTls() {
  const long wibUtcOffsetSeconds = 7L * 60L * 60L;
  configTime(wibUtcOffsetSeconds, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");

  // Sertifikat TLS tidak dapat divalidasi jika jam ESP masih 1 Januari 1970.
  wsDiagnostic = "SYNCING_TIME";
  Serial.println("[WSS] Menyinkronkan waktu NTP untuk validasi sertifikat TLS...");
  unsigned long startedAt = millis();
  while (time(nullptr) <= 1704067200 && millis() - startedAt < 12000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (time(nullptr) <= 1704067200) {
    wsDiagnostic = "NTP_FAILED";
    Serial.println("[WSS ERROR] Sinkronisasi NTP gagal; koneksi TLS dibatalkan.");
    return false;
  }

  struct tm wibTime;
  getLocalTime(&wibTime, 1000);
  Serial.printf("[WSS] Waktu WIB (UTC+7) tersinkron: %04d-%02d-%02d %02d:%02d:%02d\n",
                wibTime.tm_year + 1900, wibTime.tm_mon + 1, wibTime.tm_mday,
                wibTime.tm_hour, wibTime.tm_min, wibTime.tm_sec);
  return true;
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

    wsDiagnostic = "RESOLVING_DNS";
    if (!WiFi.hostByName(cleanHost.c_str(), wsResolvedIp)) {
      wsDiagnostic = "DNS_FAILED";
      Serial.printf("[WS ERROR] DNS gagal menemukan host '%s'.\n", cleanHost.c_str());
      return;
    }
    Serial.printf("[WS] DNS %s -> %s\n", cleanHost.c_str(), wsResolvedIp.toString().c_str());

    if (isSSL) {
      if (!syncClockForTls()) return;
      wsDiagnostic = "TLS_CONNECTING";
      Serial.printf("[WS] Menghubungkan secara SECURE (WSS/SSL) ke wss://%s:%d%s...\n", cleanHost.c_str(), ws_port, wsUrl.c_str());
      webSocket.beginSslWithCA(cleanHost.c_str(), ws_port, wsUrl.c_str(), LETS_ENCRYPT_ROOT_X2);
    } else {
      wsDiagnostic = "WS_CONNECTING";
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
  StaticJsonDocument<512> doc;
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
  doc["ws_diagnostic"] = wsDiagnostic;
  doc["ws_resolved_ip"] = wsResolvedIp.toString();
  doc["uptime_sec"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();

  JsonObject valves = doc.createNestedObject("valves");
  valves["valve1"] = valve1State;
  valves["valve2"] = valve2State;

  // Baca suhu sebelum TDS karena nilainya dipakai untuk kompensasi TDS.
  sensorPH = readPHSensor();
  sensorTemp = readTempSensor();
  sensorTDS = readTDSSensor();
  sensorEC = sensorTDS / 500.0; // Perkiraan EC (mS/cm): 1 mS/cm ~ 500 ppm

  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["ph"] = sensorPH;
  sensors["tds"] = sensorTDS;
  sensors["ec"] = sensorEC;
  if (sensorTempValid) sensors["suhu"] = sensorTemp;
  else sensors["suhu"] = nullptr;

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
  delay(50);

  int n = WiFi.scanNetworks(false, false);
  Serial.printf("[BLE SCAN] Ditemukan %d jaringan Wi-Fi.\n", n);

  // Jika scan awal gagal (-2), coba sekali lagi setelah delay singkat
  if (n < 0) {
    delay(100);
    n = WiFi.scanNetworks(false, false);
    Serial.printf("[BLE SCAN RETRY] Ditemukan %d jaringan Wi-Fi.\n", n);
  }

  StaticJsonDocument<768> doc;
  doc["type"] = "WIFI_SCAN_RESULT";
  doc["count"] = (n >= 0) ? n : 0;
  JsonArray networks = doc.createNestedArray("networks");

  if (n > 0) {
    // Batasi 8 jaringan terkuat agar transmisi BLE cepat, hemat RAM, dan stabil
    for (int i = 0; i < n && i < 8; ++i) {
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

  wifiConnecting = true;
  updateStatusIndicator();

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
  // Max 6 detik (24 x 250ms) agar tidak memblokir BLE connection polling
  while (WiFi.status() != WL_CONNECTED && attempts < 24) {
    delay(250);
    updateStatusIndicator();
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  wifiConnecting = false;
  updateStatusIndicator();

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
  delay(100);
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
      updateStatusIndicator();
      Serial.println("\n[BLE] >>> Client Web Bluetooth TERHUBUNG! <<<");
    };

    void onDisconnect(BLEServer* pServer) {
      bleDeviceConnected = false;
      updateStatusIndicator();
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

          bool open = (action == "OPEN" || action == "TEST_OPEN");
          setValvePin(gpio, open, duration);

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

            reconnectWebSocket();
          }
        }
        // 12. RESET_API: Kembalikan URL API ke default
        else if (cmd == "RESET_API") {
          resetApiUrl();

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

          reconnectWebSocket();
        }
        // 13. CALIBRATE_TDS: Kalibrasi 1-klik dengan larutan standar PPM
        else if (cmd == "CALIBRATE_TDS") {
          float standardPpm = doc["standard_ppm"] | 1382.0;
          bool success = calibrateTdsWithStandard(standardPpm);

          StaticJsonDocument<256> res;
          res["type"] = "TDS_CALIBRATE_RESULT";
          res["success"] = success;
          res["factor"] = tds_calibration_factor;
          res["standard_ppm"] = standardPpm;
          res["message"] = success ? "Kalibrasi TDS berhasil disimpan ke Flash!" : "Gagal kalibrasi TDS, periksa larutan probe.";
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
          sendBleStatus();
        }
        // 14. SET_TDS_FACTOR: Atur faktor kalibrasi TDS manual
        else if (cmd == "SET_TDS_FACTOR") {
          float factor = doc["factor"] | 1.0;
          saveTdsCalibrationFactor(factor);

          StaticJsonDocument<256> res;
          res["type"] = "TDS_CALIBRATE_RESULT";
          res["success"] = true;
          res["factor"] = tds_calibration_factor;
          res["message"] = "Faktor kalibrasi TDS berhasil diperbarui!";
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
          sendBleStatus();
        }
        // 15. RESET_TDS_CAL: Reset kalibrasi TDS ke default 1.0
        else if (cmd == "RESET_TDS_CAL") {
          resetTdsCalibration();

          StaticJsonDocument<256> res;
          res["type"] = "TDS_CALIBRATE_RESULT";
          res["success"] = true;
          res["factor"] = tds_calibration_factor;
          res["message"] = "Faktor kalibrasi TDS direset ke 1.0000.";
          String resStr;
          serializeJson(res, resStr);
          sendBleNotify(resStr);
          sendBleStatus();
        }
      }
    }
};

// Initialize BLE Server & Advertising
String dynamicBleName = "";

void setupBLE() {
  Serial.println("\n[BLE] Memulai Inisialisasi Bluetooth Low Energy (BLE)...");

  // Buat nama BLE dinamis unik per perangkat berdasarkan MAC address hardware
  // Contoh output: "ESP32-Fertigation-9444"
  String macStr = WiFi.macAddress();
  macStr.replace(":", "");
  String macSuffix = (macStr.length() >= 4) ? macStr.substring(macStr.length() - 4) : "01";
  dynamicBleName = String(BLE_DEVICE_NAME) + "-" + macSuffix;

  BLEDevice::init(dynamicBleName.c_str());
  BLEDevice::setMTU(185); // Cukup untuk chunk 128 byte dan lebih hemat RAM

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
  pAdvertising->setMinPreferred(0x10); // 20ms connection interval min
  pAdvertising->setMaxPreferred(0x20); // 40ms connection interval max
  BLEDevice::startAdvertising();
  bleStackInitialized = true;
  Serial.printf("[BLE] BLE Server Berhasil Berjalan! Nama: '%s', Service UUID: %s\n\n", dynamicBleName.c_str(), SERVICE_UUID);
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
  lastSentPH = sensorPH;
  lastSentTDS = sensorTDS;
  lastSentTemp = sensorTemp;

  StaticJsonDocument<256> doc;
  doc["type"] = "TELEMETRY";
  doc["device_code"] = device_code;
  doc["auth_code"] = auth_code;
  doc["ph"] = sensorPH;
  doc["tds"] = sensorTDS;
  doc["ec"] = sensorEC;
  if (sensorTempValid) doc["suhu"] = sensorTemp;
  else doc["suhu"] = nullptr;
  doc["status"] = "Normal";

  String msg;
  serializeJson(doc, msg);
  webSocket.sendTXT(msg);
  if (sensorTempValid) {
    Serial.printf("[WS Telemetry] Suhu: %.1f °C | pH: %.2f | TDS: %.0f ppm | Tegangan TDS: %.3f V (GPIO 32) | EC: %.2f mS/cm\n", sensorTemp, sensorPH, sensorTDS, filteredTdsVoltage, sensorEC);
  } else {
    Serial.printf("[WS Telemetry] DHT22 belum valid | pH: %.2f | TDS: %.0f ppm | Tegangan TDS: %.3f V (GPIO 32) | EC: %.2f mS/cm\n", sensorPH, sensorTDS, filteredTdsVoltage, sensorEC);
  }
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
      if (wsDiagnostic == "TLS_CONNECTING") {
        wsDiagnostic = "TLS_FAILED_RETRYING";
      } else if (wsDiagnostic == "WS_CONNECTING") {
        wsDiagnostic = "WS_FAILED_RETRYING";
      } else {
        wsDiagnostic = "DISCONNECTED_RETRYING";
      }
      Serial.println("[WS] Terputus dari WebSocket Server! Mencoba menghubungkan kembali...");
      break;

    case WStype_CONNECTED:
      wsDiagnostic = "CONNECTED";
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

        bool open = (cmd == "OPEN" || cmd == "TEST_OPEN");
        setValvePin(gpio, open, duration);

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

    case WStype_ERROR: {
      String errorText;
      for (size_t i = 0; i < length; i++) errorText += (char)payload[i];
      errorText.trim();
      wsDiagnostic = errorText.length() > 0 ? "WS_ERROR: " + errorText : "WS_ERROR";
      Serial.printf("[WS ERROR] %s\n", errorText.length() > 0 ? errorText.c_str() : "Handshake/TLS gagal tanpa detail payload");
      if (bleDeviceConnected) sendBleStatus();
      break;
    }

    case WStype_BIN:
    case WStype_PING:
    case WStype_PONG:
      break;
  }
}

// =================================================================================
// Setup
// =================================================================================
void setup() {
  // Inisialisasi awal hardware instan: Kunci semua pin valve ke kondisi TERTUTUP/MATI (LOW / 0V)
  // Dilakukan pada baris pertama sebelum delay agar tidak ada lonjakan (glitch) saat boot
  pinMode(VALVE1_PIN, OUTPUT);
  pinMode(VALVE2_PIN, OUTPUT);
  digitalWrite(VALVE1_PIN, RELAY_CLOSE_STATE); // LOW (0V)
  digitalWrite(VALVE2_PIN, RELAY_CLOSE_STATE); // LOW (0V)

  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(CONFIRM_LED_PIN, OUTPUT);
  pinMode(STATUS_RED_PIN, OUTPUT);
  pinMode(STATUS_YELLOW_PIN, OUTPUT);
  pinMode(STATUS_GREEN_PIN, OUTPUT);
  digitalWrite(ONBOARD_LED, LED_OFF_STATE);
  digitalWrite(CONFIRM_LED_PIN, LED_OFF_STATE);
  digitalWrite(STATUS_RED_PIN, LED_ON_STATE);
  digitalWrite(STATUS_YELLOW_PIN, LED_OFF_STATE);
  digitalWrite(STATUS_GREEN_PIN, LED_OFF_STATE);

  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.printf("[ESP32] Smart Fertigation AIoT %s Starting...\n", firmware_version);
  Serial.println("=======================================================");

  pinMode(SENSOR_PH_PIN, INPUT);
  pinMode(SENSOR_TDS_PIN, INPUT);
  dht.begin();

  analogReadResolution(12);       // Resolusi ADC 12-bit (0-4095)
  analogSetAttenuation(ADC_11db); // Rentang tegangan input 0 - 3.3V
  analogSetPinAttenuation(SENSOR_TDS_PIN, ADC_11db);

  // 1. Baca konfigurasi dari flash memory (NVS)
  preferences.begin("fertigation", false);
  auth_code = preferences.getString("auth_code", "");
  ws_host_str = preferences.getString("ws_host", DEFAULT_WS_HOST);
  ws_port = preferences.getUShort("ws_port", DEFAULT_WS_PORT);
  tds_calibration_factor = preferences.getFloat("tds_factor", DEFAULT_TDS_CALIBRATION_FACTOR);
  ph_calibration_offset = preferences.getFloat("ph_offset", DEFAULT_PH_CALIBRATION_OFFSET);

  // Jika NVS masih kosong, gunakan default
  if (ws_host_str == "") {
    ws_host_str = DEFAULT_WS_HOST;
    ws_port = DEFAULT_WS_PORT;
    preferences.putString("ws_host", ws_host_str);
    preferences.putUShort("ws_port", ws_port);
  }
  preferences.end();
  Serial.printf("[API] URL API Aktif: %s:%d\n", ws_host_str.c_str(), ws_port);
  Serial.printf("[TDS] Faktor Kalibrasi Aktif: %.4f\n", tds_calibration_factor);

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
  wifiConnecting = true;
  WiFi.begin(); // Mencoba reconnect ke SSID tersimpan sebelumnya di flash

  Serial.println("[Wi-Fi] Menghubungkan ke Wi-Fi yang tersimpan di flash...");
  unsigned long startWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWifi < 6000) {
    delay(400);
    updateStatusIndicator();
    Serial.print(".");
  }
  Serial.println();
  wifiConnecting = false;
  updateStatusIndicator();

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
  // Indikator selalu mengikuti status koneksi terkini.
  updateStatusIndicator();

  // Jalankan loop WebSocket client jika Wi-Fi terhubung
  if (WiFi.status() == WL_CONNECTED) {
    webSocket.loop();
  }

  // Sampling analog TDS berjalan kontinu dan tidak bergantung pada refresh BLE.
  updateTdsSampling();

  unsigned long now = millis();

  // Re-start BLE Advertising if disconnected
  if (!bleDeviceConnected && oldBleDeviceConnected) {
    delay(200); // give the bluetooth stack the chance to get things ready
    pBleServer->startAdvertising(); // restart advertising
    Serial.println("[BLE] Restarting advertising...");
    oldBleDeviceConnected = bleDeviceConnected;
  }
  // Transition from disconnected to connected
  if (bleDeviceConnected && !oldBleDeviceConnected) {
    oldBleDeviceConnected = bleDeviceConnected;
    lastBleStatusUpdate = now;
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
    } else if (cmd.startsWith("CAL_TDS ") || cmd.startsWith("cal_tds ")) {
      float stdPpm = cmd.substring(8).toFloat();
      calibrateTdsWithStandard(stdPpm);
    } else if (cmd.startsWith("SET_TDS_FACTOR ") || cmd.startsWith("set_tds_factor ")) {
      float f = cmd.substring(15).toFloat();
      saveTdsCalibrationFactor(f);
    } else if (cmd == "RESET_TDS_CAL" || cmd == "reset_tds_cal") {
      resetTdsCalibration();
    } else if (cmd == "RAW_TDS" || cmd == "raw_tds") {
      Serial.printf("[TDS Debug] Voltase: %.3f V (%.1f mV) | Faktor Kalibrasi: %.4f | TDS: %.1f PPM | EC: %.2f mS/cm\n",
                    filteredTdsVoltage, filteredTdsVoltage * 1000.0, tds_calibration_factor, sensorTDS, sensorEC);
    }
  }

  // Kirim Heartbeat WebSocket setiap 4 detik
  if (now - lastHeartbeat >= 4000 || lastHeartbeat == 0) {
    lastHeartbeat = now;
    if (WiFi.status() == WL_CONNECTED && webSocket.isConnected()) {
      sendWsHeartbeat();
    }
  }

  // 1. Cek pembacaan sensor setiap 800 ms (Cepat & Responsif)
  if (now - lastSensorCheck >= 800 || lastSensorCheck == 0) {
    lastSensorCheck = now;
    float curPH = readPHSensor();
    float curTemp = readTempSensor();
    // TDS memakai sensorTemp untuk kompensasi; perbarui lebih dahulu.
    sensorTemp = curTemp;
    float curTDS = readTDSSensor();

    // Deteksi jika terjadi perubahan nilai nyata (probe dicelup / air diaduk / suhu berubah)
    bool significantChange = (fabs(curPH - lastSentPH) >= 0.15) || (fabs(curTDS - lastSentTDS) >= 25.0) || (fabs(curTemp - lastSentTemp) >= 0.8);

    // Kirim WebSocket jika ada perubahan nyata (instan) ATAU interval periodik 3.0 detik
    if (significantChange || (now - lastTelemetry >= 3000) || (lastTelemetry == 0)) {
      lastTelemetry = now;
      sensorPH = curPH;
      sensorTDS = curTDS;
      sensorTemp = curTemp;
      sensorEC = sensorTDS / 500.0;

      if (WiFi.status() == WL_CONNECTED && webSocket.isConnected()) {
        sendWsTelemetry();
      }
    }
  }

  // 2. Kirim update status BLE teratur (Throttle minimal 2.5 detik)
  // Menghindari tabrakan antrean RF 2.4 GHz antara Wi-Fi dan Bluetooth
  if (bleDeviceConnected && (now - lastBleStatusUpdate >= 2500 || lastBleStatusUpdate == 0)) {
    lastBleStatusUpdate = now;
    sendBleStatus();
  }

  // Auto-close dynamic valve timers (Mendukung GPIO 25, 26, 27, dan semua pin kustom)
  for (int i = 0; i < MAX_VALVE_TIMERS; i++) {
    if (dynamicValves[i].active && now >= dynamicValves[i].timerEnd) {
      int pin = dynamicValves[i].gpio;
      dynamicValves[i].active = false;
      digitalWrite(pin, RELAY_CLOSE_STATE);

      if (pin == VALVE1_PIN) valve1State = false;
      if (pin == VALVE2_PIN) valve2State = false;

      Serial.printf("[Valve] GPIO %d otomatis TERTUTUP (durasi timer selesai)\n", pin);

      bool anyActive = false;
      for (int j = 0; j < MAX_VALVE_TIMERS; j++) {
        if (dynamicValves[j].active) {
          anyActive = true;
          break;
        }
      }
      if (!anyActive && !valve1State && !valve2State) {
        digitalWrite(ONBOARD_LED, LED_OFF_STATE);
      }

      if (bleDeviceConnected) sendBleStatus();
    }
  }
}
