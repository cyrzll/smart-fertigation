import { useState } from 'react';
import {
  Activity,
  Thermometer,
  Droplets,
  Sprout,
  Waves,
  Zap,
  TestTube,
  Play,
  Square,
  Clock,
  RefreshCw,
} from 'lucide-react';

export function TelemetryControl({
  status,
  onValveControl,
  onRefresh,
}) {
  const [valveDuration, setValveDuration] = useState({
    25: 5,
    26: 5,
  });

  const [loadingValve, setLoadingValve] = useState({
    25: false,
    26: false,
  });

  const sensors = status.sensors || {};

  const valves = status.valves || {
    valve1: false,
    valve2: false,
  };

  const handleToggleValve = async (gpio, action) => {
    setLoadingValve((prev) => ({ ...prev, [gpio]: true }));
    const duration = action === 'OPEN' ? valveDuration[gpio] || 0 : 0;

    try {
      await onValveControl(gpio, action, duration);
    } finally {
      setTimeout(() => {
        setLoadingValve((prev) => ({ ...prev, [gpio]: false }));
      }, 500);
    }
  };

  const phVal = sensors.ph != null && !isNaN(Number(sensors.ph)) ? Number(sensors.ph) : null;
  const getPhStatus = (ph) => {
    if (ph == null) return { label: 'Tidak Terhubung', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
    if (ph < 5.5) return { label: 'Asam (Rendah)', color: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
    if (ph <= 6.8) return { label: 'Ideal (Optimal)', color: 'bg-[#E8F2DF] text-[#3A6B2A] border-[#C8D9B0]', dot: 'bg-[#7BAF5A]' };
    return { label: 'Basa (Tinggi)', color: 'bg-blue-50 text-blue-700 border-blue-300', dot: 'bg-blue-500' };
  };
  const phStatus = getPhStatus(phVal);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Telemetry Sensor Section */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#2D3B2D]">Live Sensor pH Air (Real)</h3>
              <p className="text-[10px] sm:text-xs text-[#8A9B7A]">Streaming data analog aktual dari GPIO 34 via BLE</p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl border border-[#C8D9B0] text-[#5A6B5A] hover:bg-[#F0F4EA] hover:text-[#3A6B2A] text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs self-end sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Sensor</span>
          </button>
        </div>

        {/* Real pH Sensor Card */}
        <div className="bg-[#F9FAF6] border-2 border-[#C8D9B0] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold text-[#2D3B2D]">Sensor pH-4502C (Pin Po)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#D4DFC8] text-[#5A6B5A]">
                GPIO 34
              </span>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#2D3B2D]">
                {phVal !== null ? phVal.toFixed(2) : '—'}
              </span>
              <span className="text-sm font-bold text-[#8A9B7A]">pH</span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${phStatus.color}`}>
              <span className={`w-2 h-2 rounded-full ${phStatus.dot}`} />
              <span>{phStatus.label}</span>
            </span>
            <span className="text-[11px] text-[#8A9B7A] font-mono">
              Target Fertigasi: 5.50 - 6.50 pH
            </span>
          </div>
        </div>
      </div>

      {/* Manual Actuator & Valve Control Section */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#2D3B2D]">Kendali Valve Irigasi</h3>
            <p className="text-[10px] sm:text-xs text-[#8A9B7A]">Pengujian manual relay valve via BLE</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Valve 1 - GPIO 25 */}
          <div className="bg-[#F9FAF6] border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#7BAF5A]"></div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#2D3B2D]">Valve 1 (Zona A)</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#D4DFC8] text-[#5A6B5A]">
                  GPIO 25
                </span>
              </div>

              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-[#D4DFC8] mb-3">
                <span className="text-xs text-[#8A9B7A]">Status Saat Ini:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    valves.valve1
                      ? 'bg-[#E8F2DF] text-[#3A6B2A] border border-[#C8D9B0] animate-pulse'
                      : 'bg-[#F0F4EA] text-[#8A9B7A] border border-[#D4DFC8]'
                  }`}
                >
                  {valves.valve1 ? 'TERBUKA (ON)' : 'TERTUTUP (OFF)'}
                </span>
              </div>

              {/* Duration Timer Selector */}
              <div className="flex items-center justify-between text-xs text-[#5A6B5A] mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#7BAF5A]" />
                  <span>Durasi Buka:</span>
                </div>
                <select
                  value={valveDuration[25]}
                  onChange={(e) =>
                    setValveDuration((prev) => ({ ...prev, 25: Number(e.target.value) }))
                  }
                  className="bg-white border border-[#D4DFC8] text-[#2D3B2D] text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#7BAF5A] cursor-pointer"
                >
                  <option value={0}>Manual (Tanpa timer)</option>
                  <option value={5}>5 Detik</option>
                  <option value={10}>10 Detik</option>
                  <option value={30}>30 Detik</option>
                  <option value={60}>1 Menit</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => handleToggleValve(25, 'OPEN')}
                disabled={loadingValve[25]}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Buka Valve</span>
              </button>
              <button
                onClick={() => handleToggleValve(25, 'CLOSE')}
                disabled={loadingValve[25]}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Tutup Valve</span>
              </button>
            </div>
          </div>

          {/* Valve 2 - GPIO 26 */}
          <div className="bg-[#F9FAF6] border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#2D3B2D]">Valve 2 (Zona B)</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#D4DFC8] text-[#5A6B5A]">
                  GPIO 26
                </span>
              </div>

              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-[#D4DFC8] mb-3">
                <span className="text-xs text-[#8A9B7A]">Status Saat Ini:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    valves.valve2
                      ? 'bg-[#E8F2DF] text-[#3A6B2A] border border-[#C8D9B0] animate-pulse'
                      : 'bg-[#F0F4EA] text-[#8A9B7A] border border-[#D4DFC8]'
                  }`}
                >
                  {valves.valve2 ? 'TERBUKA (ON)' : 'TERTUTUP (OFF)'}
                </span>
              </div>

              {/* Duration Timer Selector */}
              <div className="flex items-center justify-between text-xs text-[#5A6B5A] mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#7BAF5A]" />
                  <span>Durasi Buka:</span>
                </div>
                <select
                  value={valveDuration[26]}
                  onChange={(e) =>
                    setValveDuration((prev) => ({ ...prev, 26: Number(e.target.value) }))
                  }
                  className="bg-white border border-[#D4DFC8] text-[#2D3B2D] text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#7BAF5A] cursor-pointer"
                >
                  <option value={0}>Manual (Tanpa timer)</option>
                  <option value={5}>5 Detik</option>
                  <option value={10}>10 Detik</option>
                  <option value={30}>30 Detik</option>
                  <option value={60}>1 Menit</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => handleToggleValve(26, 'OPEN')}
                disabled={loadingValve[26]}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Buka Valve</span>
              </button>
              <button
                onClick={() => handleToggleValve(26, 'CLOSE')}
                disabled={loadingValve[26]}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Tutup Valve</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
