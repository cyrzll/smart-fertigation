#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <Ticker.h>

// WebSocket Server Configuration
// Replace with your Hono server's local IP address and port
const char* ws_host = "192.168.1.5"; 
const int ws_port = 3000;
const char* ws_path = "/ws";

// Pin Configurations on ESP32-C3 Super Mini
#define RELAY1_PIN 10  // Lampu Ruang Tamu (GPIO 10)
#define ONBOARD_LED 8  // Onboard Blue LED (GPIO 8 - useful for testing)
#define BOOT_BUTTON 9  // Onboard BOOT Button (GPIO 9)

// Relay & LED Logic Configuration
// Onboard LED and most relay modules are Active-Low (trigger on LOW).
#define RELAY_ON  LOW
#define RELAY_OFF HIGH
#define LED_ON    LOW
#define LED_OFF   HIGH

WebSocketsClient webSocket;
Ticker ledTicker;

void tickLED() {
  digitalWrite(ONBOARD_LED, !digitalRead(ONBOARD_LED));
}

void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("[Wi-Fi] Entered Config AP Mode. Setting TX Power to 8.5dBm...");
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  // Blink LED rapidly (200ms) when in Access Point (config) mode
  ledTicker.attach(0.2, tickLED);
}

void handleDeviceAction(const char* device, const char* action) {
  int targetPin = -1;
  
  if (strcmp(device, "lampu_ruang_tamu") == 0) {
    targetPin = RELAY1_PIN;
    // Toggle the onboard LED (Active-Low) for local validation
    digitalWrite(ONBOARD_LED, (strcmp(action, "on") == 0) ? LED_ON : LED_OFF);
  }

  if (targetPin != -1) {
    int pinState = (strcmp(action, "on") == 0) ? RELAY_ON : RELAY_OFF;
    digitalWrite(targetPin, pinState);
    Serial.printf("[IoT] Device %s set to %s (Pin %d -> %s)\n", 
                  device, action, targetPin, (pinState == LOW) ? "LOW" : "HIGH");
  } else {
    Serial.printf("[IoT] Unknown device: %s\n", device);
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from server!");
      break;
      
    case WStype_CONNECTED:
      Serial.printf("[WS] Connected to: %s\n", ws_host);
      // Send a handshake message to announce connection
      webSocket.sendTXT("{\"type\":\"handshake\",\"client\":\"esp32_c3\"}");
      break;
      
    case WStype_TEXT: {
      Serial.printf("[WS] Received text: %s\n", payload);
      
      // Parse JSON payload
      // Expected: {"type":"device","device":"lampu_ruang_tamu","action":"off"}
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, payload, length);
      
      if (error) {
        Serial.print("[JSON] Deserialization failed: ");
        Serial.println(error.f_str());
        return;
      }
      
      const char* msgType = doc["type"];
      if (msgType && strcmp(msgType, "device") == 0) {
        const char* device = doc["device"];
        const char* action = doc["action"];
        
        if (device && action) {
          handleDeviceAction(device, action);
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

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nStarting ESP32-C3 WebSocket Client...");
  
  // Initialize pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(BOOT_BUTTON, INPUT_PULLUP);
  
  // Set default states to OFF
  digitalWrite(RELAY1_PIN, RELAY_OFF);
  digitalWrite(ONBOARD_LED, LED_OFF); // Onboard LED Off (Active-Low)
  
  // --- Check if BOOT button is held at startup to reset Wi-Fi settings ---
  Serial.println("Waiting 3 seconds... Press & HOLD BOOT button to reset Wi-Fi.");
  bool resetTriggered = false;
  for (int i = 0; i < 30; i++) { // 30 * 100ms = 3 seconds
    // Blink LED slowly during boot delay
    if (i % 6 == 0) {
      digitalWrite(ONBOARD_LED, LED_ON);
    } else if (i % 6 == 3) {
      digitalWrite(ONBOARD_LED, LED_OFF);
    }
    
    if (digitalRead(BOOT_BUTTON) == LOW) {
      resetTriggered = true;
      break;
    }
    delay(100);
  }
  
  if (resetTriggered) {
    Serial.println("\n[RESET] BOOT Button detected! Clearing Wi-Fi credentials...");
    WiFiManager wm;
    wm.resetSettings();
    
    // Quick blink confirmation
    for (int i = 0; i < 15; i++) {
      digitalWrite(ONBOARD_LED, LED_ON);
      delay(50);
      digitalWrite(ONBOARD_LED, LED_OFF);
      delay(50);
    }
    Serial.println("[RESET] Done. Restarting...");
    delay(1000);
    ESP.restart();
  }
  
  digitalWrite(ONBOARD_LED, LED_OFF); // Ensure LED is off before connecting
  
  // --- WiFiManager Setup ---
  WiFiManager wm;
  wm.setAPCallback(configModeCallback);
  
  // Set WiFi mode to AP+STA so we can configure TX Power
  WiFi.mode(WIFI_AP_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  wm.setConfigPortalTimeout(180); // 3 minutes timeout for captive portal
  
  Serial.println("Connecting to Wi-Fi...");
  ledTicker.attach(0.6, tickLED); // Blink slowly (600ms) while connecting
  
  if (!wm.autoConnect("ESP32-C3-SuperMini-AP")) {
    ledTicker.detach();
    digitalWrite(ONBOARD_LED, LED_OFF);
    Serial.println("Failed to connect Wi-Fi and portal timed out. Restarting...");
    delay(3000);
    ESP.restart();
  }
  
  ledTicker.detach();
  digitalWrite(ONBOARD_LED, LED_OFF); // Turn LED off once connected
  
  Serial.println("Wi-Fi Connected!");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());
  
  // Initialize WebSocket connection
  webSocket.begin(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
  
  // --- Runtime Wi-Fi Reset via BOOT Button ---
  if (digitalRead(BOOT_BUTTON) == LOW) {
    unsigned long pressStartTime = millis();
    bool shouldReset = false;
    
    Serial.println("BOOT Button pressed, hold to reset Wi-Fi...");
    while (digitalRead(BOOT_BUTTON) == LOW) {
      if (millis() - pressStartTime > 3000) {
        shouldReset = true;
        break;
      }
      delay(50);
    }
    
    if (shouldReset) {
      Serial.println("\n[RESET] Clearing Wi-Fi settings & Restarting...");
      for (int i = 0; i < 6; i++) {
        digitalWrite(ONBOARD_LED, LED_ON);
        delay(100);
        digitalWrite(ONBOARD_LED, LED_OFF);
        delay(100);
      }
      
      WiFiManager wm;
      wm.resetSettings();
      delay(1000);
      ESP.restart();
    }
  }
}
