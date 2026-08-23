# WhatsApp IoT Agent Gateway & ESP32-C3 Controller

This repository contains a WhatsApp agent integrated with a local Ollama model (`qwen:0.5b`), a Hono WebSocket server, and an ESP32-C3 Super Mini client that controls relays to toggle home devices (lights, fan, water pump).

---

## 🛠 Hardware Configuration (ESP32-C3 Super Mini)

The **ESP32-C3 Super Mini** is a compact, high-performance development board. Below is the pinout and connection wiring scheme for the relays.

### Pinout Mapping

| Device Name | GPIO Pin | Relay / Component | Onboard Action |
| :--- | :--- | :--- | :--- |
| **Lampu Ruang Tamu** | `GPIO 10` | Relay 1 (Control Lamp) | Also toggles Onboard LED |
| **Kipas** | `GPIO 2` | Relay 2 (Control Fan) | - |
| **Pompa Air** | `GPIO 3` | Relay 3 (Control Pump) | - |
| **Onboard Blue LED** | `GPIO 8` | Onboard Indicator | Inverted Logic (Active-Low) |

---

### 🔌 Wiring Diagram

```
                 ESP32-C3 Super Mini
               ┌──────────────────────┐
               │    [USB-C PORT]      │
               │                      │
         GND ──│ GND              5V  │── VCC (5V Power Relay)
               │                      │
    Relay 2 ──│ GPIO 2         GPIO 10│── Relay 1 (Lampu Ruang Tamu)
    Relay 3 ──│ GPIO 3         GPIO 8 │── (Onboard Blue LED)
               └──────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │                   RELAY MODULE WIRING                  │
  ├───────────────────┬───────────────────┬────────────────┤
  │ ESP32-C3 Pin      │ Relay Module Pin  │ Description    │
  ├───────────────────┼───────────────────┼────────────────┤
  │ 5V                │ VCC               │ Power Supply   │
  │ GND               │ GND               │ Ground         │
  │ GPIO 10           │ IN1 / IN          │ Control Signal │
  └───────────────────┴───────────────────┴────────────────┘

                     AC HIGH-VOLTAGE WIRING
                       (For Lamp / Load)
                      ┌──────────────────┐
                      │   Relay Module   │
                      │ ┌──────────────┐ │
                      │ │  [NO]  [COM] │ │
                      └─┴───│──────│───┴─┘
                            │      └─────────── Line (Fasa / AC 220V)
                            │
                        [💡 Lamp]
                            │
  Neutral ──────────────────┴────────────────── Neutral (AC 220V)
```

> [!WARNING]
> **Safety Warning:** Working with high-voltage AC (220V/110V) is dangerous. Ensure you disconnect main power before wiring the relay's high-voltage side. Maintain proper physical insulation between low-voltage and high-voltage tracks.

---

## 💻 Arduino Client Setup

### 1. Library Dependencies
Open your Arduino IDE and install the following libraries via the **Library Manager** (`Ctrl+Shift+I` or `Cmd+Shift+I`):
1.  **WebSockets** (by *Markus Sattler*)
2.  **ArduinoJson** (by *Benoit Blanchon*)
3.  **WiFiManager** (by *tzapu*)

### 2. Upload & Setup Code
1.  Open [esp-websocket-client.ino](file:///Users/rizal/projek/iot/ppko/esp/esp-websocket-client/esp-websocket-client.ino).
2.  Set the Hono gateway's IP address (e.g., change `ws_host` to match your computer's local network IP):
    ```cpp
    const char* ws_host = "192.168.1.5"; // Your computer's local IP address
    ```
3.  Select **ESP32C3 Dev Module** in Arduino IDE and click Upload.
4.  **Connect to Wi-Fi Portal:** On its first run (or if no Wi-Fi credentials are saved), the ESP32-C3 will start a captive Wi-Fi portal:
    *   Connect your smartphone/laptop to the Wi-Fi network named **"ESP32-C3-SuperMini-AP"**.
    *   A login web page should open automatically. If not, go to `http://192.168.4.1` in your browser.
    *   Click **Configure WiFi**, select your home Wi-Fi network, enter its password, and click Save.
5.  **Wi-Fi Reset Feature:** If you want to change Wi-Fi networks later, press and hold the **BOOT button (GPIO 9)** on the ESP32-C3 board for **3 seconds** (either during the startup 3-second delay or at runtime). The LED will flash rapidly, clearing the saved credentials and restarting the portal.

---

## 🚀 Backend & WhatsApp Agent Setup

### 1. Prerequisites
*   Node.js (v18 or higher)
*   **Ollama** running locally (or remote) with `qwen:0.5b` model pulled:
    ```bash
    ollama pull qwen:0.5b
    ```

### 2. Installation
Navigate to the `wa-agent` directory and install the packages:
```bash
cd wa-agent
npm install
```

### 3. Running the Server
Start the gateway and WhatsApp listener in development mode:
```bash
npm run dev
```

### 4. WhatsApp Web QR Authentication
When running, a QR code will print in your terminal. 
Scan this QR code using your WhatsApp app (**Linked Devices**) to authorize the agent.

---

## 🧪 Verification & Testing

### Test 1: Local HTTP Broadcast
You can test the WebSocket broadcast manually using `curl` without sending a WhatsApp message:
```bash
curl -X POST http://localhost:3000/command \
  -H "Content-Type: application/json" \
  -d '{"device": "lampu_ruang_tamu", "action": "off"}'
```
Check the ESP32 Serial Monitor to verify that it receives the command:
`[WS] Received text: {"type":"device","device":"lampu_ruang_tamu","action":"off"}`

### Test 2: End-to-End via WhatsApp
Send a text message from any WhatsApp account (except groups) to the WhatsApp number running the agent:
> **User:** "Tolong matiin lampu ruang tamu"

**Execution Flow:**
1.  WhatsApp Client receives message.
2.  Client forwards to local Ollama.
3.  Ollama returns parsed output: `{"valid": true, "device": "lampu_ruang_tamu", "action": "off"}`.
4.  Hono broadcasts this payload via WebSocket.
5.  ESP32 receives payload, changes GPIO 10 to `HIGH` (turns off active-low relay) and sets onboard LED to `HIGH` (turns off).
6.  WhatsApp Agent replies: *"Baik, perintah dimengerti. Sedang mematikan lampu ruang tamu..."*
