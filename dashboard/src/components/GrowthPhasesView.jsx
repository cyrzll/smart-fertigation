import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sprout, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { actions } from 'astro:actions';
import { goeyToast } from 'goey-toast';
import { ConfirmModal } from './ConfirmModal';

export const GrowthPhasesView = ({ apiUrl }) => {
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Modal State
  const [deletingPhaseId, setDeletingPhaseId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPhases = async () => {
    try {
      setLoading(true);
      const { data: resData, error: actionError } = await actions.getGrowthPhases();
      const json = (!actionError && resData) ? resData : await (await fetch('/api/growth-phases')).json();
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
      const payload = { name, description };
      let resData = null;
      let actionError = null;

      if (editingId) {
        const res = await actions.updateGrowthPhase({ id: editingId, data: payload });
        resData = res.data;
        actionError = res.error;
      } else {
        const res = await actions.addGrowthPhase(payload);
        resData = res.data;
        actionError = res.error;
      }

      const json = (!actionError && resData) ? resData : await (await fetch(editingId ? `/api/growth-phases/${editingId}` : '/api/growth-phases', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })).json();

      if (json.success) {
        goeyToast.success(json.message || (editingId ? 'Fase pertumbuhan diperbarui!' : 'Fase pertumbuhan ditambahkan!'));
        resetForm();
        fetchPhases();
      } else {
        goeyToast.error(json.message || 'Gagal menyimpan fase');
      }
    } catch (err) {
      goeyToast.error('Gagal terhubung ke API server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (phase) => {
    setEditingId(phase.id);
    setName(phase.name);
    setDescription(phase.description || '');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPhaseId) return;
    try {
      setDeleting(true);
      const { data: resData, error: actionError } = await actions.deleteGrowthPhase({ id: deletingPhaseId });
      if (!actionError && resData?.success) {
        goeyToast.success(resData.message || 'Fase pertumbuhan berhasil dihapus!');
        setDeletingPhaseId(null);
        fetchPhases();
      } else {
        const res = await fetch(`/api/growth-phases/${deletingPhaseId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          goeyToast.success(json.message || 'Fase pertumbuhan berhasil dihapus!');
          setDeletingPhaseId(null);
          fetchPhases();
        } else {
          goeyToast.error(json.message || 'Gagal menghapus fase pertumbuhan');
        }
      }
    } catch (err) {
      goeyToast.error('Gagal terhubung ke API server');
    } finally {
      setDeleting(false);
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
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 text-xs font-bold transition border border-slate-200 shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

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
                  onClick={() => setDeletingPhaseId(p.id)}
                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition text-xs font-bold flex items-center space-x-1 cursor-pointer"
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

      {/* Delete Growth Phase Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingPhaseId)}
        title="Hapus Fase Pertumbuhan"
        message="Apakah Anda yakin ingin menghapus fase pertumbuhan tanaman ini?"
        confirmText="Ya, Hapus Fase"
        cancelText="Batal"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingPhaseId(null)}
      />
    </motion.div>
  );
};
