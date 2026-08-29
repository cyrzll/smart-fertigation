import { useState } from 'react';
import {
  Wifi,
  WifiOff,
  Search,
  Lock,
  Unlock,
  Radio,
  Globe,
  Network,
  Trash2,
  PowerOff,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
} from 'lucide-react';

export function WifiManager({
  status,
  scanResults,
  isScanning,
  isConnectingWifi,
  onScanWifi,
  onConnectWifi,
  onDisconnectWifi,
  onResetWifi,
}) {
  const [ssidInput, setSsidInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isConnected = status.wifi_status === 'CONNECTED';
  const isApMode = status.wifi_status === 'AP_MODE';

  // Handle network selection from scan list
  const handleSelectNetwork = (ssid) => {
    setSsidInput(ssid);
    const passField = document.getElementById('wifi-password-input');
    if (passField) passField.focus();
  };

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!ssidInput.trim()) return;
    await onConnectWifi(ssidInput.trim(), passwordInput);
  };

  const getSignalIcon = (rssi) => {
    if (rssi >= -60) return <SignalHigh className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7BAF5A]" />;
    if (rssi >= -75) return <SignalMedium className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7BAF5A]" />;
    if (rssi >= -85) return <SignalLow className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />;
    return <Signal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />;
  };

  const getSignalQuality = (rssi) => {
    if (!rssi) return 'Tidak ada sinyal';
    if (rssi >= -60) return 'Sangat Kuat';
    if (rssi >= -70) return 'Kuat';
    if (rssi >= -80) return 'Sedang';
    return 'Lemah';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Current Wi-Fi Status Banner */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border shrink-0 ${
                isConnected
                  ? 'bg-[#E8F2DF] border-[#C8D9B0] text-[#7BAF5A]'
                  : isApMode
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-red-50 border-red-200 text-red-500'
              }`}
            >
              {isConnected ? <Wifi className="w-5 h-5 sm:w-7 sm:h-7" /> : <WifiOff className="w-5 h-5 sm:w-7 sm:h-7" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-[#2D3B2D]">Status Koneksi Wi-Fi</h3>
                <span
                  className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isConnected
                      ? 'bg-[#E8F2DF] text-[#3A6B2A] border border-[#C8D9B0]'
                      : isApMode
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {status.wifi_status || 'DISCONNECTED'}
                </span>
              </div>

              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#5A6B5A]">
                {isConnected ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      SSID: <strong className="text-[#2D3B2D] font-bold">{status.ssid}</strong>
                    </span>
                    <span className="text-[#8A9B7A]">•</span>
                    <span className="flex items-center gap-1 text-xs text-[#5A6B5A]">
                      {getSignalIcon(status.rssi)}
                      <span>{status.rssi} dBm ({getSignalQuality(status.rssi)})</span>
                    </span>
                  </div>
                ) : isApMode ? (
                  <p className="text-amber-700 text-xs">
                    ESP32 aktif dalam mode Access Point (AP). Sambungkan ke SSID untuk konfigurasi.
                  </p>
                ) : (
                  <p className="text-[#8A9B7A] text-xs">
                    ESP32 belum terhubung ke jaringan Wi-Fi lokal. Silakan pilih jaringan di bawah.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons for Current Connection */}
          {isConnected && (
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={onDisconnectWifi}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#C8D9B0] text-[#5A6B5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA] text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <PowerOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Putuskan</span>
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Kredensial</span>
              </button>
            </div>
          )}
        </div>

        {/* IP and Network Specs Bar */}
        {isConnected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-[#E8EDE0]">
            <div className="bg-[#F9FAF6] rounded-xl p-2.5 sm:p-3 border border-[#D4DFC8]">
              <div className="flex items-center gap-1 text-[#8A9B7A] text-[10px] sm:text-[11px] mb-0.5">
                <Globe className="w-3 h-3 text-[#7BAF5A]" />
                <span>IP Address</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3B2D] font-mono truncate">{status.ip || '0.0.0.0'}</div>
            </div>

            <div className="bg-[#F9FAF6] rounded-xl p-2.5 sm:p-3 border border-[#D4DFC8]">
              <div className="flex items-center gap-1 text-[#8A9B7A] text-[10px] sm:text-[11px] mb-0.5">
                <Network className="w-3 h-3 text-[#7BAF5A]" />
                <span>Gateway</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3B2D] font-mono truncate">{status.gateway || '-'}</div>
            </div>

            <div className="bg-[#F9FAF6] rounded-xl p-2.5 sm:p-3 border border-[#D4DFC8]">
              <div className="flex items-center gap-1 text-[#8A9B7A] text-[10px] sm:text-[11px] mb-0.5">
                <Radio className="w-3 h-3 text-[#7BAF5A]" />
                <span>MAC</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3B2D] font-mono truncate" title={status.mac}>
                {status.mac || '-'}
              </div>
            </div>

            <div className="bg-[#F9FAF6] rounded-xl p-2.5 sm:p-3 border border-[#D4DFC8]">
              <div className="flex items-center gap-1 text-[#8A9B7A] text-[10px] sm:text-[11px] mb-0.5">
                <Radio className="w-3 h-3 text-[#7BAF5A]" />
                <span>Server</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-[#2D3B2D] flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    status.ws_status === 'CONNECTED' ? 'bg-[#7BAF5A] animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="truncate">{status.ws_status || 'DISCONNECTED'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Wi-Fi Scanner (Left) & Connect Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Wi-Fi Scanner List */}
        <div className="lg:col-span-7 bg-white border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#2D3B2D]">Daftar Wi-Fi Sekitar</h4>
                  <p className="text-[10px] sm:text-xs text-[#8A9B7A]">Hotspot terdeteksi oleh ESP32</p>
                </div>
              </div>

              <button
                onClick={onScanWifi}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl border border-[#C8D9B0] text-[#3A6B2A] hover:bg-[#F0F4EA] text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Search className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Memindai...' : 'Pindai'}</span>
              </button>
            </div>

            {/* List of Detected Networks */}
            <div className="space-y-2 mt-3 max-h-[260px] sm:max-h-[320px] overflow-y-auto pr-1">
              {isScanning ? (
                <div className="py-10 flex flex-col items-center justify-center text-center text-[#8A9B7A]">
                  <RefreshCw className="w-7 h-7 text-[#7BAF5A] animate-spin mb-2" />
                  <p className="text-xs sm:text-sm font-medium text-[#2D3B2D]">Sedang Memindai Jaringan...</p>
                  <p className="text-[11px] text-[#8A9B7A] mt-0.5">Mencari frekuensi 2.4 GHz sekitar</p>
                </div>
              ) : scanResults && scanResults.length > 0 ? (
                scanResults.map((net, idx) => {
                  const isSelected = ssidInput === net.ssid;
                  const isCurrent = status.ssid === net.ssid && isConnected;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectNetwork(net.ssid)}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#E8F2DF] border-[#7BAF5A] shadow-xs'
                          : 'bg-[#F9FAF6] border-[#D4DFC8] hover:bg-[#F0F4EA]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getSignalIcon(net.rssi)}
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#2D3B2D] truncate">{net.ssid}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#E8F2DF] text-[#3A6B2A] font-bold border border-[#C8D9B0] shrink-0">
                                Aktif
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-[#8A9B7A] font-mono">{net.rssi} dBm</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {net.secure ? (
                          <Lock className="w-3.5 h-3.5 text-[#8A9B7A]" title="Password" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-[#7BAF5A]" title="Open" />
                        )}
                        <button
                          type="button"
                          className="text-[10px] sm:text-[11px] px-2 py-1 rounded-lg bg-white border border-[#C8D9B0] text-[#5A6B5A] hover:bg-[#7BAF5A] hover:text-white transition font-semibold cursor-pointer"
                        >
                          Pilih
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center text-[#8A9B7A] bg-[#F9FAF6] rounded-xl border border-[#D4DFC8] p-4">
                  <Radio className="w-6 h-6 text-[#8A9B7A] mb-1.5" />
                  <p className="text-xs font-semibold text-[#2D3B2D]">Belum ada hasil pemindaian</p>
                  <p className="text-[10px] sm:text-[11px] text-[#8A9B7A] mt-0.5">
                    Klik tombol "Pindai" di atas untuk mencari hotspot sekitar
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Connect Wi-Fi Form */}
        <div className="lg:col-span-5 bg-white border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#2D3B2D]">Hubungkan ke Wi-Fi</h4>
                <p className="text-[10px] sm:text-xs text-[#8A9B7A]">Masukkan nama dan kata sandi jaringan</p>
              </div>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-3 sm:space-y-4">
              {/* SSID Field */}
              <div>
                <label className="block text-xs font-semibold text-[#5A6B5A] mb-1">
                  Nama Jaringan (SSID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ssidInput}
                    onChange={(e) => setSsidInput(e.target.value)}
                    placeholder="Contoh: MyHomeWiFi"
                    className="w-full pl-3 pr-9 py-2 sm:py-2.5 rounded-xl bg-[#F9FAF6] border border-[#D4DFC8] focus:border-[#7BAF5A] focus:outline-none text-xs text-[#2D3B2D] font-medium"
                    required
                  />
                  <Wifi className="w-4 h-4 text-[#8A9B7A] absolute right-3 top-2.5 sm:top-3 pointer-events-none" />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-[#5A6B5A] mb-1">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <input
                    id="wifi-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan sandi Wi-Fi..."
                    className="w-full pl-3 pr-9 py-2 sm:py-2.5 rounded-xl bg-[#F9FAF6] border border-[#D4DFC8] focus:border-[#7BAF5A] focus:outline-none text-xs text-[#2D3B2D] font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 sm:top-2.5 text-[#8A9B7A] hover:text-[#2D3B2D] transition cursor-pointer p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#8A9B7A] mt-0.5">Kosongkan jika jaringan Open (tanpa sandi)</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isConnectingWifi || !ssidInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white font-bold text-xs transition shadow-sm shadow-[#7BAF5A]/30 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isConnectingWifi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="truncate">Menghubungkan ke {ssidInput}...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Sambungkan ke Wi-Fi</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8EDE0] text-[10px] sm:text-[11px] text-[#8A9B7A] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[#7BAF5A] shrink-0" />
            <span>Hanya mendukung Wi-Fi frekuensi 2.4 GHz.</span>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3B2D]/20 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#D4DFC8] p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 text-red-600 mb-3 sm:mb-4">
              <div className="p-2 sm:p-2.5 rounded-xl bg-red-50 border border-red-200 shrink-0">
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#2D3B2D]">Reset Kredensial Wi-Fi?</h3>
                <p className="text-xs text-[#8A9B7A]">Data SSID & sandi di flash akan dihapus</p>
              </div>
            </div>

            <p className="text-xs text-[#5A6B5A] leading-relaxed mb-5">
              ESP32 akan memutuskan koneksi Wi-Fi saat ini dan menghapus SSID serta kata sandi tersimpan. Perangkat
              kembali ke mode Access Point / Unconfigured.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-[#C8D9B0] text-xs font-semibold text-[#5A6B5A] hover:bg-[#F0F4EA] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowResetConfirm(false);
                  await onResetWifi();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Ya, Hapus Kredensial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
