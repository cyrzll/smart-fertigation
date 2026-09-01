import { AlertTriangle, CheckCircle2, Download, RefreshCw, ShieldCheck } from 'lucide-react';

export function FirmwareUpdater({ status, updateInfo, isChecking, otaState, onCheck, onInstall }) {
  const available = Boolean(updateInfo?.update_available);
  const binaryPublished = updateInfo?.firmware_available !== false;
  const updating = Boolean(otaState?.updating);
  const progress = Number(otaState?.progress || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section className="lg:col-span-2 bg-white border border-[#D4DFC8] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#E8F2DF] text-[#5F9345] border border-[#C8D9B0]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2D3B2D]">Pembaruan Firmware OTA</h3>
              <p className="text-xs text-[#8A9B7A] mt-1 leading-relaxed">
                Dashboard memeriksa versi terbaru dari API. ESP32 mengunduh file melalui Wi-Fi dan reboot otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={onCheck}
            disabled={isChecking || updating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#C8D9B0] text-xs font-bold text-[#4F6845] hover:bg-[#F0F4EA] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Memeriksa...' : 'Cek Pembaruan'}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F7F8F4] border border-[#E0E7D8] p-4">
            <p className="text-[11px] uppercase tracking-wide font-bold text-[#8A9B7A]">Versi terpasang</p>
            <p className="mt-1 text-sm font-mono font-bold text-[#2D3B2D]">{status.firmware || '-'}</p>
          </div>
          <div className="rounded-xl bg-[#F7F8F4] border border-[#E0E7D8] p-4">
            <p className="text-[11px] uppercase tracking-wide font-bold text-[#8A9B7A]">Versi terbaru</p>
            <p className="mt-1 text-sm font-mono font-bold text-[#2D3B2D]">{updateInfo?.latest_version || 'Belum diperiksa'}</p>
          </div>
        </div>

        {updateInfo && (
          <div className={`mt-4 rounded-xl border p-4 ${!binaryPublished || available ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-start gap-2.5">
              {!binaryPublished || available ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              <div className="min-w-0">
                <p className={`text-sm font-bold ${!binaryPublished || available ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {!binaryPublished
                    ? 'File firmware belum diterbitkan oleh admin'
                    : available
                      ? `Pembaruan ${updateInfo.latest_version} tersedia`
                      : 'Firmware sudah versi terbaru'}
                </p>
                {!binaryPublished && <p className="text-xs text-[#5A6B5A] mt-1">Metadata versi tersedia, tetapi server belum memiliki `firmware.bin` hasil kompilasi.</p>}
                {updateInfo.notes && <p className="text-xs text-[#5A6B5A] mt-1 leading-relaxed">{updateInfo.notes}</p>}
                {updateInfo.size > 0 && <p className="text-[11px] text-[#8A9B7A] mt-2">Ukuran: {(updateInfo.size / 1024 / 1024).toFixed(2)} MB</p>}
              </div>
            </div>
          </div>
        )}

        {(updating || progress > 0) && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#5A6B5A] mb-2">
              <span>{otaState.message || 'Memproses firmware...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2.5 bg-[#E8EDE0] rounded-full overflow-hidden">
              <div className="h-full bg-[#7BAF5A] transition-all duration-300" style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
          </div>
        )}

        {available && (
          <button
            onClick={onInstall}
            disabled={updating || status.wifi_status !== 'CONNECTED'}
            className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white text-sm font-bold disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {updating ? `Memasang ${progress}%` : 'Unduh & Pasang Pembaruan'}
          </button>
        )}
      </section>

      <aside className="bg-[#F0F4EA] border border-[#D4DFC8] rounded-2xl p-5">
        <ShieldCheck className="w-7 h-7 text-[#5F9345]" />
        <h4 className="font-bold text-sm text-[#2D3B2D] mt-3">Sebelum memperbarui</h4>
        <ul className="mt-3 space-y-2 text-xs text-[#5A6B5A] leading-relaxed list-disc pl-4">
          <li>Pastikan Wi-Fi ESP32 terhubung dan stabil.</li>
          <li>Jangan mematikan daya selama penulisan firmware.</li>
          <li>Valve akan ditutup dan perangkat reboot setelah berhasil.</li>
          <li>Bluetooth akan terputus saat perangkat reboot.</li>
          <li>Bluetooth juga dihentikan selama download HTTPS untuk menyediakan RAM; hubungkan kembali setelah ESP reboot.</li>
        </ul>
      </aside>
    </div>
  );
}
