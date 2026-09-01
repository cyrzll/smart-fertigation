import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, FileCode2, RefreshCw, UploadCloud } from 'lucide-react';
import { goeyToast } from 'goey-toast';

export const AdminFirmwareView = ({ apiUrl = '' }) => {
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [bumpType, setBumpType] = useState('patch');
  const [notes, setNotes] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [compilerOutput, setCompilerOutput] = useState('');

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` });

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch(`${apiUrl}/api/firmware/admin/status`, { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal membaca status firmware.');
      setStatus(data);
    } catch (error) {
      goeyToast.error(error.message);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [apiUrl]);

  const nextVersion = useMemo(() => status?.next_versions?.[bumpType] || '-', [status, bumpType]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) return goeyToast.error('Pilih file source firmware .ino terlebih dahulu.');
    if (!notes.trim()) return goeyToast.error('Catatan perubahan wajib diisi.');

    const body = new FormData();
    body.append('firmware', file);
    body.append('bump_type', bumpType);
    body.append('notes', notes.trim());
    body.append('mandatory', String(mandatory));

    setLoading(true);
    setCompilerOutput('');
    try {
      const response = await fetch(`${apiUrl}/api/firmware/publish`, {
        method: 'POST',
        headers: authHeaders(),
        body,
      });
      const data = await response.json();
      setCompilerOutput(data.compiler_output || data.error || '');
      if (!response.ok || !data.success) throw new Error(data.message || 'Kompilasi firmware gagal.');
      goeyToast.success(data.message);
      setFile(null);
      setNotes('');
      setMandatory(false);
      const input = document.getElementById('admin-firmware-file');
      if (input) input.value = '';
      await fetchStatus();
    } catch (error) {
      goeyToast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <form onSubmit={handleSubmit} className="xl:col-span-2 bg-white border border-[#D4DFC8] rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#E8F2DF] text-[#639447]"><UploadCloud className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-[#2D3B2D]">Upload & Compile Firmware</h3>
              <p className="text-xs text-[#8A9B7A] mt-1">Upload source `.ino`; server akan compile dan menerbitkan `.bin` jika build berhasil.</p>
            </div>
          </div>
          <button type="button" onClick={fetchStatus} disabled={loadingStatus} className="p-2 rounded-lg border border-[#D4DFC8] text-[#6F8067] disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-[#4B5F47]">File firmware `.ino`</span>
          <div className="mt-2 border-2 border-dashed border-[#C8D9B0] rounded-xl p-5 text-center bg-[#FAFBF8]">
            <FileCode2 className="w-7 h-7 mx-auto text-[#7BAF5A]" />
            <input id="admin-firmware-file" type="file" accept=".ino,text/plain" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-[#5A6B5A] file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-[#C8D9B0] file:bg-white file:text-[#4A7040] file:font-semibold" />
            {file && <p className="mt-2 text-[11px] text-[#6F8067]">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
          </div>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['patch', 'Patch', 'Perbaikan kecil'],
            ['minor', 'Minor', 'Fitur baru'],
            ['major', 'Major / Big', 'Perubahan besar'],
          ].map(([value, label, description]) => (
            <button key={value} type="button" onClick={() => setBumpType(value)} className={`text-left rounded-xl border p-3 transition ${bumpType === value ? 'border-[#7BAF5A] bg-[#F0F7EA]' : 'border-[#D4DFC8] bg-white'}`}>
              <p className="text-xs font-bold text-[#2D3B2D]">{label}</p>
              <p className="text-[11px] text-[#8A9B7A] mt-1">{description}</p>
              <p className="font-mono text-xs font-bold text-[#5F9345] mt-2">{status?.next_versions?.[value] || '-'}</p>
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs font-bold text-[#4B5F47]">Catatan perubahan</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} placeholder="Contoh: Perbaikan sensor dan stabilitas koneksi." className="mt-2 w-full rounded-xl border border-[#D4DFC8] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#7BAF5A]" />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-[#D4DFC8] p-4 cursor-pointer">
          <div>
            <p className="text-xs font-bold text-[#2D3B2D]">Pembaruan wajib</p>
            <p className="text-[11px] text-[#8A9B7A] mt-1">Tandai apabila perangkat sebaiknya segera memakai versi ini.</p>
          </div>
          <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="w-5 h-5 accent-[#7BAF5A]" />
        </label>

        <div className="rounded-xl bg-[#F0F4EA] border border-[#D4DFC8] p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#8A9B7A]">Versi yang akan diterbitkan</p>
            <p className="font-mono font-bold text-[#3A6B2A] mt-1">{nextVersion}</p>
            <p className="text-[10px] text-[#8A9B7A] mt-1">Tanggal dan waktu dibuat otomatis oleh server.</p>
          </div>
          <button type="submit" disabled={loading || !file} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7BAF5A] text-white text-xs font-bold disabled:opacity-50">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
            {loading ? 'Mengompilasi...' : 'Compile & Terbitkan'}
          </button>
        </div>

        {compilerOutput && <pre className="max-h-64 overflow-auto rounded-xl bg-[#1F2A1F] text-[#C9E7B7] p-4 text-[11px] whitespace-pre-wrap">{compilerOutput}</pre>}
      </form>

      <aside className="space-y-4">
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-5">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#7BAF5A]" /><h4 className="font-bold text-sm">Firmware aktif</h4></div>
          <dl className="mt-4 space-y-3 text-xs">
            <div><dt className="text-[#8A9B7A]">Versi</dt><dd className="font-mono font-bold mt-1">{status?.firmware?.version || '-'}</dd></div>
            <div><dt className="text-[#8A9B7A]">Dipublikasikan</dt><dd className="font-medium mt-1">{status?.firmware?.published_at ? new Date(status.firmware.published_at).toLocaleString('id-ID') : '-'}</dd></div>
            <div><dt className="text-[#8A9B7A]">Board</dt><dd className="font-mono text-[11px] mt-1 break-all">{status?.compiler?.fqbn || '-'}</dd></div>
            <div><dt className="text-[#8A9B7A]">Ukuran binary</dt><dd className="font-medium mt-1">{status?.firmware?.size ? `${(status.firmware.size / 1024 / 1024).toFixed(2)} MB` : 'Belum ada .bin'}</dd></div>
          </dl>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Server wajib memiliki `arduino-cli`, core ESP32, dan seluruh library firmware. Firmware aktif tidak akan diganti jika kompilasi gagal.</p>
        </div>
      </aside>
    </div>
  );
};
