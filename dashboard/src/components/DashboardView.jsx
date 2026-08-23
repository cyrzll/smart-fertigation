import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sprout, Calendar, Clock, Cpu, ArrowRight, RefreshCw, CheckCircle2, Layers } from 'lucide-react';

export const DashboardView = ({ apiUrl, setActiveTab }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/api/dashboard`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Gagal memuat data');
      }
    } catch (err) {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [apiUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-[#2D3B2D]">Dashboard</h2>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#C8D9B0] text-[#5A6B5A] hover:border-[#7BAF5A] hover:text-[#3A6B2A] text-sm font-medium transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="border border-red-300 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboardData} className="underline text-xs font-medium">Coba lagi</button>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#8A9B7A]">Tanaman Aktif</span>
            <Sprout className="w-4 h-4 text-[#7BAF5A]" />
          </div>
          <h3 className="text-base font-bold text-[#2D3B2D] truncate">{data?.planting?.name || '-'}</h3>
          <p className="text-xs text-[#8A9B7A] mt-1 truncate">Profil: {data?.planting?.profile_name || '-'}</p>
        </div>

        <div className="bg-white border border-[#D4DFC8] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#8A9B7A]">Tanggal Tanam</span>
            <Calendar className="w-4 h-4 text-[#7BAF5A]" />
          </div>
          <h3 className="text-base font-bold text-[#2D3B2D]">
            {data?.planting?.planting_date ? new Date(data.planting.planting_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
          </h3>
        </div>

        <div className="bg-white border border-[#D4DFC8] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#8A9B7A]">Usia Tanaman</span>
            <Clock className="w-4 h-4 text-[#7BAF5A]" />
          </div>
          <h3 className="text-lg font-bold text-[#2D3B2D] flex items-center space-x-2">
            <span>{data?.hst != null ? `HST ${data.hst}` : '-'}</span>
            {data?.hst != null && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7BAF5A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7BAF5A]"></span>
              </span>
            )}
          </h3>
        </div>

        <div className="bg-white border border-[#D4DFC8] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#8A9B7A]">Valve Aktif</span>
            <Cpu className="w-4 h-4 text-[#7BAF5A]" />
          </div>
          <h3 className="text-lg font-bold text-[#2D3B2D]">{data?.valveCount ?? 0}</h3>
        </div>
      </div>

      {/* Today's Schedules */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#2D3B2D]">Jadwal Hari Ini</h3>
          <button
            onClick={() => setActiveTab('schedules')}
            className="text-xs font-medium text-[#5A8A3A] hover:text-[#3A6B2A] flex items-center space-x-1"
          >
            <span>Kelola</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8EDE0] text-xs font-medium text-[#8A9B7A]">
                <th className="py-2.5 px-3">Jam</th>
                <th className="py-2.5 px-3">Valve</th>
                <th className="py-2.5 px-3">Durasi</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F4EA]">
              {data?.todaySchedules && data.todaySchedules.length > 0 ? (
                data.todaySchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-[#F7F9F3] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#3A6B2A]">
                      {schedule.start_time.substring(0, 5)}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#2D3B2D]">
                      {schedule.valve_name}
                      {schedule.gpio && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded border border-[#D4DFC8] text-[#8A9B7A] font-mono">
                          GPIO {schedule.gpio}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#5A6B5A]">
                      {Math.floor(schedule.duration_seconds / 60)} menit
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#C8D9B0] text-[#5A8A3A]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Terjadwal</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#8A9B7A] text-sm">
                    {loading ? 'Memuat...' : 'Belum ada jadwal untuk hari ini.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Menu */}
      <div>
        <h3 className="text-base font-bold text-[#2D3B2D] mb-3">Menu Cepat</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'schedules', label: 'Jadwal Fertigasi', icon: Calendar },
            { id: 'profiles', label: 'Profil Fertigasi', icon: Layers },
            { id: 'valves', label: 'Master Valve', icon: Cpu },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="cursor-pointer bg-white border border-[#D4DFC8] hover:border-[#7BAF5A] rounded-xl p-4 group transition-all"
              >
                <Icon className="w-5 h-5 text-[#9CAF88] group-hover:text-[#7BAF5A] mb-2 transition-colors" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#2D3B2D]">{item.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C8D9B0] group-hover:text-[#7BAF5A] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
