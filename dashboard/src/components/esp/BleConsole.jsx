import { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Copy,
  Send,
  Check,
} from 'lucide-react';

export function BleConsole({ logs, onSendCommand, onClearLogs }) {
  const [customCmd, setCustomCmd] = useState('{"cmd":"GET_STATUS"}');
  const [filter, setFilter] = useState('ALL'); // ALL, TX, RX, SYS
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!customCmd.trim()) return;

    try {
      const parsed = JSON.parse(customCmd);
      await onSendCommand(parsed);
    } catch (err) {
      alert('Format JSON tidak valid: ' + err.message);
    }
  };

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.direction}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.direction === filter;
  });

  const shortcuts = [
    { label: 'Status', cmd: { cmd: 'GET_STATUS' } },
    { label: 'Scan Wi-Fi', cmd: { cmd: 'SCAN_WIFI' } },
    { label: 'LED Blink', cmd: { cmd: 'TEST_LED', times: 3 } },
    { label: 'Valve 1 Buka', cmd: { cmd: 'VALVE_CONTROL', gpio: 25, action: 'OPEN', duration: 5 } },
    { label: 'Restart ESP', cmd: { cmd: 'RESTART' } },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Console Header */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#2D3B2D]">Konsol Log & Terminal BLE</h3>
              <p className="text-[10px] sm:text-xs text-[#8A9B7A]">Inspeksi paket JSON dua arah GATT RX/TX</p>
            </div>
          </div>

          {/* Console Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {/* Filter Pills */}
            <div className="flex items-center bg-[#F0F4EA] rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-[#D4DFC8] text-[10px] sm:text-[11px]">
              {['ALL', 'TX', 'RX', 'SYS'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg font-mono transition cursor-pointer ${
                    filter === f
                      ? 'bg-[#7BAF5A] text-white font-bold shadow-2xs'
                      : 'text-[#5A6B5A] hover:text-[#2D3B2D]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-[#5A6B5A] cursor-pointer ml-0.5 sm:ml-1 shrink-0">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-[#D4DFC8] text-[#7BAF5A] focus:ring-[#7BAF5A] w-3.5 h-3.5"
              />
              <span className="hidden xs:inline">Auto Scroll</span>
            </label>

            <button
              onClick={handleCopy}
              title="Salin Log"
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white border border-[#C8D9B0] text-[#5A6B5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA] hover:border-[#7BAF5A] transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7BAF5A]" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <button
              onClick={onClearLogs}
              title="Bersihkan Log"
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white border border-[#C8D9B0] text-[#5A6B5A] hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Display - No dark background, clean light styling */}
        <div
          ref={logContainerRef}
          className="rounded-xl p-3 sm:p-4 border border-[#D4DFC8] bg-[#F9FAF6] font-mono text-[11px] sm:text-xs h-[260px] sm:h-[320px] overflow-y-auto space-y-1.5 sm:space-y-2 select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#8A9B7A] text-xs">
              Menunggu transmisi data Bluetooth...
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isTx = log.direction === 'TX';
              const isRx = log.direction === 'RX';
              const isErr = log.direction === 'ERR';

              return (
                <div key={log.id} className="flex items-start gap-1.5 sm:gap-2.5 leading-relaxed">
                  <span className="text-[#8A9B7A] shrink-0 select-none text-[10px] sm:text-[11px]">[{log.timestamp}]</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold shrink-0 flex items-center gap-0.5 sm:gap-1 ${
                      isTx
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : isRx
                        ? 'bg-[#E8F2DF] text-[#3A6B2A] border border-[#C8D9B0]'
                        : isErr
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-[#F0F4EA] text-[#5A6B5A] border border-[#D4DFC8]'
                    }`}
                  >
                    {isTx && <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                    {isRx && <ArrowDownLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                    {log.direction}
                  </span>
                  <span
                    className={`break-all text-[10px] sm:text-xs ${
                      isTx
                        ? 'text-cyan-800'
                        : isRx
                        ? 'text-[#2D3B2D]'
                        : isErr
                        ? 'text-red-700'
                        : 'text-[#5A6B5A]'
                    }`}
                  >
                    {log.text}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Preset Command Shortcuts & Input */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-[11px] text-[#8A9B7A] font-semibold shrink-0">Shortcut:</span>
          {shortcuts.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSendCommand(s.cmd)}
              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl bg-[#F9FAF6] border border-[#D4DFC8] hover:border-[#7BAF5A] text-[#5A6B5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA] transition font-mono active:scale-95 cursor-pointer shadow-2xs"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Raw JSON Command Input */}
        <form onSubmit={handleSend} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={customCmd}
              onChange={(e) => setCustomCmd(e.target.value)}
              placeholder='{"cmd": "GET_STATUS"}'
              className="w-full pl-3 sm:pl-3.5 pr-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#F9FAF6] border border-[#D4DFC8] focus:border-[#7BAF5A] focus:outline-none text-[11px] sm:text-xs text-[#2D3B2D] font-mono"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#7BAF5A] hover:bg-[#6A9E49] text-white font-bold text-[11px] sm:text-xs transition active:scale-95 shadow-xs shrink-0 cursor-pointer"
          >
            <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Kirim JSON</span>
            <span className="xs:hidden">Kirim</span>
          </button>
        </form>
      </div>
    </div>
  );
}
