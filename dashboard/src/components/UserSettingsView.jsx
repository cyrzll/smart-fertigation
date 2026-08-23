import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, CheckCircle2, AlertCircle, Phone, AtSign, Mail,
  Smartphone, Plus, Trash2, Clock, RefreshCw, Send, Check, Save, Lock, ShieldCheck,
  Cpu, QrCode, Camera, Edit2, X, Activity, Sliders, CheckCircle, Upload
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../lib/axios';

export const UserSettingsView = ({ user, onUpdateUser }) => {
  const currentUser = user || {};
  const [name, setName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [password, setPassword] = useState('');
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [waNumbers, setWaNumbers] = useState([]);
  const [loadingWa, setLoadingWa] = useState(true);

  const [newWaPhone, setNewWaPhone] = useState('');
  const [addingWa, setAddingWa] = useState(false);
  const [otpInput, setOtpInput] = useState({});
  const [verifyingOtp, setVerifyingOtp] = useState({});
  const [notice, setNotice] = useState(null);

  // ESP32 Devices Management State
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  // QR Scanner Modal State
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanStep, setScanStep] = useState(1); // 1: Scanning QR, 2: Input Device Name
  const [scannedCode, setScannedCode] = useState('');
  const [modalDevName, setModalDevName] = useState('');
  const [modalDevMode, setModalDevMode] = useState('AUTO');
  const [scannerError, setScannerError] = useState(null);
  const [submittingDevice, setSubmittingDevice] = useState(false);
  const qrScannerRef = useRef(null);

  // Edit Device Modal State
  const [editingDevice, setEditingDevice] = useState(null);
  const [editDevName, setEditDevName] = useState('');
  const [editDevCode, setEditDevCode] = useState('');
  const [editDevMode, setEditDevMode] = useState('AUTO');
  const [updatingDevice, setUpdatingDevice] = useState(false);

  const fetchWaNumbers = async () => {
    if (!currentUser.id) return;
    try {
      setLoadingWa(true);
      const res = await api.get(`/api/auth/users/${currentUser.id}/wa-numbers`);
      if (res.data.success) {
        setWaNumbers(res.data.numbers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWa(false);
    }
  };

  const fetchDevices = async () => {
    if (!currentUser.id) return;
    try {
      setLoadingDevices(true);
      const res = await api.get(`/api/auth/users/${currentUser.id}/devices`);
      if (res.data.success) {
        setDevices(res.data.devices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (currentUser.id) {
      fetchWaNumbers();
      fetchDevices();
    }
  }, [currentUser.id]);

  // Clean up QR Scanner on modal close
  useEffect(() => {
    if (!showScanModal && qrScannerRef.current) {
      try {
        qrScannerRef.current.stop().then(() => {
          qrScannerRef.current.clear();
          qrScannerRef.current = null;
        }).catch(() => {
          qrScannerRef.current = null;
        });
      } catch (_) {
        qrScannerRef.current = null;
      }
    }
  }, [showScanModal]);

  // Start QR Scanner when Step 1 is active
  useEffect(() => {
    if (showScanModal && scanStep === 1) {
      setScannerError(null);
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [showScanModal, scanStep]);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      qrScannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleQrSuccess(decodedText);
        },
        () => {
          // ignore frame errors
        }
      );
    } catch (err) {
      console.error('Error starting camera QR scanner:', err);
      setScannerError('Kamera tidak dapat diakses. Anda dapat mengunggah file gambar QR atau memasukkan kode secara manual.');
    }
  };

  const handleQrSuccess = (decodedText) => {
    let cleanCode = decodedText.trim();
    let initialName = '';

    // Check if QR text is JSON
    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.device_code || parsed.code || parsed.id) {
          cleanCode = parsed.device_code || parsed.code || parsed.id;
        }
        if (parsed.name) {
          initialName = parsed.name;
        }
      }
    } catch (_) {}

    cleanCode = cleanCode.toUpperCase();

    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop().then(() => {
          qrScannerRef.current = null;
        }).catch(() => {
          qrScannerRef.current = null;
        });
      } catch (_) {}
    }

    setScannedCode(cleanCode);
    setModalDevName(initialName || `ESP32-${cleanCode.slice(-4)}`);
    setScanStep(2);
  };

  const handleFileUploadQr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('qr-file-processor');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleQrSuccess(decodedText);
    } catch (err) {
      alert('Gagal mendeteksi kode QR dari gambar. Pastikan gambar QR Code jelas.');
    }
  };

  const handleSaveScannedDevice = async (e) => {
    e.preventDefault();
    if (!modalDevName.trim() || !scannedCode.trim()) return;

    try {
      setSubmittingDevice(true);
      setNotice(null);
      const res = await api.post(`/api/auth/users/${currentUser.id}/devices`, {
        name: modalDevName.trim(),
        device_code: scannedCode.trim().toUpperCase(),
        mode: modalDevMode,
      });

      if (res.data.success) {
        setNotice({ type: 'success', text: res.data.message || 'Perangkat ESP32 berhasil ditambahkan!' });
        setShowScanModal(false);
        setScanStep(1);
        setScannedCode('');
        setModalDevName('');
        fetchDevices();
      } else {
        setNotice({ type: 'error', text: res.data.message || 'Gagal menambahkan perangkat.' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menambahkan perangkat ESP32.';
      setNotice({ type: 'error', text: msg });
    } finally {
      setSubmittingDevice(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setSavingProfile(true);
      setNotice(null);
      const res = await api.put(`/api/auth/users/${currentUser.id}`, {
        name,
        username,
        email,
        phone,
        password: password || undefined,
      });

      if (res.data.success) {
        setNotice({ type: 'success', text: 'Profil berhasil diperbarui!' });
        setPassword('');
        if (onUpdateUser && res.data.user) {
          onUpdateUser(res.data.user);
        } else {
          localStorage.setItem('auth_user', JSON.stringify(res.data.user));
        }
      } else {
        setNotice({ type: 'error', text: res.data.message || 'Gagal memperbarui profil.' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal terhubung ke server.';
      setNotice({ type: 'error', text: msg });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddWaNumber = async (e) => {
    e.preventDefault();
    if (!newWaPhone.trim()) return;

    try {
      setAddingWa(true);
      setNotice(null);
      const res = await api.post(`/api/auth/users/${currentUser.id}/wa-numbers`, {
        phone: newWaPhone,
      });

      if (res.data.success) {
        setNotice({ type: 'success', text: res.data.message });
        setNewWaPhone('');
        fetchWaNumbers();
      } else {
        setNotice({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menambah nomor WhatsApp.';
      setNotice({ type: 'error', text: msg });
    } finally {
      setAddingWa(false);
    }
  };

  const handleVerifyOtp = async (numberId) => {
    const code = otpInput[numberId];
    if (!code) return;
    try {
      setVerifyingOtp((prev) => ({ ...prev, [numberId]: true }));
      const res = await api.post(`/api/auth/users/${currentUser.id}/wa-numbers/${numberId}/verify`, {
        otp_code: code,
      });

      if (res.data.success) {
        setNotice({ type: 'success', text: res.data.message });
        fetchWaNumbers();
      } else {
        setNotice({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memverifikasi OTP.';
      setNotice({ type: 'error', text: msg });
    } finally {
      setVerifyingOtp((prev) => ({ ...prev, [numberId]: false }));
    }
  };

  const handleResendOtp = async (numberId) => {
    try {
      setNotice(null);
      const res = await api.post(`/api/auth/users/${currentUser.id}/wa-numbers/${numberId}/resend`);
      if (res.data.success) {
        setNotice({ type: 'success', text: res.data.message });
        fetchWaNumbers();
      } else {
        setNotice({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengirim ulang OTP.';
      setNotice({ type: 'error', text: msg });
    }
  };

  const handleDeleteWaNumber = async (numberId) => {
    if (!confirm('Yakin ingin menghapus nomor WhatsApp ini?')) return;
    try {
      const res = await api.delete(`/api/auth/users/${currentUser.id}/wa-numbers/${numberId}`);
      if (res.data.success) {
        fetchWaNumbers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    if (!editingDevice || !editDevName.trim() || !editDevCode.trim()) return;

    try {
      setUpdatingDevice(true);
      setNotice(null);
      const res = await api.put(`/api/auth/users/${currentUser.id}/devices/${editingDevice.id}`, {
        name: editDevName.trim(),
        device_code: editDevCode.trim().toUpperCase(),
        mode: editDevMode,
      });

      if (res.data.success) {
        setNotice({ type: 'success', text: 'Perangkat berhasil diperbarui!' });
        setEditingDevice(null);
        fetchDevices();
      } else {
        setNotice({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memperbarui perangkat.';
      setNotice({ type: 'error', text: msg });
    } finally {
      setUpdatingDevice(false);
    }
  };

  const handleToggleMode = async (device) => {
    const newMode = device.mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    try {
      const res = await api.put(`/api/auth/users/${currentUser.id}/devices/${device.id}`, {
        mode: newMode,
      });
      if (res.data.success) {
        fetchDevices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!confirm('Yakin ingin menghapus perangkat ESP32 ini?')) return;
    try {
      const res = await api.delete(`/api/auth/users/${currentUser.id}/devices/${deviceId}`);
      if (res.data.success) {
        fetchDevices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const diff = (Date.now() - new Date(lastSeen).getTime()) / 1000;
    return diff < 120; // online if active within last 2 minutes
  };

  const inputCls = "w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Hidden processor for file QR scanning */}
      <div id="qr-file-processor" className="hidden"></div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#2D3B2D]">Pengaturan</h2>
        <span className="text-xs font-mono text-[#8A9B7A] border border-[#D4DFC8] px-2.5 py-1 rounded-lg">
          UID: {currentUser.uid || `USR-${String(currentUser.id || 1).padStart(4, '0')}`}
        </span>
      </div>

      {notice && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center space-x-2 border ${
          notice.type === 'success' ? 'border-[#C8D9B0] text-[#3A6B2A]' : 'border-red-300 text-red-600'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Grid: Profile Form & Multi-WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left: Profile Form */}
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E8EDE0]">
            <User className="w-4 h-4 text-[#7BAF5A]" />
            <h3 className="text-sm font-bold text-[#2D3B2D]">Profil Pengguna</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Username</label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-[#9CAF88] absolute left-3 top-3" />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9CAF88] absolute left-3 top-3" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Nomor HP</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#9CAF88] absolute left-3 top-3" />
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081234567890" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Password Baru (opsional)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9CAF88] absolute left-3 top-3" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Menyimpan...' : 'Simpan Profil'}</span>
            </button>
          </form>
        </div>

        {/* Right: Multi-WhatsApp */}
        <div className="bg-white border border-[#D4DFC8] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8EDE0]">
            <div className="flex items-center space-x-2.5">
              <Smartphone className="w-4 h-4 text-[#7BAF5A]" />
              <h3 className="text-sm font-bold text-[#2D3B2D]">Nomor WhatsApp</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#D4DFC8] text-[#5A6B5A]">
              {waNumbers.length}/3
            </span>
          </div>

          {/* Add WA Number */}
          {waNumbers.length < 3 ? (
            <form onSubmit={handleAddWaNumber} className="bg-[#FAFAF7] border border-[#E8EDE0] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newWaPhone}
                  onChange={(e) => setNewWaPhone(e.target.value)}
                  placeholder="Nomor WA (081234567890)"
                  required
                  className="w-full bg-white border border-[#D4DFC8] text-[#2D3B2D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
                />
                <button
                  type="submit"
                  disabled={addingWa}
                  className="border border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-medium px-3.5 py-2 rounded-lg text-xs transition flex items-center space-x-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim OTP</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="border border-amber-300 rounded-xl p-3 text-xs text-amber-600 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Maksimal 3 nomor telah tercapai.</span>
            </div>
          )}

          {/* List Numbers */}
          <div className="space-y-2.5">
            {waNumbers.length > 0 ? (
              waNumbers.map((num) => (
                <div key={num.id} className="border border-[#E8EDE0] rounded-xl p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-[#2D3B2D]">+{num.whatsapp_number}</span>
                    {num.status === 'verified' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#C8D9B0] text-[#5A8A3A]">
                        <Check className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-300 text-amber-600">
                        <Clock className="w-3 h-3" />
                        <span>Pending</span>
                      </span>
                    )}
                  </div>

                  {/* OTP verification for pending */}
                  {num.status === 'pending' && (
                    <div className="pt-2.5 border-t border-[#E8EDE0] space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput[num.id] || ''}
                          onChange={(e) => setOtpInput((prev) => ({ ...prev, [num.id]: e.target.value }))}
                          placeholder="Kode OTP"
                          className="w-full bg-white border border-[#D4DFC8] text-[#2D3B2D] rounded-lg px-3 py-1.5 text-xs font-mono text-center focus:outline-none focus:border-[#7BAF5A]"
                        />
                        <button
                          onClick={() => handleVerifyOtp(num.id)}
                          disabled={verifyingOtp[num.id]}
                          className="border border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-medium px-3 py-1.5 rounded-lg text-xs transition shrink-0"
                        >
                          Verifikasi
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleResendOtp(num.id)}
                          className="text-[#5A8A3A] hover:underline font-medium flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Kirim Ulang</span>
                        </button>
                        <button
                          onClick={() => handleDeleteWaNumber(num.id)}
                          className="text-red-500 hover:underline font-medium flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {num.status === 'verified' && (
                    <div className="pt-2 border-t border-[#E8EDE0] flex items-center justify-between">
                      <span className="text-[#5A8A3A] font-medium flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>ESP32 Active</span>
                      </span>
                      <button
                        onClick={() => handleDeleteWaNumber(num.id)}
                        className="text-red-500 hover:underline font-medium flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="border border-[#E8EDE0] rounded-xl p-5 text-center text-[#8A9B7A] text-xs">
                Belum ada nomor WhatsApp terdaftar.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Section 3: ESP32 Device Management Table */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EDE0]">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-[#7BAF5A]" />
            <div>
              <h3 className="text-base font-bold text-[#2D3B2D]">Perangkat ESP32</h3>
              <p className="text-xs text-[#8A9B7A]">Manajemen perangkat IoT yang terhubung dengan akun Anda</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-[#D4DFC8] text-[#5A6B5A]">
              {devices.length} Perangkat
            </span>

            {/* Scan QR Modal Trigger Button */}
            <button
              onClick={() => {
                setScanStep(1);
                setScannedCode('');
                setModalDevName('');
                setShowScanModal(true);
              }}
              className="border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR Perangkat</span>
            </button>
          </div>
        </div>

        {/* Devices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E8EDE0] text-xs font-semibold text-[#8A9B7A] bg-[#FAFAF7]">
                <th className="py-3 px-3 rounded-l-lg">#</th>
                <th className="py-3 px-3">UID Pemilik</th>
                <th className="py-3 px-3">Nama Perangkat</th>
                <th className="py-3 px-3">Kode Device</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Last Seen</th>
                <th className="py-3 px-3 text-right rounded-r-lg">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F4EA]">
              {devices.length > 0 ? (
                devices.map((d, index) => {
                  const online = isOnline(d.last_seen);
                  return (
                    <tr key={d.id} className="hover:bg-[#F9FAF6] transition-colors">
                      <td className="py-3 px-3 text-xs text-[#8A9B7A] font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-[#D4DFC8] text-[#3A6B2A] bg-[#FAFAF7]">
                          {d.uid || currentUser.uid || `USR-${String(currentUser.id || 1).padStart(4, '0')}`}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#2D3B2D]">
                        {d.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-[#5A8A3A] font-bold">
                        {d.device_code}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleMode(d)}
                          title="Klik untuk ubah mode"
                          className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold transition flex items-center space-x-1 ${
                            d.mode === 'AUTO' 
                              ? 'border-[#7BAF5A] text-[#3A6B2A] hover:bg-[#F0F4EA]' 
                              : 'border-amber-400 text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{d.mode || 'AUTO'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        {online ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#C8D9B0] text-[#5A8A3A]">
                            <span className="w-2 h-2 rounded-full bg-[#7BAF5A] animate-ping" />
                            <span>Online</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#D4DFC8] text-[#8A9B7A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-[#5A6B5A]">
                        {d.last_seen ? new Date(d.last_seen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingDevice(d);
                              setEditDevName(d.name);
                              setEditDevCode(d.device_code);
                              setEditDevMode(d.mode || 'AUTO');
                            }}
                            className="p-1.5 rounded-lg border border-[#D4DFC8] text-[#5A6B5A] hover:border-[#7BAF5A] hover:text-[#3A6B2A] transition"
                            title="Edit Perangkat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(d.id)}
                            className="p-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition"
                            title="Hapus Perangkat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#8A9B7A] text-xs">
                    {loadingDevices ? 'Memuat data perangkat...' : 'Belum ada perangkat ESP32 yang terhubung. Klik tombol "Scan QR Perangkat" di atas untuk menambahkan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCAN QR CODE MODAL                                                       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScanModal(false)}
              className="fixed inset-0 bg-[#2D3B2D]/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white border border-[#D4DFC8] rounded-2xl p-6 shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EDE0]">
                <div className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-[#7BAF5A]" />
                  <h3 className="font-bold text-base text-[#2D3B2D]">
                    {scanStep === 1 ? 'Scan QR Code Perangkat ESP32' : 'Nama & Pengaturan Perangkat'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowScanModal(false)}
                  className="p-1 rounded-lg text-[#8A9B7A] hover:text-[#2D3B2D] hover:bg-[#F0F4EA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: Scanner */}
              {scanStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-[#5A6B5A]">
                    Arahkan kamera ke QR Code yang ada pada modul ESP32 Anda:
                  </p>

                  <div className="relative border-2 border-dashed border-[#7BAF5A] rounded-xl overflow-hidden bg-[#FAFAF7] aspect-square flex items-center justify-center">
                    <div id="qr-reader-container" className="w-full h-full"></div>
                  </div>

                  {scannerError && (
                    <div className="border border-amber-300 text-amber-700 p-3 rounded-xl text-xs space-y-2">
                      <p>{scannerError}</p>
                    </div>
                  )}

                  {/* Option to Upload Image or Input Manual */}
                  <div className="pt-2 border-t border-[#E8EDE0] flex flex-col sm:flex-row items-center justify-between gap-2">
                    <label className="cursor-pointer border border-[#D4DFC8] hover:border-[#7BAF5A] text-[#5A6B5A] hover:text-[#3A6B2A] text-xs font-medium px-3 py-2 rounded-xl transition flex items-center space-x-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Gambar QR</span>
                      <input type="file" accept="image/*" onChange={handleFileUploadQr} className="hidden" />
                    </label>

                    <button
                      onClick={() => {
                        const manualCode = prompt('Masukkan Kode Perangkat ESP32 (contoh: ESP-FERTIGASI-01):');
                        if (manualCode && manualCode.trim()) {
                          handleQrSuccess(manualCode.trim());
                        }
                      }}
                      className="text-xs text-[#5A8A3A] hover:underline font-medium"
                    >
                      Ketik Kode Manual
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Input Device Name & Mode */}
              {scanStep === 2 && (
                <form onSubmit={handleSaveScannedDevice} className="space-y-4">
                  <div className="border border-[#C8D9B0] bg-[#F9FAF6] p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-xs text-[#3A6B2A] font-bold">
                      <CheckCircle className="w-4 h-4 text-[#7BAF5A]" />
                      <span>QR Code Berhasil Terdeteksi!</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8A9B7A]">Kode Device:</span>
                      <span className="font-mono font-bold text-[#2D3B2D]">{scannedCode}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8A9B7A]">UID Pemilik:</span>
                      <span className="font-mono font-bold text-[#3A6B2A]">
                        {currentUser.uid || `USR-${String(currentUser.id || 1).padStart(4, '0')}`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">
                      Nama Perangkat ESP32
                    </label>
                    <input
                      type="text"
                      value={modalDevName}
                      onChange={(e) => setModalDevName(e.target.value)}
                      placeholder="Contoh: ESP32 Greenhouse Melon A"
                      required
                      autoFocus
                      className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">
                      Mode Awal
                    </label>
                    <select
                      value={modalDevMode}
                      onChange={(e) => setModalDevMode(e.target.value)}
                      className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
                    >
                      <option value="AUTO">AUTO (Otomatis Sesuai Jadwal)</option>
                      <option value="MANUAL">MANUAL (Kontrol Manual)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E8EDE0]">
                    <button
                      type="button"
                      onClick={() => setScanStep(1)}
                      className="border border-[#D4DFC8] text-[#5A6B5A] hover:bg-[#FAFAF7] text-xs font-medium px-4 py-2.5 rounded-xl transition"
                    >
                      Scan Ulang
                    </button>

                    <button
                      type="submit"
                      disabled={submittingDevice}
                      className="border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{submittingDevice ? 'Menyimpan...' : 'Simpan Perangkat'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* EDIT DEVICE MODAL                                                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editingDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingDevice(null)}
              className="fixed inset-0 bg-[#2D3B2D]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white border border-[#D4DFC8] rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EDE0]">
                <div className="flex items-center space-x-2">
                  <Edit2 className="w-4 h-4 text-[#7BAF5A]" />
                  <h3 className="font-bold text-base text-[#2D3B2D]">Edit Perangkat ESP32</h3>
                </div>
                <button
                  onClick={() => setEditingDevice(null)}
                  className="p-1 rounded-lg text-[#8A9B7A] hover:text-[#2D3B2D] hover:bg-[#F0F4EA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateDevice} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">Nama Perangkat</label>
                  <input
                    type="text"
                    value={editDevName}
                    onChange={(e) => setEditDevName(e.target.value)}
                    required
                    className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">Kode Device (Unique)</label>
                  <input
                    type="text"
                    value={editDevCode}
                    onChange={(e) => setEditDevCode(e.target.value)}
                    required
                    className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] font-mono uppercase rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">Mode Operasi</label>
                  <select
                    value={editDevMode}
                    onChange={(e) => setEditDevMode(e.target.value)}
                    className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
                  >
                    <option value="AUTO">AUTO</option>
                    <option value="MANUAL">MANUAL</option>
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E8EDE0]">
                  <button
                    type="button"
                    onClick={() => setEditingDevice(null)}
                    className="border border-[#D4DFC8] text-[#5A6B5A] hover:bg-[#FAFAF7] text-xs font-medium px-4 py-2.5 rounded-xl transition"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={updatingDevice}
                    className="border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{updatingDevice ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
