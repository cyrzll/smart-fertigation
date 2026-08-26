import { useState } from 'react';
import {
  Cpu,
  Clock,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Zap,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Server,
  Globe,
} from 'lucide-react';

export function DeviceOverview({
  status,
  isConnected,
  onTestLed,
  onRestart,
  onRefresh,
  onResetAuth,
  onSetAuth,
  onSetApi,
  onResetApi,
}) {
  const [blinkCount, setBlinkCount] = useState(3);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [customAuth, setCustomAuth] = useState('');

  // API Modal State
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiHost, setApiHost] = useState(status.api_host || 'api.tirtaruna.site');
  const [apiPort, setApiPort] = useState(status.api_port || 443);

  if (!isConnected) {
    return null;
  }

  // Format uptime in seconds to human readable string
  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return '-';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}j ${mins}m ${secs}d`;
    if (mins > 0) return `${mins}m ${secs}d`;
    return `${secs} detik`;
  };

  const formatMemory = (bytes) => {
    if (!bytes) return '-';
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleBlink = async () => {
    setIsBlinking(true);
    try {
      await onTestLed(Number(blinkCount));
    } finally {
      setTimeout(() => setIsBlinking(false), blinkCount * 800 + 500);
    }
  };

  const handleRestart = async () => {
    if (window.confirm('Apakah Anda yakin ingin me-restart perangkat ESP32 ini?')) {
      setIsRestarting(true);
      await onRestart();
      setTimeout(() => setIsRestarting(false), 3000);
    }
  };

  const handleSaveAuth = async (e) => {
    e.preventDefault();
    if (!customAuth.trim()) return;
    await onSetAuth(customAuth.trim());
    setShowAuthModal(false);
    setCustomAuth('');
  };

  const handleOpenApiModal = () => {
    setApiHost(status.api_host || 'api.tirtaruna.site');
    setApiPort(status.api_port || 443);
    setShowApiModal(true);
  };

  const handleSaveApi = async (e) => {
    e.preventDefault();
    if (!apiHost.trim()) return;
    await onSetApi(apiHost.trim(), Number(apiPort) || 443);
    setShowApiModal(false);
  };

  const handleResetApi = async () => {
    if (window.confirm('Kembalikan URL API WebSocket ke default (api.tirtaruna.site:443)?')) {
      await onResetApi();
      setShowApiModal(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-[#D4DFC8] rounded-xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0] shrink-0">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[#2D3B2D] flex items-center gap-2 flex-wrap">
              <span className="truncate">{status.device_code || 'ESP32 Device'}</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-[#F0F4EA] text-[#5A6B5A] font-mono border border-[#D4DFC8] shrink-0">
                {status.serial_code || 'SN-UNKNOWN'}
              </span>
            </h2>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[#8A9B7A] mt-0.5 truncate flex-wrap">
              <span>Firmware: <span className="font-mono text-[#5A6B5A]">{status.firmware || 'v2.2.0'}</span></span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-[#5A6B5A]">
                <Server className="w-3 h-3 text-[#7BAF5A]" />
                API: {status.api_host || '192.168.1.4'}:{status.api_port || 3001}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <button
            onClick={handleOpenApiModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#E8F2DF] border border-[#C8D9B0] text-[#3A6B2A] hover:bg-[#D8EAC9] transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#7BAF5A]" />
            <span>Ganti URL API</span>
          </button>
          <button
            onClick={onRefresh}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-white border border-[#C8D9B0] text-[#5A6B5A] hover:border-[#7BAF5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA] transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
          <button
            onClick={handleRestart}
            disabled={isRestarting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
            <span>Reboot ESP</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Auth Status */}
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[#8A9B7A] mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-medium">Autentikasi Server</span>
            {status.is_authenticated ? (
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7BAF5A]" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {status.is_authenticated ? (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md sm:rounded-lg bg-[#E8F2DF] text-[#3A6B2A] border border-[#C8D9B0] truncate">
                  <CheckCircle2 className="w-3 h-3 shrink-0" /> Terverifikasi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md sm:rounded-lg bg-amber-50 text-amber-700 border border-amber-200 truncate">
                  Belum Dipairing
                </span>
              )}
            </div>
            {status.auth_code ? (
              <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[#8A9B7A] min-w-0">
                <span className="truncate text-[#5A6B5A]" title={status.auth_code}>Key: {status.auth_code}</span>
                <button
                  onClick={onResetAuth}
                  title="Hapus Key Auth"
                  className="text-red-500 hover:text-red-700 ml-1 p-0.5 rounded hover:bg-red-50 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-[10px] sm:text-[11px] text-[#3A6B2A] hover:text-[#7BAF5A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" /> Pasang Key
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Uptime */}
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[#8A9B7A] mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-medium">Waktu Aktif</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7BAF5A]" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-[#2D3B2D] font-mono truncate">
              {formatUptime(status.uptime_sec)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#8A9B7A] mt-0.5">Sejak boot</div>
          </div>
        </div>

        {/* Card 3: Free Memory */}
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[#8A9B7A] mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-medium">Free SRAM</span>
            <HardDrive className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7BAF5A]" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-[#2D3B2D] font-mono">
              {formatMemory(status.free_heap)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#8A9B7A] mt-0.5">Sisa RAM</div>
          </div>
        </div>

        {/* Card 4: Hardware Test LED */}
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#8A9B7A] mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-medium">Test LED (GPIO 2/4)</span>
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
            <select
              value={blinkCount}
              onChange={(e) => setBlinkCount(e.target.value)}
              className="bg-[#F9FAF6] border border-[#D4DFC8] text-[#2D3B2D] text-[11px] sm:text-xs rounded-lg sm:rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#7BAF5A] font-mono cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
            <button
              onClick={handleBlink}
              disabled={isBlinking}
              className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-[#E8F2DF] border border-[#C8D9B0] text-[#3A6B2A] hover:bg-[#D8EAC9] text-[11px] sm:text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#7BAF5A] ${isBlinking ? 'animate-bounce' : ''}`} />
              <span>{isBlinking ? 'Kedip...' : 'Blink!'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* API URL Config Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3B2D]/20 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#D4DFC8] p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#2D3B2D]">Konfigurasi URL API Backend</h3>
                <p className="text-xs text-[#8A9B7A]">Atur alamat Host/IP dan Port WebSocket server</p>
              </div>
            </div>

            <form onSubmit={handleSaveApi} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">
                  Host / Alamat IP Server
                </label>
                <input
                  type="text"
                  value={apiHost}
                  onChange={(e) => setApiHost(e.target.value)}
                  placeholder="Contoh: 192.168.1.4 atau api.domain.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAF6] border border-[#D4DFC8] focus:border-[#7BAF5A] focus:outline-none text-xs sm:text-sm text-[#2D3B2D] font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">
                  Port WebSocket Server
                </label>
                <input
                  type="number"
                  value={apiPort}
                  onChange={(e) => setApiPort(e.target.value)}
                  placeholder="3001"
                  min="1"
                  max="65535"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAF6] border border-[#D4DFC8] focus:border-[#7BAF5A] focus:outline-none text-xs sm:text-sm text-[#2D3B2D] font-mono"
                  required
                />
              </div>

              <div className="p-3 bg-[#F9FAF6] border border-[#D4DFC8] rounded-xl text-[11px] text-[#5A6B5A]">
                <div className="font-semibold text-[#2D3B2D] mb-1">Target WebSocket URL:</div>
                <div className="font-mono text-[#3A6B2A] break-all">
                  ws://{apiHost || '192.168.1.4'}:{apiPort || 3001}/ws/device
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetApi}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition cursor-pointer"
                >
                  Reset Default
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApiModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-[#C8D9B0] text-xs font-semibold text-[#5A6B5A] hover:bg-[#F0F4EA] transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Simpan URL API
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Code Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3B2D]/20 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#D4DFC8] p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#2D3B2D]">Atur Auth Code NVS</h3>
                <p className="text-xs text-[#8A9B7A]">Masukkan kode verifikasi perangkat</p>
              </div>
            </div>

            <form onSubmit={handleSaveAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">
                  Auth Code
                </label>
                <input
                  type="text"
                  value={customAuth}
                  onChange={(e) => setCustomAuth(e.target.value)}
                  placeholder="Contoh: auth_sec_99a8x..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAF6] border border-[#D4DFC8] focus:border-[#7BAF5A] focus:outline-none text-xs sm:text-sm text-[#2D3B2D] font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#C8D9B0] text-xs font-semibold text-[#5A6B5A] hover:bg-[#F0F4EA] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
