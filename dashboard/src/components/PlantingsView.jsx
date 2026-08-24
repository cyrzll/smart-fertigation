import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sliders, Plus } from 'lucide-react';
import { actions } from 'astro:actions';
import { goeyToast } from 'goey-toast';

export const PlantingsView = ({ apiUrl }) => {
  const [plantings, setPlantings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split('T')[0]);
  const [profileId, setProfileId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPlantings = async () => {
    try {
      setLoading(true);
      const { data: resData, error: actionError } = await actions.getPlantings();
      const json = (!actionError && resData) ? resData : await (await fetch('/api/plantings')).json();
      if (json.success) {
        setPlantings(json.plantings);
      }

      const { data: pData, error: pError } = await actions.getProfiles();
      const pJson = (!pError && pData) ? pData : await (await fetch('/api/profiles')).json();
      if (pJson.success) {
        setProfiles(pJson.profiles);
        if (pJson.profiles.length > 0 && !profileId) {
          setProfileId(pJson.profiles[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantings();
  }, [apiUrl]);

  const handleAddPlanting = async (e) => {
    e.preventDefault();
    if (!name.trim() || !plantingDate) return;

    try {
      setSubmitting(true);
      const payload = {
        name,
        planting_date: plantingDate,
        fertigation_profile_id: profileId ? parseInt(profileId.toString(), 10) : null,
      };

      const { data: resData, error: actionError } = await actions.addPlanting(payload);
      const json = (!actionError && resData) ? resData : await (await fetch('/api/plantings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })).json();

      if (json.success) {
        goeyToast.success(json.message || 'Batch penanaman berhasil ditambahkan!');
        setName('');
        fetchPlantings();
      } else {
        goeyToast.error(json.message || 'Gagal menambah penanaman');
      }
    } catch (err) {
      goeyToast.error('Gagal terhubung ke API server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      const res = await fetch(`/api/plantings/${id}/activate`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) {
        goeyToast.success(json.message || 'Batch penanaman berhasil diaktifkan!');
        fetchPlantings();
      } else {
        goeyToast.error(json.message || 'Gagal mengaktifkan batch penanaman');
      }
    } catch (err) {
      goeyToast.error('Gagal mengaktifkan penanaman');
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
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen Penanaman (Plantings)</h2>
        <p className="text-slate-500 text-sm mt-1">Buat batch penanaman baru dan pilih batch aktif untuk perhitungan HST.</p>
      </div>

      {/* Add Planting Form */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          <span>Tambah Batch Penanaman Baru</span>
        </h3>

        <form onSubmit={handleAddPlanting} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nama Batch Penanaman</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Melon Golden Batch #2"
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Tanggal Tanam</label>
            <input
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Profil Fertigasi</label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-semibold"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Simpan & Aktifkan</span>
            </button>
          </div>
        </form>
      </div>

      {/* Plantings Table */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Riwayat Batch Penanaman</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Nama Penanaman</th>
                <th className="py-3 px-4">Tanggal Tanam</th>
                <th className="py-3 px-4">Profil Fertigasi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plantings.length > 0 ? (
                plantings.map((p) => (
                  <tr key={p.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900 text-base">{p.name}</td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {new Date(p.planting_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 text-emerald-700 font-semibold">{p.profile_name || '-'}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        p.is_active
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {p.is_active ? 'AKTIF' : 'Arsip'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {!p.is_active && (
                        <button
                          onClick={() => handleActivate(p.id)}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
                        >
                          Set Sebagai Aktif
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                    {loading ? 'Memuat penanaman...' : 'Belum ada data penanaman.'}
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
