import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sprout, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const GrowthPhasesView = ({ apiUrl }) => {
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchPhases = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/growth-phases`);
      const json = await res.json();
      if (json.success) {
        setPhases(json.phases);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhases();
  }, [apiUrl]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setNotice(null);
      const url = editingId ? `${apiUrl}/api/growth-phases/${editingId}` : `${apiUrl}/api/growth-phases`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message });
        resetForm();
        fetchPhases();
      } else {
        setNotice({ type: 'error', text: json.message || 'Gagal menyimpan fase' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Gagal terhubung ke API server' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (phase) => {
    setEditingId(phase.id);
    setName(phase.name);
    setDescription(phase.description || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus fase pertumbuhan ini?')) return;
    try {
      const res = await fetch(`${apiUrl}/api/growth-phases/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchPhases();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Master Fase Pertumbuhan Tanaman</h2>
          <p className="text-slate-500 text-sm mt-1">Kelola daftar fase pertumbuhan tanaman melon (Masa Awal, Vegetatif, Pembungaan, Penyerbukan, dll).</p>
        </div>

        <button
          onClick={fetchPhases}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 text-xs font-bold transition border border-slate-200 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {notice && (
        <div className={`px-4 py-3 rounded-2xl text-sm flex items-center space-x-2 shadow-sm ${
          notice.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Add / Edit Form */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          <span>{editingId ? 'Edit Fase Pertumbuhan' : 'Tambah Fase Pertumbuhan Baru'}</span>
        </h3>

        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nama Fase</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Vegetatif"
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Deskripsi</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Penjelasan fase pertumbuhan tanaman..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{editingId ? 'Simpan Perubahan' : 'Tambah Fase'}</span>
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-100 text-slate-600 font-bold px-3 py-2.5 rounded-xl text-xs"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Grid of Growth Phases */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.length > 0 ? (
          phases.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm shadow-emerald-950/5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Sprout className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base">{p.name}</h4>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ID #{p.id}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {p.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleEdit(p)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 transition text-xs font-bold flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-12 text-center text-slate-400 text-sm">
            {loading ? 'Memuat fase pertumbuhan...' : 'Belum ada data fase pertumbuhan.'}
          </div>
        )}
      </div>
    </motion.div>
  );
};
