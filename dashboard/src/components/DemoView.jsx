import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PlayCircle, Wifi, WifiOff, Clock, Cpu, CheckCircle2, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

export const DemoView = ({ apiUrl }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commandSending, setCommandSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchDemoData = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/demo`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemoData();
    const interval = setInterval(fetchDemoData, 3000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const handleSendCommand = async (valveId, command, durationSeconds) => {
    if (!data?.device) return;

    try {
      setCommandSending(true);
      setNotice(null);
      const res = await fetch(`${apiUrl}/api/demo/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: data.device.id,
          valve_id: valveId,
          command,
          duration_seconds: durationSeconds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: json.message });
        fetchDemoData();
      } else {
        setNotice({ type: 'error', text: json.message || 'Gagal mengirim perintah' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Gagal terhubung ke API server' });
    } finally {
      setCommandSending(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mode Demo & Manual Control</h2>
          <p className="text-slate-500 text-sm mt-1">Pengujian manual buka & tutup solenoid valve secara realtime ke mikrokontroler ESP32.</p>
        </div>
        <button
          onClick={fetchDemoData}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 text-sm font-semibold transition border border-emerald-200 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Realtime</span>
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

      {/* ESP Device Status Card */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-emerald-600" />
          <span>Status Perangkat ESP32</span>
        </h3>

        {data?.device ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Device Name</span>
              <p className="text-base font-bold text-slate-900 mt-1">{data.device.name}</p>
              <p className="text-xs font-mono text-slate-500 mt-0.5">{data.device.device_code}</p>
            </div>

            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Konektivitas</span>
              <div className="mt-1">
                {data.device.is_online ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>ONLINE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>OFFLINE</span>
                  </span>
                )}
              </div>
            </div>

            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Mode Operasional</span>
              <p className="text-base font-bold text-emerald-700 mt-1">{data.device.mode || 'AUTO'}</p>
            </div>

            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Heartbeat Terakhir</span>
              <p className="text-base font-bold text-slate-800 mt-1">
                {data.device.last_seen ? new Date(data.device.last_seen).toLocaleTimeString('id-ID') : '-'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Belum ada perangkat ESP32 yang terdaftar.</p>
        )}
      </div>

      {/* Valve Test Action Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <PlayCircle className="w-5 h-5 text-emerald-600" />
          <span>Pengujian Valve Manual</span>
        </h3>

        {data?.device && !data.device.is_online && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>ESP32 saat ini sedang offline. Perintah demo akan disimpan sebagai PENDING dan expired setelah 30 detik jika tidak di-claim.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.valves?.map((valve) => (
            <motion.div
              key={valve.id}
              whileHover={{ y: -2 }}
              className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm shadow-emerald-950/5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-base">{valve.name}</h4>
                  {valve.gpio && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                      GPIO {valve.gpio}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{valve.description || 'Tidak ada deskripsi'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-5">
                <button
                  onClick={() => handleSendCommand(valve.id, 'TEST_OPEN', 5)}
                  disabled={commandSending}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold py-2 px-3 rounded-xl text-xs transition"
                >
                  Buka 5 Detik
                </button>
                <button
                  onClick={() => handleSendCommand(valve.id, 'TEST_OPEN', 10)}
                  disabled={commandSending}
                  className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold py-2 px-3 rounded-xl text-xs transition"
                >
                  Buka 10 Detik
                </button>
                <button
                  onClick={() => handleSendCommand(valve.id, 'TEST_OPEN', 30)}
                  disabled={commandSending}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold py-2 px-3 rounded-xl text-xs transition"
                >
                  Buka 30 Detik
                </button>
                <button
                  onClick={() => handleSendCommand(valve.id, 'CLOSE')}
                  disabled={commandSending}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2 px-3 rounded-xl text-xs transition"
                >
                  Tutup Sekarang
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Command History Table */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Riwayat Eksekusi Perintah Demo</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Waktu Kirim</th>
                <th className="py-3 px-4">Target Valve</th>
                <th className="py-3 px-4">Perintah</th>
                <th className="py-3 px-4">Durasi Target</th>
                <th className="py-3 px-4 rounded-r-xl">Status Eksekusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.commands && data.commands.length > 0 ? (
                data.commands.map((cmd) => (
                  <tr key={cmd.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {new Date(cmd.created_at).toLocaleTimeString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{cmd.valve_name}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-xs">{cmd.command}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {cmd.duration_seconds ? `${cmd.duration_seconds} detik` : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {cmd.status === 'completed' && (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>COMPLETED</span>
                        </span>
                      )}
                      {cmd.status === 'running' && (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>RUNNING</span>
                        </span>
                      )}
                      {cmd.status === 'pending' && (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>PENDING</span>
                        </span>
                      )}
                      {['expired', 'failed'].includes(cmd.status) && (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{cmd.status.toUpperCase()}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                    Belum ada riwayat aktivitas demo.
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
