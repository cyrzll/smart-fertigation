# Firmware OTA

Letakkan hasil kompilasi ESP32 dengan nama `firmware.bin` di direktori ini, lalu
ubah `version`, catatan rilis, dan tanggal pada `firmware.json`.

Set `FIRMWARE_PUBLIC_BASE_URL=https://domain-anda` pada API apabila API berada di
belakang reverse proxy. URL tersebut harus dapat diakses langsung oleh ESP32.

Endpoint publik:

- `GET /api/firmware/update?current_version=v2.6.0-BLE-OTA`
- `GET /api/firmware`

## Compiler pada server

Endpoint admin `POST /api/firmware/publish` menjalankan `arduino-cli` secara
langsung tanpa shell. Server deployment harus menyediakan:

- `arduino-cli` (atau set `ARDUINO_CLI_PATH` ke lokasi executable)
- ESP32 Arduino core
- Library `WiFiManager`, `WebSockets`, dan `ArduinoJson`

Board dapat dikonfigurasi melalui environment variable, misalnya:

```env
ESP32_FQBN=esp32:esp32:esp32
ARDUINO_CLI_PATH=/usr/local/bin/arduino-cli
FIRMWARE_PUBLIC_BASE_URL=https://api.domain-anda.com
```

Source yang berhasil dibangun disimpan sebagai `firmware.ino`, sedangkan hasil
OTA diterbitkan sebagai `firmware.bin`. Apabila compile gagal, firmware aktif
tidak diganti.
