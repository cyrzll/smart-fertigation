import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Plus, Trash2, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, Edit2, X, Sliders, Zap } from 'lucide-react';
import { actions } from 'astro:actions';
import { goeyToast } from 'goey-toast';
import { ConfirmModal } from './ConfirmModal';

const GPIO_PRESETS = [
  { pin: '25', label: 'GPIO 25 — Solenoid Valve 1 / Zona A (Default)' },
  { pin: '26', label: 'GPIO 26 — Solenoid Valve 2 / Zona B (Default)' },
  { pin: '4',  label: 'GPIO 4 — Solenoid 3 / Relay Eksternal' },
  { pin: '27', label: 'GPIO 27 — Relay 4' },
  { pin: '14', label: 'GPIO 14 — Relay 5' },
  { pin: '12', label: 'GPIO 12 — Relay 6' },
  { pin: '13', label: 'GPIO 13 — Relay 7' },
  { pin: '32', label: 'GPIO 32 — Relay 8' },
  { pin: '33', label: 'GPIO 33 — Relay 9' },
];

export const ValvesView = ({ apiUrl }) => {
  const [valves, setValves] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [gpio, setGpio] = useState('25');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editingValve, setEditingValve] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDeviceId, setEditDeviceId] = useState('');
  const [editGpio, setEditGpio] = useState('25');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete Confirm Modal State
  const [deletingValveId, setDeletingValveId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchValves = async () => {
    try {
      setLoading(true);
      const { data: resData, error: actionError } = await actions.getValves();
      const json = (!actionError && resData) ? resData : await (await fetch('/api/valves')).json();
      if (json.success) {
        setValves(json.valves || []);
        if (json.devices && json.devices.length > 0) {
          setDevices(json.devices);
          setDeviceId((prev) => prev || json.devices[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValves();
  }, [apiUrl]);

  const handleAddValve = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        device_id: deviceId ? Number(deviceId) : null,
        gpio: gpio.toString().trim(),
        description: description.trim(),
      };
      const { data: resData, error: actionError } = await actions.addValve(payload);
      const json = (!actionError && resData) ? resData : await (await fetch('/api/valves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })).json();

      if (json.success) {
        goeyToast.success(json.message || 'Valve berhasil ditambahkan!');
        setName('');
        setDescription('');
        fetchValves();
      } else {
        goeyToast.error(json.message || 'Gagal menambah valve');
      }
    } catch (err) {
      goeyToast.error('Gagal terhubung ke API server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateValve = async (e) => {
    e.preventDefault();
    if (!editingValve || !editName.trim()) return;

    try {
      setUpdating(true);
      const payload = {
        name: editName.trim(),
        device_id: editDeviceId ? Number(editDeviceId) : null,
        gpio: editGpio.toString().trim(),
        description: editDescription.trim(),
      };
      const { data: resData, error: actionError } = await actions.updateValve({ id: editingValve.id, data: payload });
      const json = (!actionError && resData) ? resData : await (await fetch(`/api/valves/${editingValve.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })).json();

      if (json.success) {
        goeyToast.success(json.message || 'Valve berhasil diperbarui!');
        setEditingValve(null);
        fetchValves();
      } else {
        goeyToast.error(json.message || 'Gagal memperbarui valve');
      }
    } catch (err) {
      goeyToast.error('Gagal terhubung ke API server');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const { data: resData, error: actionError } = await actions.toggleValve({ id });
      if (!actionError && resData?.success) {
        goeyToast.success(resData.message || 'Status valve berhasil diubah');
        fetchValves();
      } else {
        const res = await fetch(`/api/valves/${id}/toggle`, { method: 'PATCH' });
        const json = await res.json();
        if (json.success) {
          goeyToast.success(json.message || 'Status valve berhasil diubah');
          fetchValves();
        } else {
          goeyToast.error(json.message || 'Gagal mengubah status valve');
        }
      }
    } catch (err) {
      goeyToast.error('Gagal mengubah status valve');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingValveId) return;
    try {
      setDeleting(true);
      const { data: resData, error: actionError } = await actions.deleteValve({ id: deletingValveId });
      if (!actionError && resData?.success) {
        goeyToast.success(resData.message || 'Valve berhasil dihapus!');
        setDeletingValveId(null);
        fetchValves();
      } else {
        const res = await fetch(`/api/valves/${deletingValveId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          goeyToast.success(json.message || 'Valve berhasil dihapus!');
          setDeletingValveId(null);
          fetchValves();
        } else {
          goeyToast.error(json.message || 'Gagal menghapus valve');
        }
      }
    } catch (err) {
      goeyToast.error('Gagal terhubung ke API server');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Master Solenoid Valve</h2>
        <p className="text-slate-500 text-sm mt-1">Kelola daftar valve dan konfigurasi pin GPIO relay ESP32.</p>
      </div>

      {/* Add Valve Form */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          <span>Tambah Valve Baru</span>
        </h3>

        <form onSubmit={handleAddValve} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nama Valve</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Valve 1 (Zona Barat)"
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-semibold"
            />
          </div>

          {/* Perangkat ESP32 Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Perangkat ESP32
            </label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-semibold cursor-pointer"
            >
              {devices.length > 0 ? (
                devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.device_code} ({d.device_code})
                  </option>
                ))
              ) : (
                <option value="">ESP32 Utama (Default)</option>
              )}
            </select>
          </div>

          {/* GPIO Pin Dropdown / Input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              GPIO Pin ESP32
            </label>
            <select
              value={gpio}
              onChange={(e) => setGpio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono font-semibold cursor-pointer"
            >
              {GPIO_PRESETS.map((preset) => (
                <option key={preset.pin} value={preset.pin}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Deskripsi / Lokasi</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Polybag Baris 1 - 10"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-semibold"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Simpan Valve</span>
            </button>
          </div>
        </form>
      </div>

      {/* Valves Table */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Daftar Valve Relay</h3>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            {valves.length} Valve Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Nama Valve</th>
                <th className="py-3 px-4">Perangkat ESP32</th>
                <th className="py-3 px-4">GPIO ESP32</th>
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {valves.length > 0 ? (
                valves.map((valve) => (
                  <tr key={valve.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900 text-base">{valve.name}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1.5 font-semibold text-slate-800 text-xs">
                        <Cpu className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{valve.device_name || 'ESP32 Default'}</span>
                        {valve.device_code && (
                          <span className="text-[10px] font-mono text-slate-400">({valve.device_code})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono">
                      {valve.gpio ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 border border-emerald-200 font-bold text-xs inline-flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          <span>GPIO {valve.gpio}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">{valve.description || '-'}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        valve.is_active
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {valve.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingValve(valve);
                          setEditName(valve.name);
                          setEditDeviceId(valve.device_id || (devices[0]?.id || ''));
                          setEditGpio(valve.gpio || '25');
                          setEditDescription(valve.description || '');
                        }}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                        title="Edit Valve"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleToggle(valve.id)}
                        className={`p-2 rounded-xl transition border text-xs font-bold inline-flex items-center space-x-1 cursor-pointer ${
                          valve.is_active
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {valve.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        <span>{valve.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                      </button>

                      <button
                        onClick={() => setDeletingValveId(valve.id)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                    {loading ? 'Memuat valve...' : 'Belum ada data valve.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Valve Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingValveId)}
        title="Hapus Master Valve"
        message="Apakah Anda yakin ingin menghapus valve ini? Pastikan valve tidak sedang aktif digunakan dalam jadwal fertigasi otomatis."
        confirmText="Ya, Hapus Valve"
        cancelText="Batal"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingValveId(null)}
      />

      {/* Edit Valve Modal */}
      <AnimatePresence>
        {editingValve && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingValve(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white border border-emerald-100 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base text-slate-900">Edit Konfigurasi Valve</h3>
                </div>
                <button
                  onClick={() => setEditingValve(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateValve} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Nama Valve</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Perangkat ESP32 Terkait</label>
                  <select
                    value={editDeviceId}
                    onChange={(e) => setEditDeviceId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {devices.length > 0 ? (
                      devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.device_code} ({d.device_code})
                        </option>
                      ))
                    ) : (
                      <option value="">ESP32 Default</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">GPIO Pin ESP32</label>
                  <select
                    value={editGpio}
                    onChange={(e) => setEditGpio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {GPIO_PRESETS.map((preset) => (
                      <option key={preset.pin} value={preset.pin}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Deskripsi / Lokasi</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingValve(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
