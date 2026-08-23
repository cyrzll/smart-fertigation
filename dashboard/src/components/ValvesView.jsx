import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Cpu, Plus, Trash2, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const ValvesView = ({ apiUrl }) => {
  const [valves, setValves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [gpio, setGpio] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchValves = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/valves`);
      const json = await res.json();
      if (json.success) {
        setValves(json.valves);
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
      setNotice(null);
      const res = await fetch(`${apiUrl}/api/valves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gpio, description }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message });
        setName('');
        setGpio('');
        setDescription('');
        fetchValves();
      } else {
        setNotice({ type: 'error', text: json.message || 'Gagal menambah valve' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Gagal terhubung ke API server' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/api/valves/${id}/toggle`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) fetchValves();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus valve ini?')) return;
    try {
      const res = await fetch(`${apiUrl}/api/valves/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchValves();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
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

      {notice && (
        <div className={`px-4 py-3 rounded-2xl text-sm flex items-center space-x-2 shadow-sm ${
          notice.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Add Valve Form */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          <span>Tambah Valve Baru</span>
        </h3>

        <form onSubmit={handleAddValve} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
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

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">GPIO Pin ESP32</label>
            <input
              type="text"
              value={gpio}
              onChange={(e) => setGpio(e.target.value)}
              placeholder="Contoh: 25"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono font-semibold"
            />
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

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Simpan Valve</span>
            </button>
          </div>
        </form>
      </div>

      {/* Valves Table */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Daftar Valve Relay</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Nama Valve</th>
                <th className="py-3 px-4">GPIO ESP32</th>
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {valves.length > 0 ? (
                valves.map((valve) => (
                  <tr key={valve.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900 text-base">{valve.name}</td>
                    <td className="py-4 px-4 font-mono">
                      {valve.gpio ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 border border-emerald-200 font-bold">
                          GPIO {valve.gpio}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">{valve.description || '-'}</td>
                    <td className="py-4 px-4">
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
                        onClick={() => handleToggle(valve.id)}
                        className={`p-2 rounded-xl transition border text-xs font-bold inline-flex items-center space-x-1 ${
                          valve.is_active
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {valve.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        <span>{valve.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(valve.id)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold inline-flex items-center space-x-1 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                    {loading ? 'Memuat valve...' : 'Belum ada data valve.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
