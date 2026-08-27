import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sprout, Calendar, Clock, Cpu, ArrowRight, RefreshCw, CheckCircle2, 
  Layers, Droplets, Activity, Thermometer, Wind, Gauge, ShieldCheck, 
  AlertTriangle, Sparkles, TrendingUp
} from 'lucide-react';
import { actions } from 'astro:actions';

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

export const DashboardView = ({ apiUrl, setActiveTab }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveWs, setIsLiveWs] = useState(false);
  const [liveTelemetry, setLiveTelemetry] = useState(null);

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
                return {
                  ...prev,
                  latestTelemetry: newRec,
                  recentTelemetries: [newRec, ...existing.slice(0, 14)],
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
  const ecVal = currentTelemetry.ec != null && !isNaN(Number(currentTelemetry.ec)) ? Number(currentTelemetry.ec) : null;
  const suhuVal = currentTelemetry.suhu != null && !isNaN(Number(currentTelemetry.suhu)) ? Number(currentTelemetry.suhu) : null;
  const kelembabanVal = currentTelemetry.kelembaban != null && !isNaN(Number(currentTelemetry.kelembaban)) ? Number(currentTelemetry.kelembaban) : null;
  const mediaVal = currentTelemetry.media != null && !isNaN(Number(currentTelemetry.media)) ? Number(currentTelemetry.media) : null;
  const levelAirVal = currentTelemetry.level_air != null && !isNaN(Number(currentTelemetry.level_air)) ? Number(currentTelemetry.level_air) : null;

  // Status helper untuk nilai pH
  const getPhStatus = (ph) => {
    if (ph == null) return { label: 'Tidak Terhubung', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
    if (ph < 5.5) return { label: 'Asam (Rendah)', color: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
    if (ph <= 6.8) return { label: 'Ideal (Optimal)', color: 'bg-[#E8F2DF] text-[#3A6B2A] border-[#C8D9B0]', dot: 'bg-[#7BAF5A]' };
    return { label: 'Basa (Tinggi)', color: 'bg-blue-50 text-blue-700 border-blue-300', dot: 'bg-blue-500' };
  };

  const phStatus = getPhStatus(phVal);

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
            Pemantauan telemetri pH air dan jadwal fertigasi realtime
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#D4DFC8] bg-white text-xs font-semibold shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isLiveWs ? 'bg-[#7BAF5A] animate-pulse' : 'bg-slate-400'}`} />
            <span className={isLiveWs ? 'text-[#3A6B2A]' : 'text-slate-500'}>
              {isLiveWs ? 'Live WebSocket' : 'Polling Aktif'}
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
      {/* REAL-TIME SENSOR pH AIR (FOCUSED MONITORING)                               */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#7BAF5A]" />
            <h3 className="text-sm font-bold text-[#2D3B2D] uppercase tracking-wider">
              Telemetri Sensor pH Realtime
            </h3>
          </div>
          <span className="text-[11px] text-[#8A9B7A] font-mono">
            {currentTelemetry.created_at ? `Update: ${formatWibTime(currentTelemetry.created_at)}` : 'Sinkronisasi Otomatis'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Card Utama: SENSOR pH AIR (2 Kolom) */}
          <div className="lg:col-span-2 bg-white border-2 border-[#C8D9B0] hover:border-[#7BAF5A] rounded-2xl p-5 shadow-xs transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2D3B2D]">Sensor pH Air Tandon</h4>
                  <p className="text-[11px] text-[#8A9B7A]">Modul pH-4502C pada GPIO 34 (ADC1)</p>
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
                  5.5 - 6.5 (Rentang Ideal Fertigasi)
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

          {/* Card Panduan & Rekomendasi Nutrisi (1 Kolom) */}
          <div className="bg-white border border-[#D4DFC8] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 pb-2.5 border-b border-[#E8EDE0]">
                <Sparkles className="w-4 h-4 text-[#7BAF5A]" />
                <h4 className="text-xs font-bold text-[#2D3B2D] uppercase tracking-wider">
                  Panduan Kualitas Air
                </h4>
              </div>

              <div className="mt-3 space-y-2 text-xs text-[#5A6B5A]">
                <div className="p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E8EDE0]">
                  <span className="text-[#8A9B7A] block text-[10px] font-medium uppercase">Target Fertigasi</span>
                  <span className="font-bold text-[#2D3B2D] text-sm mt-0.5 block">pH 5.50 – 6.50</span>
                </div>

                <p className="text-[11px] leading-relaxed text-[#5A6B5A]">
                  {phVal === null ? (
                    'Menunggu data telemetri dari mikrokontroler ESP32...'
                  ) : phVal < 5.5 ? (
                    '⚠️ pH air terlalu asam. Disarankan menambahkan larutan pH Up agar akar tanaman dapat menyerap unsur hara secara optimal.'
                  ) : phVal <= 6.8 ? (
                    '✅ pH air dalam rentang ideal. Penyerapan unsur N-P-K dan mikronutrisi oleh tanaman berjalan optimal.'
                  ) : (
                    '⚠️ pH air cenderung basa. Disarankan menambahkan larutan pH Down / asam nitrat encer untuk menurunkan ke rentang 6.0.'
                  )}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8EDE0] flex items-center justify-between text-[11px] text-[#8A9B7A]">
              <span>Status Probe:</span>
              <span className="font-semibold text-[#3A6B2A]">
                {phVal !== null ? 'Terhubung (GPIO 34)' : 'Tidak Terhubung'}
              </span>
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
          <p className="text-xs text-[#8A9B7A] mt-1 truncate">Profil: {data?.planting?.profile_name || 'Standard Fertigasi'}</p>
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
      {/* RIWAYAT PENCATATAN TELEMETRI pH BERKALA                                   */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#D4DFC8] rounded-2xl p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8EDE0]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D3B2D]">Riwayat Pemantauan Sensor pH Berkala</h3>
              <p className="text-[11px] text-[#8A9B7A]">Pencatatan data otomatis setiap beberapa menit dari ESP32</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#D4DFC8] bg-[#FAFAF7] text-[#5A6B5A]">
              {data?.recentTelemetries?.length || 0} Rekaman Terakhir
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E8EDE0] text-xs font-semibold text-[#8A9B7A] bg-[#FAFAF7]">
                <th className="py-2.5 px-3 rounded-l-lg">Waktu (WIB)</th>
                <th className="py-2.5 px-3">Nilai Sensor pH</th>
                <th className="py-2.5 px-3">Kategori pH</th>
                <th className="py-2.5 px-3">Target Ideal</th>
                <th className="py-2.5 px-3">Perangkat</th>
                <th className="py-2.5 px-3 text-right rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE0]">
              {data?.recentTelemetries && data.recentTelemetries.length > 0 ? (
                data.recentTelemetries.map((row, idx) => {
                  const rowPh = row.ph != null && !isNaN(Number(row.ph)) ? Number(row.ph) : null;
                  const st = getPhStatus(rowPh);
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${st.dot}`} />
                          <span>{st.label}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#5A6B5A]">
                        5.50 – 6.50
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
                  <td colSpan={6} className="py-6 text-center text-[#8A9B7A] text-xs">
                    {loading ? 'Memuat data telemetri...' : 'Belum ada rekaman telemetri. Data akan otomatis tercatat saat ESP32 terhubung.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
