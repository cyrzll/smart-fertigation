import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PlayCircle, Wifi, WifiOff, Clock, Cpu, CheckCircle2, AlertCircle, RefreshCw, XCircle, Zap } from 'lucide-react';
import { actions } from 'astro:actions';
import { goeyToast } from 'goey-toast';

// Asia/Jakarta (WIB) Time Formatter
const formatWibTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(dateStr));
  } catch (_) {
    return new Date(dateStr).toLocaleTimeString('id-ID');
  }
};

const formatWibFull = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(dateStr)) + ' WIB';
  } catch (_) {
    return new Date(dateStr).toLocaleTimeString('id-ID');
  }
};

export const DemoView = ({ apiUrl }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commandSending, setCommandSending] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Real-time WebSocket connection state
  const [wsOnlineDevices, setWsOnlineDevices] = useState(new Set());
  const [isWsConnected, setIsWsConnected] = useState(false);

  const fetchDemoData = async () => {
    try {
      const { data: resData, error: actionError } = await actions.getDemo();
      const json = (!actionError && resData) ? resData : await (await fetch('/api/demo')).json();
      if (json.success) {
        setData(json);
        if (json.devices && json.devices.length > 0) {
          setSelectedDeviceId((prev) => {
            const exists = json.devices.some((d) => d.id === prev);
            return exists ? prev : json.devices[0].id;
          });
        }
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

    let ws;
    let reconnectTimer;
    const connectWs = () => {
      try {
        let wsUrl = 'ws://localhost:3001/ws/dashboard';
        if (typeof window !== 'undefined') {
          const isHttps = window.location.protocol === 'https:';
          const protocol = isHttps ? 'wss:' : 'ws:';
          if (isHttps) {
            // Production HTTPS environment
            if (window.location.hostname.includes('tirtaruna.site')) {
              wsUrl = 'wss://api.tirtaruna.site/ws/dashboard';
            } else {
              wsUrl = `wss://${window.location.host}/ws/dashboard`;
            }
          } else {
            const host = window.location.hostname || 'localhost';
            wsUrl = `ws://${host}:3001/ws/dashboard`;
          }
        }

        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setIsWsConnected(true);
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'DEVICES_ONLINE_SNAPSHOT') {
              setWsOnlineDevices(new Set(msg.online_devices || []));
            } else if (msg.type === 'DEVICE_STATUS') {
              setWsOnlineDevices((prev) => {
                const next = new Set(prev);
                if (msg.is_online) {
                  if (msg.device_code) next.add(msg.device_code);
                  if (msg.serial_code) next.add(msg.serial_code);
                } else {
                  if (msg.device_code) next.delete(msg.device_code);
                  if (msg.serial_code) next.delete(msg.serial_code);
                }
                return next;
              });

              // Live update last_seen and is_online in state
              setData((prevData) => {
                if (!prevData) return prevData;
                const updateDeviceObj = (d) =>
                  d.device_code === msg.device_code || d.serial_code === msg.serial_code
                    ? { ...d, last_seen: msg.last_seen || new Date().toISOString(), is_online: msg.is_online }
                    : d;

                return {
                  ...prevData,
                  device: prevData.device ? updateDeviceObj(prevData.device) : null,
                  devices: Array.isArray(prevData.devices) ? prevData.devices.map(updateDeviceObj) : [],
                };
              });
            } else if (['COMMAND_STATUS', 'COMMAND_NEW'].includes(msg.type)) {
              fetchDemoData();
            }
          } catch (_) {}
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setIsWsConnected(false);
        };
      } catch (_) {}
    };

    connectWs();

    return () => {
      clearInterval(interval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) try { ws.close(); } catch (_) {}
    };
  }, [apiUrl]);

  const deviceList = data?.devices && data.devices.length > 0 ? data.devices : (data?.device ? [data.device] : []);
  const selectedDevice = deviceList.find((d) => d.id === selectedDeviceId) || deviceList[0] || null;

  const isDeviceOnline = (dev) => {
    if (!dev) return false;
    return (
      (dev.device_code && wsOnlineDevices.has(dev.device_code)) ||
      (dev.serial_code && wsOnlineDevices.has(dev.serial_code)) ||
      Boolean(dev.is_online)
    );
  };

  const currentDeviceOnline = isDeviceOnline(selectedDevice);

  const handleSendCommand = async (valveId, command, durationSeconds) => {
    if (!selectedDevice) return;

    try {
      setCommandSending(true);
      const res = await fetch('/api/demo/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDevice.id,
          valve_id: valveId,
          command,
          duration_seconds: durationSeconds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        goeyToast.success(json.message || 'Perintah berhasil dikirim ke ESP32');
        fetchDemoData();
      } else {
        goeyToast.error(json.message || 'Gagal mengirim perintah');
      }
    } catch (err) {
      goeyToast.error('Gagal terhubung ke API server');
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
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 text-sm font-semibold transition border border-emerald-200 shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Realtime</span>
        </button>
      </div>

      {/* ESP Device Status Card with Selector */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm shadow-emerald-950/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>Status Perangkat ESP32</span>
          </h3>

          {/* Multiple Devices Selector Dropdown */}
          {deviceList.length > 1 && (
            <div className="flex items-center space-x-2">
              <label htmlFor="device-select" className="text-xs font-bold text-slate-500">
                Pilih Perangkat:
              </label>
              <select
                id="device-select"
                value={selectedDeviceId || ''}
                onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                className="px-3 py-1.5 bg-emerald-50/70 border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
              >
                {deviceList.map((d) => {
                  const online = isDeviceOnline(d);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.name || d.device_code} ({d.device_code}) — {online ? '🟢 Online' : '⚪ Offline'}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {selectedDevice ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Device Name</span>
              <p className="text-base font-bold text-slate-900 mt-1">{selectedDevice.name || 'ESP32 Device'}</p>
              <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedDevice.device_code || '-'}</p>
            </div>

            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Konektivitas</span>
              <div className="mt-1">
                {currentDeviceOnline ? (
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
              <p className="text-base font-bold text-emerald-700 mt-1">{selectedDevice.mode || 'AUTO'}</p>
            </div>

            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-500 font-semibold">Terakhir Aktif</span>
              <p className="text-base font-bold text-slate-800 mt-1">
                {formatWibFull(selectedDevice.last_seen)}
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

        {selectedDevice && !currentDeviceOnline && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>ESP32 ({selectedDevice.name || selectedDevice.device_code}) saat ini sedang offline. Hubungkan ESP32 ke internet untuk eksekusi instan.</span>
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
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer"
                >
                  Buka 5 Detik
                </button>
                <button
                  onClick={() => handleSendCommand(valve.id, 'TEST_OPEN', 10)}
                  disabled={commandSending}
                  className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer"
                >
                  Buka 10 Detik
                </button>
                <button
                  onClick={() => handleSendCommand(valve.id, 'TEST_OPEN', 30)}
                  disabled={commandSending}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer"
                >
                  Buka 30 Detik
                </button>
                <button
                  onClick={() => handleSendCommand(valve.id, 'CLOSE')}
                  disabled={commandSending}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer"
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
        <h3 className="text-lg font-bold text-slate-900 mb-4">Riwayat Eksekusi Perintah Demo (WIB)</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Waktu Kirim (WIB)</th>
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
                      {formatWibTime(cmd.created_at)} WIB
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{cmd.valve_name}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-xs">{cmd.command}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {cmd.duration_seconds ? `${cmd.duration_seconds} detik` : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {cmd.status === 'completed' && (
                        <span title={cmd.message || 'Berhasil dieksekusi oleh ESP32'} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>COMPLETED</span>
                        </span>
                      )}
                      {cmd.status === 'running' && (
                        <span title={cmd.message || 'Sedang dieksekusi...'} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>RUNNING</span>
                        </span>
                      )}
                      {cmd.status === 'pending' && (
                        <span title={cmd.message || 'Menunggu ESP32 online'} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>PENDING</span>
                        </span>
                      )}
                      {['expired', 'failed'].includes(cmd.status) && (
                        <div className="flex flex-col items-start gap-0.5">
                          <span title={cmd.message || 'Gagal mengeksekusi perintah'} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{cmd.status.toUpperCase()}</span>
                          </span>
                          {cmd.message && (
                            <span className="text-[10px] text-red-600 font-medium max-w-[180px] truncate" title={cmd.message}>
                              {cmd.message}
                            </span>
                          )}
                        </div>
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
