import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Users, MessageSquare, LogOut, RefreshCw, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { UsersView } from './UsersView';
import { WaBotView } from './WaBotView';
import { goeyToast } from 'goey-toast';
import { ConfirmModal } from './ConfirmModal';

export const AdminCenterView = ({ apiUrl, user, onLogout }) => {
  const [subTab, setSubTab] = useState('users');
  const [waStatus, setWaStatus] = useState(null);
  const [loadingWa, setLoadingWa] = useState(true);
  const [showLogoutWaModal, setShowLogoutWaModal] = useState(false);
  const [restartingWa, setRestartingWa] = useState(false);

  const fetchWaStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/wa/status`);
      const json = await res.json();
      if (json.success) {
        setWaStatus(json);
      }
    } catch (err) {
      console.error('Error fetching WA status:', err);
    } finally {
      setLoadingWa(false);
    }
  };

  useEffect(() => {
    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 3000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const handleLogoutWaConfirm = async () => {
    try {
      setRestartingWa(true);
      await fetch(`${apiUrl}/api/wa/restart`, { method: 'POST' });
      goeyToast.success('Sesi WhatsApp Bot berhasil di-logout / direstart');
      setShowLogoutWaModal(false);
      fetchWaStatus();
    } catch (err) {
      goeyToast.error('Gagal me-logout sesi WhatsApp');
    } finally {
      setRestartingWa(false);
    }
  };

  const isWaConnected = waStatus?.state === 'connected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Top Header */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <img src="/favicon.png" alt="Logo" className="w-9 h-9 rounded-lg object-contain shrink-0" />
          <div>
            <h2 className="font-bold text-base text-[#2D3B2D]">Admin</h2>
            <p className="text-xs text-[#8A9B7A]">
              {user?.name} ({user?.username ? `@${user.username}` : user?.email})
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-red-300 text-red-500 hover:bg-red-50 text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        )}
      </div>

      {/* Sub-tab Selector & WA Status */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-[#7BAF5A]" />
          <span className="font-semibold text-sm text-[#2D3B2D]">Panel Admin</span>
          {isWaConnected ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#C8D9B0] text-[#5A8A3A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BAF5A] animate-ping" />
              <span>WA Bot Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-300 text-amber-600">
              <QrCode className="w-3 h-3" />
              <span>WA Offline</span>
            </span>
          )}
        </div>

        <div className="flex items-center border border-[#D4DFC8] rounded-xl p-1 shrink-0">
          <button
            onClick={() => setSubTab('users')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
              subTab === 'users'
                ? 'border border-[#7BAF5A] text-[#3A6B2A]'
                : 'text-[#8A9B7A] hover:text-[#3A6B2A]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setSubTab('wa')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
              subTab === 'wa'
                ? 'border border-[#7BAF5A] text-[#3A6B2A]'
                : 'text-[#8A9B7A] hover:text-[#3A6B2A]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* QR Code Banner if WA is not logged in */}
      {!isWaConnected && (
        <div className="bg-white border border-amber-300 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-3 max-w-md">
            <h3 className="text-base font-bold text-[#2D3B2D]">WhatsApp Bot Belum Terhubung</h3>
            <p className="text-xs text-[#5A6B5A]">
              Scan QR Code menggunakan Perangkat Tertaut pada WhatsApp.
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchWaStatus}
                className="border border-amber-400 text-amber-600 hover:bg-amber-50 font-medium text-xs px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingWa ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowLogoutWaModal(true)}
                className="border border-[#D4DFC8] text-[#5A6B5A] hover:border-red-300 hover:text-red-500 font-medium text-xs px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Reset Sesi</span>
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-[#FAFAF7] p-4 rounded-xl border border-[#D4DFC8] text-center shrink-0 self-center">
            {waStatus?.qrCode ? (
              <div className="space-y-2">
                <QRCodeSVG value={waStatus.qrCode} size={160} />
                <p className="text-[10px] text-[#8A9B7A] font-medium">Scan dengan WhatsApp</p>
              </div>
            ) : (
              <div className="w-[160px] h-[160px] flex flex-col items-center justify-center space-y-2 text-[#8A9B7A]">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <p className="text-[11px]">Menyiapkan QR Code...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab Content */}
      <div className="transition-all duration-200">
        {subTab === 'users' && <UsersView apiUrl={apiUrl} />}
        {subTab === 'wa' && <WaBotView apiUrl={apiUrl} />}
      </div>

      {/* Reset Session Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutWaModal}
        title="Reset Sesi WhatsApp Bot"
        message="Apakah Anda yakin ingin me-reset dan me-logout sesi WhatsApp Bot ini?"
        confirmText="Ya, Reset Sesi"
        cancelText="Batal"
        confirmVariant="warning"
        loading={restartingWa}
        onConfirm={handleLogoutWaConfirm}
        onCancel={() => setShowLogoutWaModal(false)}
      />
    </motion.div>
  );
};
