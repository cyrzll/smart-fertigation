import { Bluetooth, BluetoothOff, RefreshCw, Cpu, AlertCircle } from 'lucide-react';

export function Navbar({
  isConnected,
  isConnecting,
  deviceName,
  onConnect,
  onDisconnect,
  isSupported,
  onRefresh,
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D4DFC8] bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-18 gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#E8F2DF] border border-[#C8D9B0] shadow-xs shrink-0">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-[#7BAF5A]" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7BAF5A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 bg-[#7BAF5A] border-2 border-white"></span>
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-bold text-[#2D3B2D] tracking-tight truncate">
                  Smart Fertigation
                </h1>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 rounded-md font-mono bg-[#E8F2DF] text-[#3A6B2A] border border-[#C8D9B0] font-semibold shrink-0">
                  BLE
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#8A9B7A] truncate">
                ESP32 Wireless Manager
              </p>
            </div>
          </div>

          {/* Connection Actions & Status */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {!isSupported ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] sm:text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                <span className="hidden md:inline">Gunakan Chrome / Edge / Bluefy</span>
                <span className="md:hidden">Web BLE Error</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8F2DF] border border-[#C8D9B0] text-[#3A6B2A] text-xs font-mono font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#7BAF5A] animate-pulse"></span>
                  <span className="truncate max-w-[120px]">{deviceName || 'ESP32'}</span>
                </div>

                <button
                  onClick={onRefresh}
                  title="Refresh Status ESP32"
                  className="p-2 rounded-lg sm:rounded-xl border border-[#C8D9B0] text-[#5A6B5A] hover:border-[#7BAF5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA] transition active:scale-95 cursor-pointer bg-white shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={onDisconnect}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-[11px] sm:text-xs font-semibold transition active:scale-95 shadow-xs cursor-pointer shrink-0"
                >
                  <BluetoothOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Putus</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="relative group flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-[#7BAF5A]/30 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    <span className="hidden xs:inline">Hubungkan ESP32</span>
                    <span className="xs:hidden">Hubungkan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
