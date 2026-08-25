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

  const sensors = status.sensors || {
    suhu: 29.4,
    kelembaban: 76.0,
    media: 63.0,
    level_air: 72.0,
    ec: 1.8,
    ph: 6.2,
  };

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

  const sensorCards = [
    {
      title: 'Suhu Udara',
      value: `${sensors.suhu ?? '--'}°C`,
      label: 'Optimal: 26-32°C',
      icon: <Thermometer className="w-4 h-4 text-orange-500" />,
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    {
      title: 'Kelembaban',
      value: `${sensors.kelembaban ?? '--'}%`,
      label: 'Optimal: 60-80%',
      icon: <Droplets className="w-4 h-4 text-blue-500" />,
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: 'Moisture Tanah',
      value: `${sensors.media ?? '--'}%`,
      label: 'Optimal: 60-70%',
      icon: <Sprout className="w-4 h-4 text-[#7BAF5A]" />,
      badgeBg: 'bg-[#E8F2DF] text-[#3A6B2A] border-[#C8D9B0]',
    },
    {
      title: 'Level Tangki',
      value: `${sensors.level_air ?? '--'}%`,
      label: 'Minimal 30%',
      icon: <Waves className="w-4 h-4 text-cyan-500" />,
      badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    {
      title: 'EC Nutrisi',
      value: `${sensors.ec ?? '--'} mS`,
      label: 'Optimal: 1.5 - 2.5',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: 'pH Larutan',
      value: `${sensors.ph ?? '--'}`,
      label: 'Optimal: 5.8 - 6.5',
      icon: <TestTube className="w-4 h-4 text-purple-500" />,
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

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
              <h3 className="text-xs sm:text-sm font-bold text-[#2D3B2D]">Live Sensor Telemetri</h3>
              <p className="text-[10px] sm:text-xs text-[#8A9B7A]">Streaming data realtime via BLE</p>
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

        {/* 6 Sensor Gauges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          {sensorCards.map((card, i) => (
            <div
              key={i}
              className="bg-[#F9FAF6] border border-[#D4DFC8] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-[#7BAF5A] transition shadow-2xs"
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[10px] sm:text-[11px] font-semibold text-[#8A9B7A] truncate">{card.title}</span>
                <span className="shrink-0">{card.icon}</span>
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-[#2D3B2D] font-mono tracking-tight">
                  {card.value}
                </div>
                <div className="text-[9px] sm:text-[10px] text-[#8A9B7A] mt-0.5 truncate">{card.label}</div>
              </div>
            </div>
          ))}
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
