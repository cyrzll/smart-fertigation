/**
 * BLE Service for ESP32 Smart Fertigation
 * Handles Web Bluetooth API connections, notifications, and commands
 */

export const BLE_CONFIG = {
  DEVICE_NAME_PREFIX: 'ESP',
  SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  RX_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8', // Web writes to ESP32
  TX_UUID: '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e', // ESP32 notifies Web
};

class BleService {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.rxChar = null;
    this.txChar = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.rxBuffer = '';
    this.decoder = new TextDecoder();
    this.encoder = new TextEncoder();
    this.lastStatus = null;
    this.logs = [];
    this._boundHandleDisconnection = this.handleDisconnection.bind(this);
    this._boundHandleNotification = this.handleNotification.bind(this);
  }

  /**
   * Check if Web Bluetooth is supported in the current browser environment
   */
  isSupported() {
    return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
  }

  /**
   * Check if GATT is actively connected
   */
  isGattConnected() {
    return Boolean(this.isConnected && this.device && this.device.gatt && this.device.gatt.connected);
  }

  /**
   * Get device name
   */
  getDeviceName() {
    return this.device?.name || '';
  }

  /**
   * Get last known status
   */
  getLastStatus() {
    return this.lastStatus;
  }

  /**
   * Get persistent log history
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Subscribe to BLE events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from BLE events
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in BLE event callback for ${event}:`, err);
        }
      });
    }
  }

  /**
   * Log message to subscribers
   */
  log(direction, text, isRaw = false) {
    const logEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      direction, // 'TX', 'RX', 'SYS', 'ERR'
      text,
      isRaw,
    };
    this.logs.push(logEntry);
    if (this.logs.length > 150) {
      this.logs.shift();
    }
    this.emit('log', logEntry);
  }

  /**
   * Scan and connect to ESP32 BLE device
   */
  async connect() {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth tidak didukung pada browser ini. Gunakan Google Chrome, Microsoft Edge, atau browser berbasis Chromium melalui HTTPS / localhost.');
    }

    try {
      this.log('SYS', 'Membuka dialog pemindaian Bluetooth...');

      // Request device with service filter or prefix
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: BLE_CONFIG.DEVICE_NAME_PREFIX },
          { name: 'ESP32-Fertigation' }
        ],
        optionalServices: [BLE_CONFIG.SERVICE_UUID],
      });

      this.log('SYS', `Perangkat dipilih: ${this.device.name} (${this.device.id})`);

      // Add disconnect event listener safely
      this.device.removeEventListener('gattserverdisconnected', this._boundHandleDisconnection);
      this.device.addEventListener('gattserverdisconnected', this._boundHandleDisconnection);

      // Connect to GATT Server
      this.log('SYS', 'Menghubungkan ke GATT Server ESP32...');
      this.server = await this.device.gatt.connect();

      // Get Primary Service
      this.log('SYS', `Mengambil GATT Service [${BLE_CONFIG.SERVICE_UUID}]...`);
      this.service = await this.server.getPrimaryService(BLE_CONFIG.SERVICE_UUID);

      // Get RX Characteristic (Write)
      this.rxChar = await this.service.getCharacteristic(BLE_CONFIG.RX_UUID);

      // Get TX Characteristic (Notify)
      this.txChar = await this.service.getCharacteristic(BLE_CONFIG.TX_UUID);

      // Enable Notifications
      this.log('SYS', 'Mengaktifkan notifikasi data TX...');
      await this.txChar.startNotifications();
      this.txChar.removeEventListener('characteristicvaluechanged', this._boundHandleNotification);
      this.txChar.addEventListener('characteristicvaluechanged', this._boundHandleNotification);

      this.isConnected = true;
      this.emit('connection_change', {
        connected: true,
        deviceName: this.device.name || 'ESP32 Device',
        deviceId: this.device.id,
      });

      this.log('SYS', 'Koneksi Bluetooth Berhasil Terhubung!');

      // Request initial status
      await this.requestStatus();

      return {
        success: true,
        deviceName: this.device.name,
      };
    } catch (error) {
      this.isConnected = false;
      this.log('ERR', `Gagal menghubungkan Bluetooth: ${error.message}`);
      this.emit('connection_change', { connected: false, error: error.message });
      throw error;
    }
  }

  /**
   * Handle incoming BLE notifications
   */
  handleNotification(event) {
    const value = event.target.value;
    const chunk = this.decoder.decode(value);
    this.rxBuffer += chunk;

    // Check if buffer contains a complete newline delimited packet
    if (this.rxBuffer.includes('\n')) {
      const packets = this.rxBuffer.split('\n');
      // The last part is either empty or an incomplete next packet
      this.rxBuffer = packets.pop() || '';

      packets.forEach((rawPacket) => {
        const trimmed = rawPacket.trim();
        if (!trimmed) return;

        this.log('RX', trimmed);

        try {
          const data = JSON.parse(trimmed);
          this.dispatchIncomingPacket(data);
        } catch {
          console.warn('Non-JSON packet received:', trimmed);
        }
      });
    }
  }

  /**
   * Dispatch parsed JSON packet to specific event listeners
   */
  dispatchIncomingPacket(data) {
    const type = data.type;
    if (!type) return;

    switch (type) {
      case 'STATUS':
        this.lastStatus = data;
        this.emit('status', data);
        break;
      case 'WIFI_SCAN_RESULT':
        this.emit('wifi_scan', data);
        break;
      case 'WIFI_CONNECTING':
        this.emit('wifi_connecting', data);
        break;
      case 'WIFI_CONNECT_RESULT':
        this.emit('wifi_connect_result', data);
        break;
      case 'WIFI_DISCONNECT_RESULT':
        this.emit('wifi_disconnect_result', data);
        break;
      case 'WIFI_RESET_RESULT':
        this.emit('wifi_reset_result', data);
        break;
      case 'AUTH_RESET_RESULT':
      case 'AUTH_SET_RESULT':
        this.emit('auth_result', data);
        break;
      case 'LED_TEST_RESULT':
        this.emit('led_result', data);
        break;
      case 'VALVE_RESULT':
        this.emit('valve_result', data);
        break;
      case 'RESTART_RESULT':
        this.emit('restart_result', data);
        break;
      case 'API_SET_RESULT':
      case 'API_RESET_RESULT':
        this.emit('api_result', data);
        break;
      case 'TDS_CALIBRATE_RESULT':
        this.emit('tds_calibrate_result', data);
        break;
      default:
        this.emit('message', data);
        break;
    }
  }

  /**
   * Reconnect to the previously selected device without re-opening device picker
   */
  async reconnect() {
    if (!this.device) {
      throw new Error('Belum ada perangkat yang pernah dipilih.');
    }

    try {
      this.log('SYS', 'Mencoba menyambungkan kembali Bluetooth...');
      this.device.removeEventListener('gattserverdisconnected', this._boundHandleDisconnection);
      this.device.addEventListener('gattserverdisconnected', this._boundHandleDisconnection);

      this.server = await this.device.gatt.connect();
      this.service = await this.server.getPrimaryService(BLE_CONFIG.SERVICE_UUID);
      this.rxChar = await this.service.getCharacteristic(BLE_CONFIG.RX_UUID);
      this.txChar = await this.service.getCharacteristic(BLE_CONFIG.TX_UUID);
      await this.txChar.startNotifications();
      this.txChar.removeEventListener('characteristicvaluechanged', this._boundHandleNotification);
      this.txChar.addEventListener('characteristicvaluechanged', this._boundHandleNotification);

      this.isConnected = true;
      this.emit('connection_change', {
        connected: true,
        deviceName: this.device.name || 'ESP32 Device',
        deviceId: this.device.id,
      });

      this.log('SYS', 'Koneksi Bluetooth berhasil dipulihkan!');
      await this.requestStatus();
      return true;
    } catch (err) {
      this.isConnected = false;
      this.log('ERR', `Gagal reconnect Bluetooth: ${err.message}`);
      this.emit('connection_change', { connected: false, error: err.message });
      throw err;
    }
  }

  /**
   * Try auto-reconnect using existing device or permitted devices in browser
   */
  async tryAutoReconnect() {
    if (this.isGattConnected()) {
      return true;
    }

    if (this.device) {
      try {
        await this.reconnect();
        return true;
      } catch (e) {
        console.warn('Auto reconnect with cached device failed:', e);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.bluetooth && navigator.bluetooth.getDevices) {
      try {
        const devices = await navigator.bluetooth.getDevices();
        if (devices && devices.length > 0) {
          const espDevice = devices.find(d => 
            d.name?.startsWith(BLE_CONFIG.DEVICE_NAME_PREFIX) || 
            d.name?.includes('Fertigation') ||
            d.name?.includes('ESP')
          ) || devices[0];

          if (espDevice) {
            this.device = espDevice;
            await this.reconnect();
            return true;
          }
        }
      } catch (err) {
        console.warn('Auto reconnect via getDevices failed:', err);
      }
    }
    return false;
  }

  /**
   * Handle unexpected disconnection
   */
  handleDisconnection() {
    this.isConnected = false;
    this.rxBuffer = '';
    this.log('SYS', 'Perangkat Bluetooth terputus.');
    this.emit('connection_change', { connected: false });
  }

  /**
   * Disconnect cleanly
   */
  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.log('SYS', 'Memutuskan koneksi Bluetooth...');
      await this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.rxBuffer = '';
    this.emit('connection_change', { connected: false });
  }

  /**
   * Send JSON command to ESP32
   */
  async sendCommand(commandObj) {
    if (!this.isConnected || !this.rxChar) {
      throw new Error('Tidak ada perangkat ESP32 yang terhubung via Bluetooth.');
    }

    try {
      const jsonStr = JSON.stringify(commandObj);
      const data = this.encoder.encode(jsonStr);

      // Write with response if supported, with fallback to writeValueWithoutResponse
      try {
        if (this.rxChar.writeValueWithResponse) {
          await this.rxChar.writeValueWithResponse(data);
        } else {
          await this.rxChar.writeValue(data);
        }
      } catch (writeErr) {
        if (this.rxChar.writeValueWithoutResponse) {
          await this.rxChar.writeValueWithoutResponse(data);
        } else if (this.rxChar.writeValue) {
          await this.rxChar.writeValue(data);
        } else {
          throw writeErr;
        }
      }

      return true;
    } catch (err) {
      this.log('ERR', `Gagal mengirim command: ${err.message}`);
      throw err;
    }
  }

  // --- Shortcut Command APIs ---

  /** Request full device status */
  async requestStatus() {
    return this.sendCommand({ cmd: 'GET_STATUS' });
  }

  /** Scan available Wi-Fi networks */
  async scanWifi() {
    return this.sendCommand({ cmd: 'SCAN_WIFI' });
  }

  /** Connect to a Wi-Fi network */
  async connectWifi(ssid, password) {
    return this.sendCommand({
      cmd: 'CONNECT_WIFI',
      ssid,
      password: password || '',
    });
  }

  /** Disconnect current Wi-Fi */
  async disconnectWifi() {
    return this.sendCommand({ cmd: 'DISCONNECT_WIFI' });
  }

  /** Reset/Erase saved Wi-Fi credentials */
  async resetWifi() {
    return this.sendCommand({ cmd: 'RESET_WIFI' });
  }

  /** Reset auth_code */
  async resetAuth() {
    return this.sendCommand({ cmd: 'RESET_AUTH' });
  }

  /** Set new auth_code */
  async setAuth(authCode) {
    return this.sendCommand({ cmd: 'SET_AUTH', auth_code: authCode });
  }

  /** Blink Confirmation LED */
  async testLed(times = 3) {
    return this.sendCommand({ cmd: 'TEST_LED', times });
  }

  /** Control Valve Relay */
  async controlValve(gpio, action, duration = 0) {
    return this.sendCommand({
      cmd: 'VALVE_CONTROL',
      gpio,
      action, // 'OPEN' or 'CLOSE'
      duration,
    });
  }

  /** Restart ESP32 */
  async restartDevice() {
    return this.sendCommand({ cmd: 'RESTART' });
  }

  /** Set API URL (host + port) */
  async setApiUrl(host, port) {
    return this.sendCommand({
      cmd: 'SET_API',
      host,
      port: Number(port),
    });
  }

  /** Reset API URL to default */
  async resetApiUrl() {
    return this.sendCommand({ cmd: 'RESET_API' });
  }

  /** Calibrate TDS Sensor using standard PPM solution (e.g. 1382 PPM) */
  async calibrateTds(standardPpm = 1382) {
    return this.sendCommand({
      cmd: 'CALIBRATE_TDS',
      standard_ppm: Number(standardPpm),
    });
  }

  /** Set TDS Calibration Factor manually */
  async setTdsFactor(factor = 1.0) {
    return this.sendCommand({
      cmd: 'SET_TDS_FACTOR',
      factor: Number(factor),
    });
  }

  /** Reset TDS Calibration Factor to 1.0 */
  async resetTdsCal() {
    return this.sendCommand({ cmd: 'RESET_TDS_CAL' });
  }
}

// Singleton Instance
export const bleService = new BleService();
