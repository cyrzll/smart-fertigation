import { useState, useEffect, useCallback } from 'react';
import {
  Bluetooth,
  Wifi,
  Activity,
  Terminal,
  RefreshCw,
  HelpCircle,
  Sliders,
  Download,
} from 'lucide-react';
import { bleService } from '../../services/bleService';
import { DeviceOverview } from './DeviceOverview';
import { WifiManager } from './WifiManager';
import { BleConsole } from './BleConsole';
import { ToastContainer } from './Toast';
import { FirmwareUpdater } from './FirmwareUpdater';

export function App({ embedded = false }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [isSupported] = useState(() => bleService.isSupported());

  // Active Tab
  const [activeTab, setActiveTab] = useState('wifi'); // 'wifi', 'console'

  // ESP32 Status State
  const [status, setStatus] = useState({
    device_code: 'ESP-FERTIGASI-01',
    serial_code: 'tes123',
    firmware: 'v2.2.0-BLE-WebSocket-Hybrid',
    auth_code: '',
    is_authenticated: false,
    wifi_status: 'DISCONNECTED',
    ssid: '-',
    ip: '0.0.0.0',
    gateway: '-',
    mac: '-',
    rssi: 0,
    ws_status: 'DISCONNECTED',
    api_host: 'api.tirtaruna.site',
    api_port: 443,
    uptime_sec: 0,
    free_heap: 0,
    valves: { valve1: false, valve2: false },
    sensors: {
      suhu: 29.4,
      kelembaban: 76.0,
      media: 63.0,
      level_air: 72.0,
      ec: 1.8,
      ph: 6.2,
    },
  });

  // Wi-Fi Scanner & Operations State
  const [scanResults, setScanResults] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnectingWifi, setIsConnectingWifi] = useState(false);

  // Terminal & BLE Packet Logs
  const [logs, setLogs] = useState([]);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [otaState, setOtaState] = useState({ updating: false, progress: 0, message: '' });

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, title = '') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize Subscriptions
  useEffect(() => {
    // 1. Connection change listener
    const unsubConn = bleService.on('connection_change', (data) => {
      if (data.connected) {
        setIsConnected(true);
        setDeviceName(data.deviceName || 'ESP32 Device');
        addToast('success', `Berhasil terhubung ke ${data.deviceName || 'ESP32'} via Bluetooth!`, 'Koneksi Berhasil');
      } else {
        setIsConnected(false);
        setDeviceName('');
        if (data.error) {
          addToast('error', data.error, 'Koneksi Gagal');
        } else {
          addToast('info', 'Koneksi Bluetooth dengan ESP32 terputus.', 'Perangkat Terputus');
        }
      }
    });

    // 2. Status update listener
    const unsubStatus = bleService.on('status', (data) => {
      setStatus((prev) => ({
        ...prev,
        ...data,
        valves: data.valves || prev.valves,
        sensors: data.sensors || prev.sensors,
      }));
    });

    // 3. Wi-Fi Scan listener
    const unsubScan = bleService.on('wifi_scan', (data) => {
      setIsScanning(false);
      setScanResults(data.networks || []);
      addToast('success', `Ditemukan ${data.count || 0} jaringan Wi-Fi sekitar.`, 'Pemindaian Selesai');
    });

    // 4. Wi-Fi Connecting progress
    const unsubWifiConnecting = bleService.on('wifi_connecting', () => {
      setIsConnectingWifi(true);
    });

    // 5. Wi-Fi Connect result
    const unsubWifiResult = bleService.on('wifi_connect_result', (data) => {
      setIsConnectingWifi(false);
      if (data.success) {
        addToast('success', `Berhasil terhubung ke Wi-Fi ${data.ssid}! IP: ${data.ip}`, 'Wi-Fi Terhubung');
      } else {
        addToast('error', data.message || 'Gagal terhubung ke Wi-Fi', 'Koneksi Wi-Fi Gagal');
      }
    });

    // 6. Wi-Fi Disconnect result
    const unsubWifiDis = bleService.on('wifi_disconnect_result', (data) => {
      addToast('info', data.message || 'Wi-Fi diputuskan.', 'Wi-Fi Terputus');
    });

    // 7. Wi-Fi Reset result
    const unsubWifiReset = bleService.on('wifi_reset_result', (data) => {
      addToast('warning', data.message || 'Kredensial Wi-Fi telah dihapus.', 'Reset Berhasil');
    });

    // 8. Auth result
    const unsubAuth = bleService.on('auth_result', (data) => {
      addToast('success', data.message || 'Pengaturan Auth berhasil diperbarui.', 'Autentikasi');
    });

    // 9. LED Test result
    const unsubLed = bleService.on('led_result', (data) => {
      addToast('info', `Lampu berkedip ${data.times} kali.`, 'Tes Lampu Selesai');
    });

    // 10. Valve result
    const unsubValve = bleService.on('valve_result', (data) => {
      addToast('info', `Valve berhasil ${data.action === 'OPEN' ? 'dibuka' : 'ditutup'}.`, 'Kontrol Valve');
    });

    // 11. Restart result
    const unsubRestart = bleService.on('restart_result', () => {
      addToast('warning', 'ESP32 sedang melakukan reboot ulang sistem.', 'Restarting Device');
    });

    // 12. API URL Config result
    const unsubApi = bleService.on('api_result', (data) => {
      addToast('success', data.message || 'URL API berhasil diperbarui.', 'Konfigurasi API');
    });

    const unsubOtaStatus = bleService.on('ota_status', (data) => {
      setOtaState((prev) => ({ ...prev, updating: Boolean(data.ota_in_progress), progress: data.progress || prev.progress, message: data.message || '' }));
    });

    const unsubOtaProgress = bleService.on('ota_progress', (data) => {
      setOtaState({ updating: true, progress: data.progress || 0, message: data.message || 'Memasang firmware...' });
    });

    const unsubOtaResult = bleService.on('ota_result', (data) => {
      setOtaState({ updating: false, progress: data.success ? 100 : 0, message: data.message || '' });
      addToast(data.success ? 'success' : 'error', data.message || 'Proses OTA selesai.', data.success ? 'Pembaruan Berhasil' : 'Pembaruan Gagal');
    });

    // 13. Packet Logs listener
    const unsubLog = bleService.on('log', (logEntry) => {
      setLogs((prev) => [...prev.slice(-120), logEntry]);
    });

    return () => {
      unsubConn();
      unsubStatus();
      unsubScan();
      unsubWifiConnecting();
      unsubWifiResult();
      unsubWifiDis();
      unsubWifiReset();
      unsubAuth();
      unsubLed();
      unsubValve();
      unsubRestart();
      unsubApi();
      unsubOtaStatus();
      unsubOtaProgress();
      unsubOtaResult();
      unsubLog();
    };
  }, [addToast]);

  // Connect BLE Handler
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await bleService.connect();
    } catch (err) {
      console.error('BLE connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect BLE Handler
  const handleDisconnect = async () => {
    await bleService.disconnect();
  };

  // Refresh Status
  const handleRefreshStatus = async () => {
    if (!isConnected) return;
    try {
      await bleService.requestStatus();
      addToast('info', 'Meminta pembaruan status terbaru dari ESP32...', 'Status Diperbarui');
    } catch (e) {
      addToast('error', 'Gagal memperbarui status: ' + e.message);
    }
  };

  // Scan Wi-Fi
  const handleScanWifi = async () => {
    if (!isConnected) return;
    setIsScanning(true);
    try {
      await bleService.scanWifi();
      setTimeout(() => {
        setIsScanning(false);
      }, 7500);
    } catch (e) {
      setIsScanning(false);
      addToast('error', 'Gagal memindai Wi-Fi: ' + e.message);
    }
  };

  // Connect to Wi-Fi
  const handleConnectWifi = async (ssid, pass) => {
    if (!isConnected) return;
    setIsConnectingWifi(true);
    try {
      await bleService.connectWifi(ssid, pass);
    } catch (e) {
      setIsConnectingWifi(false);
      addToast('error', 'Gagal mengirim perintah Wi-Fi: ' + e.message);
    }
  };

  // Disconnect Wi-Fi
  const handleDisconnectWifi = async () => {
    if (!isConnected) return;
    try {
      await bleService.disconnectWifi();
    } catch (e) {
      addToast('error', 'Gagal memutus Wi-Fi: ' + e.message);
    }
  };

  // Reset Wi-Fi
  const handleResetWifi = async () => {
    if (!isConnected) return;
    try {
      await bleService.resetWifi();
    } catch (e) {
      addToast('error', 'Gagal mereset Wi-Fi: ' + e.message);
    }
  };

  // Test LED
  const handleTestLed = async (times) => {
    if (!isConnected) return;
    try {
      await bleService.testLed(times);
    } catch (e) {
      addToast('error', 'Gagal menguji LED: ' + e.message);
    }
  };

  // Set Auth Code
  const handleSetAuth = async (code) => {
    if (!isConnected) return;
    try {
      await bleService.setAuth(code);
    } catch (e) {
      addToast('error', 'Gagal menyimpan Auth Code: ' + e.message);
    }
  };

  // Reset Auth Code
  const handleResetAuth = async () => {
    if (!isConnected) return;
    try {
      await bleService.resetAuth();
    } catch (e) {
      addToast('error', 'Gagal mereset Auth Code: ' + e.message);
    }
  };

  // Set API URL
  const handleSetApi = async (host, port) => {
    if (!isConnected) return;
    try {
      await bleService.setApiUrl(host, port);
    } catch (e) {
      addToast('error', 'Gagal mengubah URL API: ' + e.message);
    }
  };

  // Reset API URL
  const handleResetApi = async () => {
    if (!isConnected) return;
    try {
      await bleService.resetApiUrl();
    } catch (e) {
      addToast('error', 'Gagal mereset URL API: ' + e.message);
    }
  };

  // Restart ESP32
  const handleRestart = async () => {
    if (!isConnected) return;
    try {
      await bleService.restartDevice();
    } catch (e) {
      addToast('error', 'Gagal restart ESP32: ' + e.message);
    }
  };

  const handleCheckUpdate = async () => {
    if (!isConnected) return;
    setIsCheckingUpdate(true);
    try {
      const response = await fetch(`/api/firmware/update?current_version=${encodeURIComponent(status.firmware || '')}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Firmware belum tersedia di server.');
      setUpdateInfo(data);
      await bleService.requestOtaStatus();
      if (data.firmware_available === false) {
        addToast('warning', 'Metadata ditemukan, tetapi file firmware belum di-compile dan diterbitkan admin.', 'Firmware Belum Tersedia');
      } else {
        addToast(data.update_available ? 'warning' : 'success', data.update_available ? `Firmware ${data.latest_version} tersedia.` : 'Firmware sudah versi terbaru.', 'Pemeriksaan Selesai');
      }
    } catch (e) {
      addToast('error', `Gagal memeriksa pembaruan: ${e.message}`, 'Pemeriksaan Gagal');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!isConnected || !updateInfo?.update_available) return;
    try {
      setOtaState({ updating: true, progress: 0, message: 'Mengirim perintah update ke ESP32...' });
      await bleService.updateFirmware(updateInfo);
    } catch (e) {
      setOtaState({ updating: false, progress: 0, message: e.message });
      addToast('error', `Gagal memulai pembaruan: ${e.message}`, 'Pembaruan Gagal');
    }
  };

  // Send raw command
  const handleSendCommand = async (cmdObj) => {
    if (!isConnected) return;
    try {
      await bleService.sendCommand(cmdObj);
    } catch (e) {
      addToast('error', 'Gagal mengirim command: ' + e.message);
    }
  };

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} flex flex-col bg-[#FAFAF7] text-[#2D3B2D] selection:bg-[#7BAF5A]/20 selection:text-[#3A6B2A]`}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Top Navbar */}
      {embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-[#2D3B2D]">Konfigurasi ESP32 via Bluetooth</h3>
            <p className="text-xs text-[#8A9B7A] mt-0.5">Atur Wi-Fi, server, autentikasi, dan diagnostik perangkat langsung dari dashboard.</p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <button onClick={handleRefreshStatus} className="px-3 py-2 rounded-xl border border-[#C8D9B0] text-xs font-semibold text-[#5A6B5A] hover:bg-[#F0F4EA]">
                Segarkan Status
              </button>
            )}
            <button
              onClick={isConnected ? handleDisconnect : handleConnect}
              disabled={isConnecting || !isSupported}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition disabled:opacity-50 ${isConnected ? 'bg-red-50 border-red-200 text-red-600' : 'bg-[#7BAF5A] border-[#7BAF5A] text-white'}`}
            >
              {isConnecting ? 'Menghubungkan...' : isConnected ? 'Putuskan Bluetooth' : 'Hubungkan Bluetooth'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto ${embedded ? '' : 'px-4 sm:px-6 lg:px-8 py-8'}`}>
        {!isConnected ? (
          /* ===================================================================
             UNCONNECTED STATE: Hero & Bluetooth Pairing Card
             =================================================================== */
          <div className={`max-w-3xl mx-auto ${embedded ? 'my-2 space-y-4' : 'my-6 space-y-8'}`}>
            <div className={`bg-white border border-[#D4DFC8] relative overflow-hidden shadow-xs ${embedded ? 'rounded-2xl p-5 sm:p-7' : 'rounded-3xl p-8 sm:p-12'} text-center`}>
              <div className={`relative z-10 ${embedded ? 'space-y-4' : 'space-y-6'}`}>
                {/* Glowing Bluetooth Radar Pulse Icon */}
                <div className={`relative mx-auto flex items-center justify-center ${embedded ? 'w-16 h-16' : 'w-24 h-24'}`}>
                  <div className="absolute inset-0 rounded-full bg-[#7BAF5A]/15 animate-radar pointer-events-none" />
                  <div className={`relative rounded-2xl bg-[#E8F2DF] border border-[#C8D9B0] flex items-center justify-center shadow-xs ${embedded ? 'w-14 h-14' : 'w-20 h-20'}`}>
                    <Bluetooth className={`${embedded ? 'w-7 h-7' : 'w-10 h-10'} text-[#7BAF5A]`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className={`${embedded ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-extrabold text-[#2D3B2D] tracking-tight`}>
                    Hubungkan ke ESP32 Fertigasi
                  </h2>
                  <p className="text-sm text-[#8A9B7A] max-w-lg mx-auto leading-relaxed">
                    Hubungkan perangkat ke Wi-Fi dan kelola sistem fertigasi dengan mudah.
                  </p>
                </div>

                {/* Connect CTA Button */}
                <div className="pt-2">
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || !isSupported}
                    className={`inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white font-bold shadow-sm shadow-[#7BAF5A]/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer ${embedded ? 'px-5 py-3 text-sm' : 'px-8 py-4 text-base'}`}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Mencari & Menyambungkan...</span>
                      </>
                    ) : (
                      <>
                        <Bluetooth className="w-5 h-5" />
                        <span>Pindai & Sambungkan Bluetooth</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-3 ${embedded ? 'gap-2.5' : 'gap-4'}`}>
              <div className={`bg-white border border-[#D4DFC8] rounded-2xl shadow-2xs flex items-start ${embedded ? 'p-3.5 gap-2.5' : 'p-5 gap-3.5'}`}>
                <div className="p-2.5 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0] shrink-0">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D3B2D] mb-1">Pengaturan Wi-Fi</h3>
                  <p className="text-xs text-[#8A9B7A] leading-relaxed">
                    Pilih jaringan dan masukkan kata sandi Wi-Fi perangkat.
                  </p>
                </div>
              </div>

              <div className={`bg-white border border-[#D4DFC8] rounded-2xl shadow-2xs flex items-start ${embedded ? 'p-3.5 gap-2.5' : 'p-5 gap-3.5'}`}>
                <div className="p-2.5 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0] shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D3B2D] mb-1">Data Sensor</h3>
                  <p className="text-xs text-[#8A9B7A] leading-relaxed">
                    Pantau suhu, kelembapan, kondisi media, level air, EC, dan pH.
                  </p>
                </div>
              </div>

              <div className={`bg-white border border-[#D4DFC8] rounded-2xl shadow-2xs flex items-start ${embedded ? 'p-3.5 gap-2.5' : 'p-5 gap-3.5'}`}>
                <div className="p-2.5 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0] shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D3B2D] mb-1">Kontrol Fertigasi</h3>
                  <p className="text-xs text-[#8A9B7A] leading-relaxed">
                    Buka atau tutup valve dan uji lampu indikator perangkat.
                  </p>
                </div>
              </div>
            </div>

            {/* Browser Requirement Notice */}
            <div className="rounded-2xl p-4 bg-[#F0F4EA] border border-[#D4DFC8] flex items-center justify-between text-xs text-[#5A6B5A]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7BAF5A] shrink-0" />
                <span>Membutuhkan Google Chrome, Microsoft Edge, atau browser Chromium dengan Bluetooth aktif.</span>
              </div>
            </div>
          </div>
        ) : (
          /* ===================================================================
             CONNECTED STATE: Full Interactive Dashboard
             =================================================================== */
          <div className="space-y-6">
            {/* Device Overview Card (System, RAM, Auth, Blink Test, API Config) */}
            <DeviceOverview
              status={status}
              isConnected={isConnected}
              onTestLed={handleTestLed}
              onRestart={handleRestart}
              onRefresh={handleRefreshStatus}
              onResetAuth={handleResetAuth}
              onSetAuth={handleSetAuth}
              onSetApi={handleSetApi}
              onResetApi={handleResetApi}
            />

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-[#D4DFC8] pb-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('wifi')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'wifi'
                    ? 'bg-[#7BAF5A] text-white shadow-xs'
                    : 'bg-white border border-[#D4DFC8] text-[#5A6B5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA]'
                }`}
              >
                <Wifi className="w-4 h-4" />
                <span>Pengaturan Wi-Fi</span>
              </button>

              <button
                onClick={() => setActiveTab('firmware')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'firmware'
                    ? 'bg-[#7BAF5A] text-white shadow-xs'
                    : 'bg-white border border-[#D4DFC8] text-[#5A6B5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA]'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Firmware</span>
              </button>

              <button
                onClick={() => setActiveTab('console')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'console'
                    ? 'bg-[#7BAF5A] text-white shadow-xs'
                    : 'bg-white border border-[#D4DFC8] text-[#5A6B5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA]'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Diagnostik</span>
                {logs.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                    activeTab === 'console' ? 'bg-white/20 text-white' : 'bg-[#E8EDE0] text-[#5A6B5A]'
                  }`}>
                    {logs.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'wifi' && (
              <WifiManager
                status={status}
                scanResults={scanResults}
                isScanning={isScanning}
                isConnectingWifi={isConnectingWifi}
                onScanWifi={handleScanWifi}
                onConnectWifi={handleConnectWifi}
                onDisconnectWifi={handleDisconnectWifi}
                onResetWifi={handleResetWifi}
              />
            )}

            {activeTab === 'firmware' && (
              <FirmwareUpdater
                status={status}
                updateInfo={updateInfo}
                isChecking={isCheckingUpdate}
                otaState={otaState}
                onCheck={handleCheckUpdate}
                onInstall={handleInstallUpdate}
              />
            )}



            {activeTab === 'console' && (
              <BleConsole
                logs={logs}
                onSendCommand={handleSendCommand}
                onClearLogs={() => setLogs([])}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      {!embedded && <footer className="border-t border-[#D4DFC8] bg-white/60 py-4 text-center text-xs text-[#8A9B7A]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart Fertigation</span>
        </div>
      </footer>}
    </div>
  );
}

export default App;
