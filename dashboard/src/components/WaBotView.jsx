import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, RefreshCw, Send, CheckCircle2, AlertCircle, Phone, LogOut, ShieldCheck, Zap,
  Activity, Thermometer, Calendar, Settings, Sprout, ToggleRight, Wrench, HelpCircle, Smartphone, Cpu
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/axios';

export const WaBotView = () => {
  const [waStatus, setWaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchWaStatus = async () => {
    try {
      const res = await api.get('/api/wa/status');
      if (res.data.success) {
        setWaStatus(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !messageText.trim()) return;

    try {
      setSending(true);
      setNotice(null);
      const res = await api.post('/api/wa/send', { phone, message: messageText });
      if (res.data.success) {
        setNotice({ type: 'success', text: 'Pesan berhasil dikirim!' });
        setMessageText('');
      } else {
        setNotice({ type: 'error', text: res.data.message || res.data.error || 'Gagal mengirim pesan' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal terhubung ke server';
      setNotice({ type: 'error', text: msg });
    } finally {
      setSending(false);
    }
  };

  const handleRestartBot = async () => {
    if (!confirm('Yakin ingin merestart WhatsApp Bot?')) return;
    try {
      setLoading(true);
      const res = await api.post('/api/wa/restart');
      if (res.data.success) {
        setNotice({ type: 'success', text: 'WhatsApp Bot direstart.' });
        fetchWaStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = waStatus?.state === 'connected';

  const menuCards = [
    { id: 1, title: 'Status Sistem', keyword: 'STATUS', icon: Activity, sample: '🌱 Tanaman: Melon\nHST: 11 | Profil: Melon Standar\nESP32: 🟢 ONLINE | Mode: AUTO' },
    { id: 2, title: 'Kondisi Sensor', keyword: 'SENSOR', icon: Thermometer, sample: '🌡️ Suhu: 29.4°C | Kelembaban: 76%\nMedia: 63% | Air: 72%\nEC: 1.8 mS/cm | pH: 6.2' },
    { id: 3, title: 'Jadwal Hari Ini', keyword: 'JADWAL', icon: Calendar, sample: '📅 HST 11 (Vegetatif)\n1. 06:00 Valve 1 3 menit\n2. 12:00 Valve 1 3 menit' },
    { id: 4, title: 'Setting Jadwal', keyword: 'SETTING', icon: Settings, sample: '📋 Pilih Profil:\n1. Melon Standar\n2. Melon Eksperimen' },
    { id: 5, title: 'Data Penanaman', keyword: 'TANAMAN', icon: Sprout, sample: '🌱 Melon Greenhouse A\nTanam: 10-08-2026 | HST: 11\nFase: Vegetatif | Status: Aktif' },
    { id: 6, title: 'Status Valve', keyword: 'VALVE', icon: ToggleRight, sample: '🚰 Valve 1 (Zona A): OFF\nValve 2 (Zona B): OFF\nMode: AUTO' },
    { id: 7, title: 'Test Valve', keyword: 'TEST', icon: Wrench, sample: '🧪 Pilih Valve & Durasi:\nON 1 10 → Buka V1 10 detik\nOFF 1 → Tutup V1' },
    { id: 8, title: 'Bantuan', keyword: 'BANTUAN', icon: HelpCircle, sample: '📖 Perintah: MENU, STATUS,\nSENSOR, JADWAL, TANAMAN,\nVALVE, TEST VALVE, BANTUAN' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#2D3B2D]">WhatsApp Bot</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchWaStatus}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#C8D9B0] text-[#5A6B5A] hover:border-[#7BAF5A] hover:text-[#3A6B2A] text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleRestartBot}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center space-x-2 border ${
          notice.type === 'success' ? 'border-[#C8D9B0] text-[#3A6B2A]' : 'border-red-300 text-red-600'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Connection & Send Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Status & QR */}
        <div className="lg:col-span-5 bg-white border border-[#D4DFC8] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2D3B2D] flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-[#7BAF5A]" />
              <span>Status</span>
            </h3>
            {isConnected ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#C8D9B0] text-[#5A8A3A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7BAF5A] animate-ping" />
                <span>Terhubung</span>
              </span>
            ) : waStatus?.state === 'qr_ready' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-300 text-amber-600">Scan QR</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#D4DFC8] text-[#8A9B7A]">{waStatus?.state || 'Terputus'}</span>
            )}
          </div>

          {isConnected ? (
            <div className="border border-[#C8D9B0] rounded-xl p-4 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#7BAF5A] mx-auto" />
              <p className="text-sm font-semibold text-[#2D3B2D]">{waStatus.connectedUser?.name || 'WA Bot'}</p>
              <p className="text-xs font-mono text-[#5A8A3A]">+{waStatus.connectedUser?.phone || waStatus.connectedUser?.id}</p>
            </div>
          ) : waStatus?.qrCode ? (
            <div className="border border-amber-300 rounded-xl p-4 text-center space-y-3">
              <p className="text-xs text-amber-600">Scan QR dengan WhatsApp:</p>
              <div className="p-3 bg-white rounded-lg inline-block border border-[#E8EDE0]">
                <QRCodeSVG value={waStatus.qrCode} size={170} />
              </div>
            </div>
          ) : (
            <div className="border border-[#E8EDE0] rounded-xl p-6 text-center text-[#8A9B7A]">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#7BAF5A]" />
              <p className="text-xs mt-2">Menyiapkan koneksi...</p>
            </div>
          )}

          {/* Pipeline */}
          <div className="pt-3 border-t border-[#E8EDE0]">
            <div className="grid grid-cols-4 gap-1 text-[9px] font-medium text-center text-[#5A6B5A]">
              <div className="border border-[#D4DFC8] p-1.5 rounded-lg">Kirim Pesan</div>
              <div className="border border-[#D4DFC8] p-1.5 rounded-lg">Bot Balas</div>
              <div className="border border-[#D4DFC8] p-1.5 rounded-lg">Proses Server</div>
              <div className="border border-[#D4DFC8] p-1.5 rounded-lg">Kirim ESP32</div>
            </div>
          </div>
        </div>

        {/* Right: Send Message */}
        <div className="lg:col-span-7 bg-white border border-[#D4DFC8] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#2D3B2D] flex items-center space-x-1.5">
            <Send className="w-4 h-4 text-[#7BAF5A]" />
            <span>Kirim Pesan</span>
          </h3>

          <form onSubmit={handleSendMessage} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Nomor Tujuan</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#9CAF88] absolute left-3 top-3" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  required
                  className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Isi Pesan</label>
              <textarea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Ketik MENU, STATUS, SENSOR, JADWAL..."
                required
                className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
              />
            </div>

            <button
              type="submit"
              disabled={sending || !isConnected}
              className="w-full border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white disabled:opacity-50 font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>{sending ? 'Mengirim...' : 'Kirim'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Menu Cards */}
      <div>
        <h3 className="text-base font-bold text-[#2D3B2D] mb-3">Menu Chatbot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {menuCards.map((card) => {
            const IconComp = card.icon;
            return (
              <div key={card.id} className="bg-white border border-[#D4DFC8] hover:border-[#7BAF5A] rounded-xl p-4 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComp className="w-4 h-4 text-[#7BAF5A]" />
                    <span className="font-semibold text-sm text-[#2D3B2D]">{card.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8A9B7A] border border-[#D4DFC8] px-1.5 py-0.5 rounded">#{card.id}</span>
                </div>

                {/* Chat Bubble */}
                <div className="bg-[#F0F4EA] rounded-lg p-2.5 text-[10px] font-mono text-[#2D3B2D] whitespace-pre-line leading-relaxed border border-[#D4DFC8]">
                  {card.sample}
                </div>

                <div className="text-[10px] text-[#8A9B7A]">
                  Ketik: <code className="font-semibold text-[#3A6B2A] border border-[#D4DFC8] px-1 py-0.5 rounded bg-white">{card.keyword}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
