import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Plus, Clock, Cpu, Trash2, ToggleLeft, ToggleRight, Sprout, Tag } from 'lucide-react';
import { actions } from 'astro:actions';
import { goeyToast } from 'goey-toast';
import { ConfirmModal } from './ConfirmModal';

export const SchedulesView = ({ apiUrl }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  // Form state
  const [growthPhaseId, setGrowthPhaseId] = useState('');
  const [hstStart, setHstStart] = useState(0);
  const [hstEnd, setHstEnd] = useState(7);
  const [valveId, setValveId] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Modal State
  const [deletingScheduleId, setDeletingScheduleId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSchedules = async (profileId) => {
    try {
      setLoading(true);
      const { data: resData, error: actionError } = await actions.getSchedules({ profileId });
      const json = (!actionError && resData) ? resData : await (await fetch(profileId ? `/api/schedules?profile_id=${profileId}` : '/api/schedules')).json();
      
      if (json.success) {
        setData(json);
        if (json.profile) {
          setSelectedProfileId(json.profile.id);
        }
        if (json.valves && json.valves.length > 0 && !valveId) {
          setValveId(json.valves[0].id);
        }
        if (json.phases && json.phases.length > 0 && !growthPhaseId) {
          setGrowthPhaseId(json.phases[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules(selectedProfileId || undefined);
  }, [apiUrl, selectedProfileId]);

  const handleProfileChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setSelectedProfileId(val);
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!selectedProfileId || !valveId) return;

    try {
      setSubmitting(true);
      const payload = {
        fertigation_profile_id: selectedProfileId,
        valve_id: parseInt(valveId.toString(), 10),
        growth_phase_id: growthPhaseId ? parseInt(growthPhaseId.toString(), 10) : null,
        hst_start: parseInt(hstStart.toString(), 10),
        hst_end: parseInt(hstEnd.toString(), 10),
        start_time: startTime,
        duration_minutes: parseInt(durationMinutes.toString(), 10),
      };

      const { data: resData, error: actionError } = await actions.addSchedule(payload);
      const json = (!actionError && resData) ? resData : await (await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })).json().catch(() => ({}));

      if (json.success) {
        goeyToast.success(json.message || 'Jadwal berhasil ditambahkan!');
        fetchSchedules(selectedProfileId);
      } else {
        goeyToast.error(json.message || json.error || 'Gagal menambah jadwal');
      }
    } catch (err) {
      goeyToast.error('Gagal terhubung ke API server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const { data: resData, error: actionError } = await actions.toggleSchedule({ id });
      if (!actionError && resData?.success) {
        goeyToast.success(resData.message || 'Status jadwal berhasil diubah');
        fetchSchedules(selectedProfileId || undefined);
      } else {
        const res = await fetch(`/api/schedules/${id}/toggle`, { method: 'PATCH' });
        const json = await res.json();
        if (json.success) {
          goeyToast.success(json.message || 'Status jadwal berhasil diubah');
          fetchSchedules(selectedProfileId || undefined);
        } else {
          goeyToast.error(json.message || 'Gagal mengubah status jadwal');
        }
      }
    } catch (err) {
      goeyToast.error('Gagal mengubah status jadwal');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingScheduleId) return;
    try {
      setDeleting(true);
      const { data: resData, error: actionError } = await actions.deleteSchedule({ id: deletingScheduleId });
      if (!actionError && resData?.success) {
        goeyToast.success(resData.message || 'Jadwal berhasil dihapus!');
        setDeletingScheduleId(null);
        fetchSchedules(selectedProfileId || undefined);
      } else {
        const res = await fetch(`/api/schedules/${deletingScheduleId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          goeyToast.success(json.message || 'Jadwal berhasil dihapus!');
          setDeletingScheduleId(null);
          fetchSchedules(selectedProfileId || undefined);
        } else {
          goeyToast.error(json.message || 'Gagal menghapus jadwal');
        }
      }
    } catch (err) {
      goeyToast.error('Gagal menghapus jadwal');
    } finally {
      setDeleting(false);
    }
  };

  const schedulesList = Array.isArray(data?.schedules) ? data.schedules : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Jadwal Fertigasi Presisi</h2>
        <p className="text-slate-500 text-sm mt-1">Pengaturan matriks waktu siram otomatis berdasarkan Fase Pertumbuhan dan Rentang HST (Hari Setelah Tanam).</p>
      </div>

      {/* Active Planting Card */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Sprout className="w-4 h-4 text-emerald-600" />
          <span>Informasi Tanaman Aktif</span>
        </h3>
        {data?.planting ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Nama Penanaman</span>
              <p className="text-base font-bold text-slate-900 mt-1">{data.planting.name}</p>
            </div>
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Tanggal Tanam</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {new Date(data.planting.planting_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Usia Tanaman Hari Ini</span>
              <p className="text-base font-bold text-emerald-700 mt-1">HST {data.hst ?? 0}</p>
            </div>
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Profil Fertigasi</span>
              <p className="text-base font-bold text-slate-900 mt-1">{data.planting.profile_name || '-'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Belum ada penanaman aktif dalam sistem.</p>
        )}
      </div>

      {/* Profile Selector */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Pilih Profil Fertigasi</h3>
          <p className="text-xs text-slate-500 mt-0.5">Tampilkan dan atur jadwal khusus untuk profil tertentu</p>
        </div>
        <select
          value={selectedProfileId || ''}
          onChange={handleProfileChange}
          className="bg-slate-50 border border-emerald-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 min-w-[220px]"
        >
          {data?.profiles?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add Schedule Form */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          <span>Tambah Jadwal Penyiraman</span>
        </h3>

        <form onSubmit={handleAddSchedule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Fase Pertumbuhan</label>
              <select
                value={growthPhaseId}
                onChange={(e) => setGrowthPhaseId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="">Tanpa Fase (Umum)</option>
                {data?.phases?.map((gp) => (
                  <option key={gp.id} value={gp.id}>
                    {gp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">HST Mulai</label>
              <input
                type="number"
                min="0"
                max="365"
                value={hstStart}
                onChange={(e) => setHstStart(parseInt(e.target.value || '0', 10))}
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">HST Selesai</label>
              <input
                type="number"
                min="0"
                max="365"
                value={hstEnd}
                onChange={(e) => setHstEnd(parseInt(e.target.value || '0', 10))}
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Valve / Solenoid</label>
              <select
                value={valveId}
                onChange={(e) => setValveId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {data?.valves?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.gpio ? `(GPIO ${v.gpio})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Jam Mulai</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Durasi (Menit)</label>
              <input
                type="number"
                min="1"
                max="1440"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value || '1', 10))}
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting || !selectedProfileId}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Tambah Jadwal</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Schedules Table */}
      <div className="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm shadow-emerald-950/5 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Daftar Matriks Jadwal Penyiraman</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Fase Pertumbuhan</th>
                <th className="py-3 px-4">Rentang HST</th>
                <th className="py-3 px-4">Jam Mulai</th>
                <th className="py-3 px-4">Valve / Solenoid</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedulesList.length > 0 ? (
                schedulesList.map((schedule) => {
                  const isCurrentActive = data?.hst != null && data.hst >= schedule.hst_start && data.hst <= schedule.hst_end;

                  return (
                    <tr key={schedule.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {schedule.growth_phase_name ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <Tag className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{schedule.growth_phase_name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Umum</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                          isCurrentActive ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                        }`}>
                          HST {schedule.hst_start} - {schedule.hst_end}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-extrabold text-emerald-700 text-base">
                        {schedule.start_time.substring(0, 5)}
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {schedule.valve_name}
                        {schedule.gpio && (
                          <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                            GPIO {schedule.gpio}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {Math.floor(schedule.duration_seconds / 60)} menit ({schedule.duration_seconds} dtk)
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                          schedule.is_active
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {schedule.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggle(schedule.id)}
                          className={`p-2 rounded-xl transition border text-xs font-bold inline-flex items-center space-x-1 ${
                            schedule.is_active
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {schedule.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          <span>{schedule.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>

                        <button
                          onClick={() => setDeletingScheduleId(schedule.id)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    {loading ? 'Memuat jadwal...' : 'Belum ada jadwal penyiraman pada profil ini.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Schedule Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingScheduleId)}
        title="Hapus Jadwal Penyiraman"
        message="Apakah Anda yakin ingin menghapus jadwal penyiraman ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Jadwal"
        cancelText="Batal"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingScheduleId(null)}
      />
    </motion.div>
  );
};
