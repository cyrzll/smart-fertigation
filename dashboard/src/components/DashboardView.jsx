import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sprout, Calendar, Clock, Cpu, ArrowRight, RefreshCw, CheckCircle2, 
  Layers, Droplets, Activity, Thermometer, Wind, Gauge, ShieldCheck, 
  AlertTriangle, Sparkles, TrendingUp
} from 'lucide-react';
import { actions } from 'astro:actions';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const formatWibTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(dateStr)) + ' WIB';
  } catch (_) {
    return new Date(dateStr).toLocaleTimeString('id-ID');
  }
};

const formatWibDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch (_) {
    return new Date(dateStr).toLocaleDateString('id-ID');
  }
};

const getWibMinuteKey = (dateStr) => {
  if (!dateStr) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(dateStr));
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}`;
  } catch (_) {
    return String(dateStr).slice(0, 16);
  }
};

const formatChartDay = (day) => {
  if (!day) return '-';
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(Date.UTC(year, month - 1, date)));
};

const HourlyComparisonChart = ({ rows }) => {
  if (!rows.some((row) => row.ph !== null || row.tds !== null)) {
    return <div className="h-56 flex items-center justify-center text-xs text-[#8A9B7A]">Belum ada data per jam pada hari ini.</div>;
  }

  const chartData = {
    labels: rows.map((row) => `${String(row.hour).padStart(2, '0')}:00`),
    datasets: [
      {
        label: 'Rata-rata pH',
        data: rows.map((row) => row.ph),
        borderColor: '#5A8A3A',
        backgroundColor: '#5A8A3A',
        yAxisID: 'yPh',
        tension: 0.35,
        spanGaps: true,
        pointRadius: 3.5,
        pointHoverRadius: 5,
        borderWidth: 2.5,
      },
      {
        label: 'Rata-rata TDS',
        data: rows.map((row) => row.tds),
        borderColor: '#D97706',
        backgroundColor: '#D97706',
        yAxisID: 'yTds',
        tension: 0.35,
        spanGaps: true,
        pointRadius: 3.5,
        pointHoverRadius: 5,
        borderWidth: 2.5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 10,
        callbacks: {
          label: (context) => {
            if (context.raw == null) return null;
            return context.dataset.yAxisID === 'yPh'
              ? ` pH: ${Number(context.raw).toFixed(2)}`
              : ` TDS: ${Math.round(Number(context.raw))} PPM`;
          },
          footer: (items) => {
            const index = items[0]?.dataIndex;
            return index != null ? `${rows[index].samples} sampel pada jam ini` : '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#F1F4ED' },
        ticks: { color: '#8A9B7A', font: { size: 10 }, maxRotation: 0 },
        title: { display: true, text: 'Jam (WIB)', color: '#8A9B7A', font: { size: 11 } },
      },
      yPh: {
        type: 'linear',
        position: 'left',
        min: 0,
        max: 14,
        grid: { color: '#E8EDE0', borderDash: [4, 4] },
        ticks: { color: '#5A8A3A', font: { size: 10 } },
        title: { display: true, text: 'pH', color: '#5A8A3A', font: { size: 11, weight: 'bold' } },
      },
      yTds: {
        type: 'linear',
        position: 'right',
        min: 0,
        max: 2000,
        grid: { drawOnChartArea: false },
        ticks: { color: '#D97706', font: { size: 10 } },
        title: { display: true, text: 'TDS (PPM)', color: '#D97706', font: { size: 11, weight: 'bold' } },
      },
    },
  };

  return (
    <div className="overflow-x-auto">
      <div className="h-72 min-w-[720px]">
        <Line data={chartData} options={chartOptions} aria-label="Grafik perbandingan rata-rata pH dan TDS per jam" />
      </div>
    </div>
  );
};

export const DashboardView = ({ apiUrl, setActiveTab }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveWs, setIsLiveWs] = useState(false);
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [selectedChartDay, setSelectedChartDay] = useState(null);

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      setError(null);

      const { data: resData, error: actionError } = await actions.getDashboard();
      if (actionError) {
        throw new Error(actionError.message || 'Gagal memuat data');
      }

      if (resData && resData.success) {
        setData(resData);
        if (resData.latestTelemetry) {
          setLiveTelemetry((prev) => prev || resData.latestTelemetry);
        }
      } else {
        setError(resData?.error || resData?.message || 'Gagal memuat data');
      }
    } catch (err) {
      // Fallback to fetch
      try {
        const res = await fetch(`/api/dashboard`);
        const json = await res.json();
        if (json.success) {
          setData(json);
          if (json.latestTelemetry) setLiveTelemetry((prev) => prev || json.latestTelemetry);
        } else {
          setError(json.error || 'Gagal memuat data');
        }
      } catch (_) {
        setError('Gagal terhubung ke server.');
      }
    } finally {
      if (isManual) setLoading(false);
      else setLoading(false);
    }
  };

  // Initial fetch and auto-polling every 20 seconds
  useEffect(() => {
    fetchDashboardData(true);
    const pollInterval = setInterval(() => {
      fetchDashboardData(false);
    }, 20000);

    return () => clearInterval(pollInterval);
  }, [apiUrl]);

  // Live WebSocket connection for instant sub-second sensor updates
  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connectWs = () => {
      try {
        let wsUrl = 'ws://localhost:3001/ws/dashboard';
        if (typeof window !== 'undefined') {
          const isHttps = window.location.protocol === 'https:';
          const protocol = isHttps ? 'wss:' : 'ws:';
          if (isHttps) {
            if (window.location.hostname.includes('tirtaruna.site')) {
              wsUrl = 'wss://api.tirtaruna.site/ws/dashboard';
            } else {
              wsUrl = `wss://${window.location.host}/ws/dashboard`;
            }
          } else {
            const host = window.location.hostname || 'localhost';
            wsUrl = `ws://${host}:3001/ws/dashboard`;
          }
        }

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsLiveWs(true);
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'SENSOR_TELEMETRY' && msg.telemetry) {
              setLiveTelemetry(msg.telemetry);
              // Tambahkan rekaman baru ke riwayat tabel secara instan
              setData((prev) => {
                if (!prev) return prev;
                const newRec = {
                  id: Date.now(),
                  device_code: msg.device_code || 'ESP32',
                  ...msg.telemetry,
                  created_at: msg.telemetry.created_at || new Date().toISOString(),
                };
                const existing = prev.recentTelemetries || [];
                const newMinute = getWibMinuteKey(newRec.created_at);
                const uniqueExisting = existing.filter((row) => getWibMinuteKey(row.created_at) !== newMinute);
                return {
                  ...prev,
                  latestTelemetry: newRec,
                  recentTelemetries: [newRec, ...uniqueExisting].slice(0, 15),
                };
              });
            } else if (msg.type === 'DEVICE_STATUS' && msg.telemetry) {
              setLiveTelemetry(msg.telemetry);
            }
          } catch (_) {}
        };

        ws.onclose = () => {
          setIsLiveWs(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setIsLiveWs(false);
          ws.close();
        };
      } catch (_) {}
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const currentTelemetry = liveTelemetry || data?.latestTelemetry || {};

  const phVal = currentTelemetry.ph != null && !isNaN(Number(currentTelemetry.ph)) ? Number(currentTelemetry.ph) : null;
  const tdsVal = currentTelemetry.tds != null && !isNaN(Number(currentTelemetry.tds)) ? Number(currentTelemetry.tds) : (currentTelemetry.ec != null ? Number(currentTelemetry.ec) * 500.0 : null);
  const ecVal = currentTelemetry.ec != null && !isNaN(Number(currentTelemetry.ec)) ? Number(currentTelemetry.ec) : (tdsVal != null ? tdsVal / 500.0 : null);

  // Status helper untuk nilai pH
  const getPhStatus = (ph) => {
    if (ph == null) return { label: 'Tidak Terhubung', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
    if (ph < 5.5) return { label: 'Asam (Rendah)', color: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
    if (ph <= 6.8) return { label: 'Ideal (Optimal)', color: 'bg-[#E8F2DF] text-[#3A6B2A] border-[#C8D9B0]', dot: 'bg-[#7BAF5A]' };
    return { label: 'Basa (Tinggi)', color: 'bg-blue-50 text-blue-700 border-blue-300', dot: 'bg-blue-500' };
  };

  // Status helper untuk nilai TDS / EC Nutrisi
  const getTdsStatus = (tds) => {
    if (tds == null) return { label: 'Tidak Terhubung', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
    if (tds < 700) return { label: 'Rendah (Kurang Pekat)', color: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
    if (tds <= 1400) return { label: 'Ideal (Optimal)', color: 'bg-[#E8F2DF] text-[#3A6B2A] border-[#C8D9B0]', dot: 'bg-[#7BAF5A]' };
    return { label: 'Pekat (Tinggi)', color: 'bg-red-50 text-red-700 border-red-300', dot: 'bg-red-500' };
  };

  const phStatus = getPhStatus(phVal);
  const tdsStatus = getTdsStatus(tdsVal);

  const minuteTelemetries = useMemo(() => {
    const seenMinutes = new Set();
    return (data?.recentTelemetries || []).filter((row) => {
      const minute = getWibMinuteKey(row.created_at) || `id-${row.id}`;
      if (seenMinutes.has(minute)) return false;
      seenMinutes.add(minute);
      return true;
    });
  }, [data?.recentTelemetries]);

  const chartDays = useMemo(
    () => [...new Set((data?.hourlyTelemetries || []).map((row) => row.day))].sort().reverse(),
    [data?.hourlyTelemetries]
  );
  const activeChartDay = chartDays.includes(selectedChartDay) ? selectedChartDay : chartDays[0];
  const hourlyChartRows = useMemo(() => {
    const rowsByHour = new Map(
      (data?.hourlyTelemetries || [])
        .filter((row) => row.day === activeChartDay)
        .map((row) => [Number(row.hour), {
          hour: Number(row.hour),
          ph: row.avg_ph != null && !isNaN(Number(row.avg_ph)) ? Number(row.avg_ph) : null,
          tds: row.avg_tds != null && !isNaN(Number(row.avg_tds)) ? Number(row.avg_tds) : null,
          samples: Number(row.sample_count) || 0,
        }])
    );
    return Array.from({ length: 24 }, (_, hour) => rowsByHour.get(hour) || { hour, ph: null, tds: null, samples: 0 });
  }, [data?.hourlyTelemetries, activeChartDay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#2D3B2D]">Dashboard Monitoring</h2>
          <p className="text-xs text-[#8A9B7A] mt-0.5">
            Pemantauan telemetri pH, TDS nutrisi, dan jadwal fertigasi realtime
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#D4DFC8] bg-white text-xs font-semibold shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isLiveWs ? 'bg-[#7BAF5A] animate-pulse' : 'bg-slate-400'}`} />
            <span className={isLiveWs ? 'text-[#3A6B2A]' : 'text-slate-500'}>
              {isLiveWs ? 'Data Langsung' : 'Memperbarui Data'}
            </span>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border border-[#C8D9B0] text-[#5A6B5A] hover:border-[#7BAF5A] hover:text-[#3A6B2A] text-xs font-semibold bg-white transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50/50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchDashboardData(true)} className="underline text-xs font-medium cursor-pointer">
            Coba lagi
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REAL-TIME SENSOR TELEMETRY (pH AIR & TDS NUTRISI)                         */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#7BAF5A]" />
            <h3 className="text-sm font-bold text-[#2D3B2D] uppercase tracking-wider">
              Data Sensor Terkini
            </h3>
          </div>
          <span className="text-[11px] text-[#8A9B7A] font-mono">
            {currentTelemetry.created_at ? `Update: ${formatWibTime(currentTelemetry.created_at)}` : 'Sinkronisasi Otomatis'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Card 1: SENSOR pH AIR (Modul pH-4502C - GPIO 34) */}
          <div className="bg-white border-2 border-[#C8D9B0] hover:border-[#7BAF5A] rounded-2xl p-5 shadow-xs transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2D3B2D]">Sensor pH Air Tandon</h4>
                  <p className="text-[11px] text-[#8A9B7A]">Tingkat keasaman air</p>
                </div>
              </div>

              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${phStatus.color}`}>
                <span className={`w-2 h-2 rounded-full ${phStatus.dot}`} />
                <span>{phStatus.label}</span>
              </span>
            </div>

            <div className="flex items-baseline space-x-2 my-2">
              <span className="text-4xl sm:text-5xl font-black text-[#2D3B2D] font-mono tracking-tight">
                {phVal !== null ? phVal.toFixed(2) : '—'}
              </span>
              {phVal !== null && <span className="text-sm font-bold text-[#8A9B7A]">pH</span>}
            </div>

            {/* Visual Gauge Bar Rentang pH 0 - 14 */}
            <div className="mt-4 pt-3 border-t border-[#E8EDE0]">
              <div className="flex justify-between text-[11px] font-mono text-[#8A9B7A] mb-1.5">
                <span className="text-amber-700 font-semibold">0 (Asam)</span>
                <span className="font-bold text-[#3A6B2A] bg-[#E8F2DF] px-2 py-0.5 rounded-md border border-[#C8D9B0]">
                  Target Ideal: 5.50 - 6.50
                </span>
                <span className="text-blue-700 font-semibold">14 (Basa)</span>
              </div>
              <div className="w-full h-3 bg-[#FAFAF7] border border-[#D4DFC8] rounded-full overflow-hidden relative">
                {/* Target optimal range indicator */}
                <div 
                  className="absolute left-[39.2%] w-[7.2%] h-full bg-[#7BAF5A]/30 border-x-2 border-[#7BAF5A]" 
                  title="Rentang Optimal Tanaman (5.5 - 6.5)" 
                />
                {/* Current Value Marker */}
                {phVal !== null && (
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      phVal < 5.5 ? 'bg-amber-500' : phVal <= 6.8 ? 'bg-[#7BAF5A]' : 'bg-blue-600'
                    }`} 
                    style={{ width: `${Math.min(100, Math.max(4, (phVal / 14) * 100))}%` }} 
                  />
                )}
              </div>
            </div>
          </div>

          {/* Card 2: SENSOR TDS & EC NUTRISI (TDS Meter V1.0 - GPIO 35) */}
          <div className="bg-white border-2 border-[#C8D9B0] hover:border-[#7BAF5A] rounded-2xl p-5 shadow-xs transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2D3B2D]">Sensor TDS & EC Nutrisi</h4>
                  <p className="text-[11px] text-[#8A9B7A]">Konsentrasi nutrisi air</p>
                </div>
              </div>

              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${tdsStatus.color}`}>
                <span className={`w-2 h-2 rounded-full ${tdsStatus.dot}`} />
                <span>{tdsStatus.label}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 my-2">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-4xl sm:text-5xl font-black text-[#2D3B2D] font-mono tracking-tight">
                  {tdsVal !== null ? Math.round(tdsVal) : '—'}
                </span>
                {tdsVal !== null && <span className="text-sm font-bold text-[#8A9B7A]">PPM</span>}
              </div>

              {ecVal !== null && (
                <div className="px-2.5 py-1 rounded-lg bg-[#FAFAF7] border border-[#D4DFC8] font-mono text-xs font-bold text-[#3A6B2A]">
                  ~{ecVal.toFixed(2)} mS/cm EC
                </div>
              )}
            </div>

            {/* Visual Gauge Bar Rentang TDS 0 - 2000 PPM */}
            <div className="mt-4 pt-3 border-t border-[#E8EDE0]">
              <div className="flex justify-between text-[11px] font-mono text-[#8A9B7A] mb-1.5">
                <span className="text-slate-500">0 PPM</span>
                <span className="font-bold text-[#3A6B2A] bg-[#E8F2DF] px-2 py-0.5 rounded-md border border-[#C8D9B0]">
                  Target Melon: 800 - 1400 PPM
                </span>
                <span className="text-red-700 font-semibold">2000 PPM</span>
              </div>
              <div className="w-full h-3 bg-[#FAFAF7] border border-[#D4DFC8] rounded-full overflow-hidden relative">
                {/* Target optimal range indicator (800 - 1400 / 2000 = 40% - 70%) */}
                <div
                  className="absolute left-[40%] w-[30%] h-full bg-[#7BAF5A]/30 border-x-2 border-[#7BAF5A]"
                  title="Rentang Optimal Nutrisi Melon (800 - 1400 PPM)"
                />
                {/* Current Value Marker */}
                {tdsVal !== null && (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      tdsVal < 700 ? 'bg-amber-500' : tdsVal <= 1400 ? 'bg-[#7BAF5A]' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, (tdsVal / 2000) * 100))}%` }}
                  />
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* INFORMASI STATUS TANAMAN & VALVE                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#8A9B7A]">Tanaman Aktif</span>
            <Sprout className="w-4 h-4 text-[#7BAF5A]" />
          </div>
          <h3 className="text-base font-bold text-[#2D3B2D] truncate">{data?.planting?.name || 'Melon Hidroponik'}</h3>
          <p className="text-xs text-[#8A9B7A] mt-1 truncate">Profil: {data?.planting?.profile_name || 'Belum dipilih'}</p>
        </div>

        <div className="bg-white border border-[#D4DFC8] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#8A9B7A]">Tanggal Tanam</span>
            <Calendar className="w-4 h-4 text-[#7BAF5A]" />
          </div>
          <h3 className="text-base font-bold text-[#2D3B2D]">
            {data?.planting?.planting_date ? formatWibDate(data.planting.planting_date) : '-'}
          </h3>
          <p className="text-xs text-[#8A9B7A] mt-1">Musim Tanam 2026</p>
        </div>

        <div className="bg-white border border-[#D4DFC8] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#8A9B7A]">Usia Tanaman</span>
            <Clock className="w-4 h-4 text-[#7BAF5A]" />
          </div>
          <h3 className="text-lg font-bold text-[#2D3B2D] flex items-center space-x-2">
            <span>{data?.hst != null ? `HST ${data.hst}` : 'HST 14'}</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7BAF5A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7BAF5A]"></span>
            </span>
          </h3>
          <p className="text-xs text-[#8A9B7A] mt-1">Fase Vegetatif Aktif</p>
        </div>

        <div className="bg-white border border-[#D4DFC8] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#8A9B7A]">Valve Terpasang</span>
            <Cpu className="w-4 h-4 text-[#7BAF5A]" />
          </div>
          <h3 className="text-lg font-bold text-[#2D3B2D]">{data?.valveCount ?? 2} Valve</h3>
          <p className="text-xs text-[#8A9B7A] mt-1">Solenoid Siap Kerja</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PROFIL FERTIGASI AKTIF                                                   */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#D4DFC8] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[#2D3B2D]">
                  {data?.activeProfile?.name || 'Belum ada profil fertigasi'}
                </h3>
                {data?.activeProfile && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    data.activeProfile.is_active
                      ? 'bg-[#E8F2DF] text-[#3A6B2A] border-[#C8D9B0]'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {data.activeProfile.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8A9B7A] mt-1 max-w-2xl">
                {data?.activeProfile?.description || 'Tambahkan atau pilih profil untuk menentukan matriks fertigasi tanaman aktif.'}
              </p>
              {data?.activeProfile && (
                <p className="text-[11px] font-mono text-[#5A6B5A] mt-2">
                  {Number(data.activeProfile.schedule_count || 0)} jadwal aktif pada profil ini
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('profiles')}
            className="shrink-0 text-xs font-semibold text-[#5A8A3A] hover:text-[#3A6B2A] flex items-center justify-center gap-1.5 border border-[#D4DFC8] hover:border-[#7BAF5A] px-3 py-2 rounded-xl transition cursor-pointer"
          >
            <span>Kelola Profil</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIWAYAT PENCATATAN TELEMETRI SENSOR BERKALA (pH & TDS)                    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#D4DFC8] rounded-2xl p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8EDE0]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D3B2D]">Riwayat Pemantauan Sensor pH & TDS Berkala</h3>
              <p className="text-[11px] text-[#8A9B7A]">Satu status terbaru per menit dari ESP32</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#D4DFC8] bg-[#FAFAF7] text-[#5A6B5A]">
              {minuteTelemetries.length} Rekaman Terakhir
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E8EDE0] text-xs font-semibold text-[#8A9B7A] bg-[#FAFAF7]">
                <th className="py-2.5 px-3 rounded-l-lg">Waktu (WIB)</th>
                <th className="py-2.5 px-3">Sensor pH Air</th>
                <th className="py-2.5 px-3">Status pH</th>
                <th className="py-2.5 px-3">Sensor TDS / EC Nutrisi</th>
                <th className="py-2.5 px-3">Status Nutrisi</th>
                <th className="py-2.5 px-3">Perangkat</th>
                <th className="py-2.5 px-3 text-right rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE0]">
              {minuteTelemetries.length > 0 ? (
                minuteTelemetries.map((row, idx) => {
                  const rowPh = row.ph != null && !isNaN(Number(row.ph)) ? Number(row.ph) : null;
                  const rowTds = row.tds != null && !isNaN(Number(row.tds)) ? Number(row.tds) : (row.ec != null ? Number(row.ec) * 500 : null);
                  const rowEc = row.ec != null && !isNaN(Number(row.ec)) ? Number(row.ec) : (rowTds != null ? rowTds / 500 : null);
                  const stPh = getPhStatus(rowPh);
                  const stTds = getTdsStatus(rowTds);

                  return (
                    <tr key={row.id || idx} className="hover:bg-[#FAFAF7] transition text-xs">
                      <td className="py-2.5 px-3 font-mono font-medium text-[#2D3B2D]">
                        {formatWibTime(row.created_at)}
                      </td>
                      <td className="py-2.5 px-3">
                        {rowPh !== null ? (
                          <span className="font-mono font-bold text-sm text-[#2D3B2D]">
                            {rowPh.toFixed(2)} pH
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${stPh.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${stPh.dot}`} />
                          <span>{stPh.label}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {rowTds !== null ? (
                          <div className="flex items-baseline space-x-1.5">
                            <span className="font-mono font-bold text-sm text-[#2D3B2D]">
                              {Math.round(rowTds)} PPM
                            </span>
                            {rowEc !== null && (
                              <span className="text-[10px] font-mono text-[#8A9B7A]">
                                ({rowEc.toFixed(2)} mS)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${stTds.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${stTds.dot}`} />
                          <span>{stTds.label}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#5A6B5A]">
                        {row.device_code || 'ESP-FERTIGASI-02'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#C8D9B0] text-[#3A6B2A] bg-[#E8F2DF]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{row.status || 'Normal'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#8A9B7A] text-xs">
                    {loading ? 'Memuat data telemetri...' : 'Belum ada rekaman telemetri. Data akan otomatis tercatat saat ESP32 terhubung.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRAFIK PERBANDINGAN RATA-RATA SENSOR PER JAM                              */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#D4DFC8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#E8EDE0]">
          <div>
            <h3 className="text-sm font-bold text-[#2D3B2D]">Perbandingan pH & TDS per Jam</h3>
            <p className="text-[11px] text-[#8A9B7A]">Rata-rata pembacaan setiap jam, dipisahkan per hari</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {chartDays.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedChartDay(day)}
                className={`shrink-0 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                  day === activeChartDay
                    ? 'bg-[#5A8A3A] border-[#5A8A3A] text-white'
                    : 'bg-white border-[#D4DFC8] text-[#5A6B5A] hover:border-[#7BAF5A]'
                }`}
              >
                {formatChartDay(day)}
              </button>
            ))}
            {chartDays.length === 0 && <span className="text-[11px] text-[#8A9B7A]">Belum ada hari yang dapat ditampilkan</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-[#5A6B5A]">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-[#5A8A3A]" />Rata-rata pH</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-amber-600" />Rata-rata TDS</span>
          {activeChartDay && <span className="ml-auto font-mono text-[#8A9B7A]">{formatChartDay(activeChartDay)}</span>}
        </div>

        <HourlyComparisonChart rows={hourlyChartRows} />
      </div>

      {/* ========================================================================= */}
      {/* JADWAL HARI INI                                                           */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#D4DFC8] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8EDE0]">
          <div>
            <h3 className="text-base font-bold text-[#2D3B2D]">Jadwal Fertigasi Hari Ini</h3>
            <p className="text-xs text-[#8A9B7A]">Otomasi penyiraman nutrisi berdasarkan fase pertumbuhan</p>
          </div>
          <button
            onClick={() => setActiveTab('schedules')}
            className="text-xs font-semibold text-[#5A8A3A] hover:text-[#3A6B2A] flex items-center space-x-1 border border-[#D4DFC8] hover:border-[#7BAF5A] px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <span>Kelola Jadwal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8EDE0] text-xs font-semibold text-[#8A9B7A] bg-[#FAFAF7]">
                <th className="py-2.5 px-3 rounded-l-lg">Jam Mulai</th>
                <th className="py-2.5 px-3">Target Valve</th>
                <th className="py-2.5 px-3">Durasi Siram</th>
                <th className="py-2.5 px-3 text-right rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE0]">
              {data?.todaySchedules && data.todaySchedules.length > 0 ? (
                data.todaySchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-[#FAFAF7] transition">
                    <td className="py-3 px-3 font-mono font-bold text-[#3A6B2A] text-sm">
                      {schedule.start_time.substring(0, 5)} WIB
                    </td>
                    <td className="py-3 px-3 font-medium text-[#2D3B2D]">
                      {schedule.valve_name}
                      {schedule.gpio && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded border border-[#D4DFC8] text-[#8A9B7A] font-mono">
                          GPIO {schedule.gpio}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#5A6B5A] font-medium">
                      {Math.floor(schedule.duration_seconds / 60)} menit
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#C8D9B0] text-[#3A6B2A] bg-[#E8F2DF]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Terjadwal</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#8A9B7A] text-xs">
                    {loading ? 'Memuat jadwal...' : 'Belum ada jadwal penyiraman untuk HST ini.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MENU CEPAT                                                                */}
      {/* ========================================================================= */}
      <div>
        <h3 className="text-sm font-bold text-[#2D3B2D] uppercase tracking-wider mb-3">Navigasi Cepat</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'devices', label: 'Manajemen Perangkat ESP32', icon: Cpu, desc: 'Pairing & kontrol realtime' },
            { id: 'schedules', label: 'Jadwal Fertigasi', icon: Calendar, desc: 'Atur durasi & jam siram' },
            { id: 'profiles', label: 'Profil Fertigasi', icon: Layers, desc: 'Sesuaikan target nutrisi EC/pH' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="cursor-pointer bg-white border border-[#D4DFC8] hover:border-[#7BAF5A] rounded-2xl p-4 group transition-all shadow-xs"
              >
                <div className="p-2 w-fit rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0] mb-3 group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-[#2D3B2D] block">{item.label}</span>
                    <span className="text-xs text-[#8A9B7A]">{item.desc}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#C8D9B0] group-hover:text-[#7BAF5A] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
