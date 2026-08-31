import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, CheckCircle2, AlertCircle, Phone, AtSign, Mail,
  Smartphone, Plus, Trash2, Clock, RefreshCw, Send, Check, Save, Lock, ShieldCheck,
  Cpu, QrCode, Camera, Edit2, X, Activity, Sliders, CheckCircle, Upload, Zap, Lightbulb,
  Copy, Eye
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { actions } from 'astro:actions';
import api from '../lib/axios';
import { goeyToast } from 'goey-toast';
import { ConfirmModal } from './ConfirmModal';
import { App as EspBluetoothManager } from './esp/BleDeviceManager.jsx';

const formatWibFull = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(dateStr)) + ' WIB';
  } catch (_) {
    return new Date(dateStr).toLocaleString('id-ID');
  }
};

export const UserSettingsView = ({ user, onUpdateUser, defaultTab = 'devices', sensorsEnabled = true, onSensorsEnabledChange }) => {
  const currentUser = user || {};
  const [activeSubTab, setActiveSubTab] = useState(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveSubTab(defaultTab);
    }
  }, [defaultTab]);

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

  // Device Pairing & Verification Modal State
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairStep, setPairStep] = useState(1); // 1: Input Serial/QR, 2: Camera Scanner, 3: Confirm LED Blink 1-8
  const [inputSerialCode, setInputSerialCode] = useState('tes123');
  const [inputDevCode, setInputDevCode] = useState('');
  const [inputDevName, setInputDevName] = useState('');
  const [inputDevMode, setInputDevMode] = useState('AUTO');
  const [selectedBlinkCount, setSelectedBlinkCount] = useState(null);
  const [pendingDeviceId, setPendingDeviceId] = useState(null);
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [confirmingVerify, setConfirmingVerify] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const qrScannerRef = useRef(null);

  // Edit Device Modal State
  const [editingDevice, setEditingDevice] = useState(null);
  const [editDevName, setEditDevName] = useState('');
  const [editDevCode, setEditDevCode] = useState('');
  const [editDevSerial, setEditDevSerial] = useState('');
  const [editDevMode, setEditDevMode] = useState('AUTO');
  const [updatingDevice, setUpdatingDevice] = useState(false);

  // Device Detail & LED Control Modal State
  const [selectedDeviceDetail, setSelectedDeviceDetail] = useState(null);
  const [testLedGpio, setTestLedGpio] = useState(4);
  const [ledTesting, setLedTesting] = useState(false);
  const [ledNotice, setLedNotice] = useState(null);
  const [copiedAuth, setCopiedAuth] = useState(false);

  // Real-time WebSocket connection state
  const [wsOnlineDevices, setWsOnlineDevices] = useState(new Set());
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [pairModalNotice, setPairModalNotice] = useState(null);

  // Delete Confirm Modal States
  const [confirmDeleteWaId, setConfirmDeleteWaId] = useState(null);
  const [confirmDeleteDeviceId, setConfirmDeleteDeviceId] = useState(null);
  const [deletingWa, setDeletingWa] = useState(false);
  const [deletingDevice, setDeletingDevice] = useState(false);

  const handleLedControl = async (state, gpio = 4, duration = 0) => {
    if (!selectedDeviceDetail) return;
    try {
      setLedTesting(true);
      setLedNotice(null);
      const payload = { state, gpio, duration };
      const { data: resData, error: actionError } = await actions.controlDeviceLed({
        userId: currentUser.id,
        deviceId: selectedDeviceDetail.id,
        data: payload,
      });

      const json = (!actionError && resData) ? resData : await (await fetch(`/api/auth/users/${currentUser.id}/devices/${selectedDeviceDetail.id}/led-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })).json();

      if (json.success) {
        setLedNotice({ type: 'success', text: json.message });
      } else {
        setLedNotice({ type: 'error', text: json.message || 'Gagal mengirim sinyal LED' });
      }
    } catch (err) {
      setLedNotice({ type: 'error', text: 'Gagal terhubung ke API server' });
    } finally {
      setLedTesting(false);
    }
  };

  // Connect to Backend WebSocket for instant live Online/Offline push
  useEffect(() => {
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

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'DEVICES_ONLINE_SNAPSHOT') {
              setWsOnlineDevices(new Set(data.online_devices || []));
            } else if (data.type === 'DEVICE_STATUS') {
              setWsOnlineDevices((prev) => {
                const next = new Set(prev);
                if (data.is_online) {
                  if (data.device_code) next.add(data.device_code);
                  if (data.serial_code) next.add(data.serial_code);
                } else {
                  if (data.device_code) next.delete(data.device_code);
                  if (data.serial_code) next.delete(data.serial_code);
                }
                return next;
              });

              // Live update device last_seen and is_online in state
              setDevices((prevDevs) =>
                prevDevs.map((d) =>
                  d.device_code === data.device_code || d.serial_code === data.serial_code
                    ? { ...d, last_seen: data.last_seen || new Date().toISOString(), is_online: data.is_online }
                    : d
                )
              );
            }
          } catch (err) {
            console.error('[Dashboard WS] Error parsing WS message:', err);
          }
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          try { ws.close(); } catch (_) {}
        };
      } catch (err) {
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try { ws.close(); } catch (_) {}
      }
    };
  }, []);

  const fetchWaNumbers = async () => {
    if (!currentUser.id) return;
    try {
      setLoadingWa(true);
      const { data: resData, error: actionError } = await actions.getWaNumbers({ userId: currentUser.id });
      if (!actionError && resData && resData.success) {
        setWaNumbers(resData.numbers || []);
      } else {
        const res = await api.get(`/api/auth/users/${currentUser.id}/wa-numbers`);
        if (res.data.success) {
          setWaNumbers(res.data.numbers || []);
        }
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
      const { data: resData, error: actionError } = await actions.getDevices({ userId: currentUser.id });
      if (!actionError && resData && resData.success) {
        setDevices(resData.devices || []);
      } else {
        const res = await api.get(`/api/auth/users/${currentUser.id}/devices`);
        if (res.data.success) {
          setDevices(res.data.devices || []);
        }
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

      // Auto-refresh fallback
      const timer = setInterval(() => {
        fetchDevices();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [currentUser.id]);

  // Clean up QR Scanner on modal close
  useEffect(() => {
    if (!showPairModal && qrScannerRef.current) {
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
  }, [showPairModal]);

  // Start QR Scanner when Step 2 is active
  useEffect(() => {
    if (showPairModal && pairStep === 2) {
      setScannerError(null);
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [showPairModal, pairStep]);

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
        () => {}
      );
    } catch (err) {
      console.error('Error starting camera QR scanner:', err);
      setScannerError('Kamera tidak dapat diakses. Anda dapat mengunggah file QR atau memasukkan kode serial manual.');
    }
  };

  const handleQrSuccess = (decodedText) => {
    let cleanCode = decodedText.trim();
    let initialName = '';

    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.serial_code || parsed.serial) {
          cleanCode = parsed.serial_code || parsed.serial;
        } else if (parsed.device_code || parsed.code) {
          cleanCode = parsed.device_code || parsed.code;
        }
        if (parsed.name) initialName = parsed.name;
      }
    } catch (_) {}

    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop().then(() => {
          qrScannerRef.current = null;
        }).catch(() => {
          qrScannerRef.current = null;
        });
      } catch (_) {}
    }

    setInputSerialCode(cleanCode);
    if (initialName) setInputDevName(initialName);
    setPairStep(1);
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
      goeyToast.error('Gagal mendeteksi kode QR dari gambar. Pastikan gambar QR Code jelas.');
    }
  };

  // Step 1 -> Step 3: Request Verification Signal (LED Blink)
  const handleRequestVerification = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputSerialCode.trim() && !inputDevCode.trim()) return;

    try {
      setRequestingVerify(true);
      setPairModalNotice(null);
      setNotice(null);

      const res = await api.post(`/api/auth/users/${currentUser.id}/devices/request-verify`, {
        serial_code: inputSerialCode.trim(),
        device_code: inputDevCode.trim().toUpperCase(),
        name: inputDevName.trim() || `ESP32-${inputSerialCode.trim()}`,
      });

      if (res.data.success) {
        setPendingDeviceId(res.data.device_id);
        setSelectedBlinkCount(null);
        setPairModalNotice(null);
        setPairStep(3); // Go to LED Confirmation Step
      } else {
        setPairModalNotice({ type: 'error', text: res.data.message || 'Gagal mengirim sinyal verifikasi.' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Perangkat ESP32 sedang OFFLINE / Tidak terhubung ke WebSocket. Hubungkan ESP32 ke Wi-Fi terlebih dahulu.';
      setPairModalNotice({ type: 'error', text: msg });
    } finally {
      setRequestingVerify(false);
    }
  };

  // Step 3: Confirm LED Blink Count (1-8)
  const handleConfirmVerification = async (e) => {
    e.preventDefault();
    if (!selectedBlinkCount) {
      goeyToast.warning('Silakan pilih jumlah kedipan LED (angka 1 - 8) terlebih dahulu.');
      return;
    }

    try {
      setConfirmingVerify(true);
      setNotice(null);

      const res = await api.post(`/api/auth/users/${currentUser.id}/devices/confirm-verify`, {
        device_id: pendingDeviceId,
        serial_code: inputSerialCode.trim(),
        input_code: selectedBlinkCount,
        name: inputDevName.trim(),
      });

      if (res.data.success) {
        goeyToast.success(res.data.message || 'Perangkat ESP32 berhasil diverifikasi dan ditambahkan!');
        setShowPairModal(false);
        setPairStep(1);
        setSelectedBlinkCount(null);
        setPendingDeviceId(null);
        fetchDevices();
      } else {
        goeyToast.error(res.data.message || 'Angka konfirmasi salah!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memverifikasi perangkat.';
      goeyToast.error(msg);
    } finally {
      setConfirmingVerify(false);
    }
  };

  // Profile Update
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

  // WhatsApp Management
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

  const handleConfirmDeleteWaNumber = async () => {
    if (!confirmDeleteWaId) return;
    try {
      setDeletingWa(true);
      const res = await api.delete(`/api/auth/users/${currentUser.id}/wa-numbers/${confirmDeleteWaId}`);
      if (res.data.success) {
        goeyToast.success('Nomor WhatsApp berhasil dihapus');
        setConfirmDeleteWaId(null);
        fetchWaNumbers();
      } else {
        goeyToast.error(res.data.message || 'Gagal menghapus nomor WhatsApp');
      }
    } catch (err) {
      goeyToast.error('Gagal menghapus nomor WhatsApp');
    } finally {
      setDeletingWa(false);
    }
  };

  // Device Edit & Delete
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
        goeyToast.success('Perangkat berhasil diperbarui!');
        setEditingDevice(null);
        fetchDevices();
      } else {
        goeyToast.error(res.data.message || 'Gagal memperbarui perangkat');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memperbarui perangkat.';
      goeyToast.error(msg);
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
        goeyToast.success(`Mode perangkat diubah ke ${newMode}`);
        fetchDevices();
      }
    } catch (err) {
      goeyToast.error('Gagal mengubah mode perangkat');
    }
  };

  const handleConfirmDeleteDevice = async () => {
    if (!confirmDeleteDeviceId) return;
    try {
      setDeletingDevice(true);
      const res = await api.delete(`/api/auth/users/${currentUser.id}/devices/${confirmDeleteDeviceId}`);
      if (res.data.success) {
        goeyToast.success('Perangkat ESP32 berhasil dihapus');
        setConfirmDeleteDeviceId(null);
        fetchDevices();
      } else {
        goeyToast.error(res.data.message || 'Gagal menghapus perangkat');
      }
    } catch (err) {
      goeyToast.error('Gagal menghapus perangkat');
    } finally {
      setDeletingDevice(false);
    }
  };

  const isOnline = (d) => {
    if (!d) return false;
    const devCode = (d.device_code || '').trim().toLowerCase();
    const serCode = (d.serial_code || '').trim().toLowerCase();

    // 1. Strict Real-Time WebSocket live check
    for (const code of wsOnlineDevices) {
      if (!code) continue;
      const clean = code.trim().toLowerCase();
      if (clean === devCode || clean === serCode || clean === `serial_${serCode}`) {
        return true;
      }
    }

    // 2. Fallback to API is_online only if dashboard WebSocket is still connecting
    if (!isWsConnected && d.is_online) {
      return true;
    }

    return false;
  };

  const inputCls = "w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4 sm:space-y-5"
    >
      {/* Hidden processor for file QR scanning */}
      <div id="qr-file-processor" className="hidden"></div>

      {/* Header with Sub-Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#2D3B2D]">
            {activeSubTab === 'devices' ? 'Manajemen Perangkat ESP32' : 'Pengaturan Profil & Akun'}
          </h2>
          <p className="text-xs text-[#8A9B7A] mt-0.5">
            {activeSubTab === 'devices'
              ? 'Kelola, hubungkan, dan verifikasi perangkat fertigasi'
              : 'Kelola informasi profil, kata sandi, dan nomor WhatsApp notifikasi fertigasi'}
          </p>
        </div>

        <div className="flex flex-col xs:flex-row xs:items-center gap-2 w-full lg:w-auto">
          <div className="grid grid-cols-2 bg-white border border-[#D4DFC8] p-1 rounded-xl shadow-xs w-full xs:w-auto">
            <button
              onClick={() => setActiveSubTab('devices')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubTab === 'devices'
                  ? 'bg-[#E8F2DF] text-[#3A6B2A] border border-[#C8D9B0]'
                  : 'text-[#5A6B5A] hover:text-[#2D3B2D]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Perangkat</span>
            </button>
            <button
              onClick={() => setActiveSubTab('settings')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubTab === 'settings'
                  ? 'bg-[#E8F2DF] text-[#3A6B2A] border border-[#C8D9B0]'
                  : 'text-[#5A6B5A] hover:text-[#2D3B2D]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profil & WA</span>
            </button>
          </div>

          <span className="text-xs font-mono text-[#8A9B7A] border border-[#D4DFC8] bg-white px-2.5 py-1.5 rounded-xl hidden md:inline-block shadow-xs">
            UID: {currentUser.uid || `USR-${String(currentUser.id || 1).padStart(4, '0')}`}
          </span>
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

      {/* View 1: Profile Form & Multi-WhatsApp */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="lg:col-span-2 bg-white border border-[#D4DFC8] rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl border ${sensorsEnabled ? 'bg-[#E8F2DF] border-[#C8D9B0] text-[#5A8A3A]' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D3B2D]">Monitoring Sensor</h3>
                  <p className="text-xs text-[#8A9B7A] mt-1 leading-relaxed">
                    Aktifkan tampilan telemetri pH dan TDS pada Dashboard Monitoring.
                  </p>
                  <p className={`text-[11px] font-semibold mt-1.5 ${sensorsEnabled ? 'text-[#5A8A3A]' : 'text-slate-500'}`}>
                    {sensorsEnabled ? 'Sensor aktif' : 'Sensor dinonaktifkan — data pada dashboard akan diredupkan'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={sensorsEnabled}
                aria-label="Aktifkan monitoring sensor"
                onClick={() => onSensorsEnabledChange?.(!sensorsEnabled)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7BAF5A]/40 focus:ring-offset-2 ${
                  sensorsEnabled ? 'bg-[#7BAF5A] border-[#689849]' : 'bg-slate-200 border-slate-300'
                }`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${sensorsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

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
                className="w-full border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
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
                    className="border border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-medium px-3.5 py-2 rounded-lg text-xs transition flex items-center space-x-1 shrink-0 cursor-pointer"
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
                            className="border border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-medium px-3 py-1.5 rounded-lg text-xs transition shrink-0 cursor-pointer"
                          >
                            Verifikasi
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleResendOtp(num.id)}
                            className="text-[#5A8A3A] hover:underline font-medium flex items-center space-x-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Kirim Ulang</span>
                          </button>
                          <button
                            onClick={() => handleDeleteWaNumber(num.id)}
                            className="text-red-500 hover:underline font-medium flex items-center space-x-1 cursor-pointer"
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
                          onClick={() => setConfirmDeleteWaId(num.id)}
                          className="text-red-500 hover:underline font-medium flex items-center space-x-1 cursor-pointer"
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
      )}

      {/* View 2: ESP32 Device Management Table */}
      {activeSubTab === 'devices' && (
        <div className="space-y-5">
          <section className="bg-white border border-[#D4DFC8] rounded-xl p-3 sm:p-5 shadow-xs overflow-hidden">
            <EspBluetoothManager embedded />
          </section>

        <div className="bg-white border border-[#D4DFC8] rounded-xl p-3 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EDE0]">
            <div className="flex items-center space-x-2.5">
              <Cpu className="w-5 h-5 text-[#7BAF5A]" />
              <div>
                <h3 className="text-base font-bold text-[#2D3B2D]">Perangkat ESP32 Terdaftar</h3>
                <p className="text-xs text-[#8A9B7A]">Konfirmasi nomor seri dengan kedipan LED modul ESP32</p>
              </div>
            </div>

            <div className="flex flex-col xs:flex-row xs:items-center gap-2 w-full sm:w-auto">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-[#D4DFC8] text-[#5A6B5A]">
                {devices.length} Perangkat
              </span>

              {/* Pair & Add Device Modal Button */}
              <button
                onClick={() => {
                  setPairStep(1);
                  setInputSerialCode('tes123');
                  setInputDevCode('');
                  setInputDevName('');
                  setSelectedBlinkCount(null);
                  setPendingDeviceId(null);
                  setShowPairModal(true);
                }}
                className="w-full xs:w-auto border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold px-3.5 py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Pairing / Tambah ESP32</span>
              </button>
            </div>
          </div>

        {/* Devices Table (Streamlined) */}
        <p className="sm:hidden text-[10px] text-[#8A9B7A]">Geser tabel ke samping untuk melihat seluruh informasi dan aksi.</p>
        <div className="overflow-x-auto overscroll-x-contain -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
          <table className="w-full min-w-[760px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E8EDE0] text-xs font-semibold text-[#8A9B7A] bg-[#FAFAF7]">
                <th className="py-3 px-3.5 rounded-l-lg">#</th>
                <th className="py-3 px-3.5">Nama Perangkat & Kode</th>
                <th className="py-3 px-3.5">Mode</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5">Koneksi</th>
                <th className="py-3 px-3.5 text-right rounded-r-lg">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE0]">
              {devices.length > 0 ? (
                devices.map((d, index) => {
                  return (
                    <tr key={d.id} className="hover:bg-[#FAFAF7] transition">
                      <td className="py-3 px-3.5 font-mono text-xs text-[#8A9B7A]">{index + 1}</td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 rounded-lg bg-[#E8F2DF] text-[#7BAF5A] border border-[#C8D9B0] shrink-0">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-[#2D3B2D] text-sm block">{d.name}</span>
                            <span className="text-[11px] font-mono text-[#8A9B7A]">{d.device_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold border border-[#D4DFC8] text-[#5A6B5A]">
                          {d.mode || 'AUTO'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {d.status === 'verified' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[#C8D9B0] text-[#3A6B2A] bg-[#E8F2DF]">
                            <Check className="w-3 h-3" />
                            <span>Terverifikasi</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-300 text-amber-700 bg-amber-50">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isOnline(d) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <span className={`text-xs font-bold ${isOnline(d) ? 'text-emerald-800' : 'text-slate-500'}`}>
                            {isOnline(d) ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedDeviceDetail(d);
                              setLedNotice(null);
                            }}
                            className="p-1.5 rounded-lg border border-[#7BAF5A] text-[#3A6B2A] hover:bg-[#E8F2DF] transition cursor-pointer"
                            title="Detail & Tes LED"
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-[#7BAF5A]" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingDevice(d);
                              setEditDevName(d.name || '');
                              setEditDevCode(d.device_code || '');
                              setEditDevSerial(d.serial_code || '');
                              setEditDevMode(d.mode || 'AUTO');
                            }}
                            className="p-1.5 rounded-lg border border-[#D4DFC8] text-[#5A6B5A] hover:border-[#7BAF5A] hover:text-[#3A6B2A] transition cursor-pointer"
                            title="Edit Perangkat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteDeviceId(d.id)}
                            className="p-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition cursor-pointer"
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
                  <td colSpan={6} className="py-8 text-center text-[#8A9B7A] text-xs">
                    {loadingDevices ? 'Memuat data perangkat...' : 'Belum ada perangkat ESP32 yang terhubung. Klik tombol "Pairing / Tambah ESP32" di atas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEVICE DETAIL & LED CONTROL MODAL                                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedDeviceDetail && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedDeviceDetail(null);
                setLedNotice(null);
              }}
              className="fixed inset-0 bg-[#2D3B2D]/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-lg bg-white border border-[#D4DFC8] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[94dvh] sm:max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EDE0]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-[#F0F4EA] text-[#3A6B2A] rounded-xl">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#2D3B2D]">
                      {selectedDeviceDetail.name || 'Detail Perangkat ESP32'}
                    </h3>
                    <p className="text-xs font-mono text-[#5A8A3A] font-bold">
                      {selectedDeviceDetail.device_code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedDeviceDetail(null);
                    setLedNotice(null);
                  }}
                  className="p-1 rounded-lg text-[#8A9B7A] hover:text-[#2D3B2D] hover:bg-[#F0F4EA] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Row */}
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 bg-[#FAFAF7] p-3 rounded-xl border border-[#D4DFC8]">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-[#5A6B5A]">Konektivitas:</span>
                  {isOnline(selectedDeviceDetail) ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#C8D9B0] text-[#3A6B2A] bg-[#F0F4EA]">
                      <span className="w-2 h-2 rounded-full bg-[#7BAF5A] animate-ping" />
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#D4DFC8] text-[#8A9B7A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span>Offline</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-[#5A6B5A]">Status:</span>
                  {selectedDeviceDetail.status === 'verified' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#C8D9B0] text-[#3A6B2A] bg-[#F0F4EA]">
                      <Check className="w-3 h-3" />
                      <span>Terverifikasi</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-300 text-amber-700 bg-amber-50">
                      <Clock className="w-3 h-3" />
                      <span>Belum Verifikasi</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Detail Info Grid */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E8EDE0]">
                  <span className="text-[#8A9B7A] block font-medium">UID Pemilik</span>
                  <span className="font-mono font-bold text-[#2D3B2D] mt-0.5 block">
                    {selectedDeviceDetail.uid || currentUser.uid || `USR-${String(currentUser.id || 1).padStart(4, '0')}`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E8EDE0]">
                  <span className="text-[#8A9B7A] block font-medium">Nomor Seri ESP32</span>
                  <span className="font-mono font-bold text-[#2D3B2D] mt-0.5 block">
                    {selectedDeviceDetail.serial_code || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E8EDE0] xs:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#8A9B7A] font-medium">Kode Autentikasi</span>
                    {selectedDeviceDetail.auth_code && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedDeviceDetail.auth_code);
                          setCopiedAuth(true);
                          setTimeout(() => setCopiedAuth(false), 2000);
                        }}
                        className="text-[11px] text-[#5A8A3A] hover:underline flex items-center space-x-1 cursor-pointer font-bold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedAuth ? 'Tersalin!' : 'Salin Code'}</span>
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-bold text-[#3A6B2A] block bg-white px-2 py-1 rounded border border-[#D4DFC8]">
                    {selectedDeviceDetail.auth_code || 'Belum dibuat (Menunggu Verifikasi)'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E8EDE0]">
                  <span className="text-[#8A9B7A] block font-medium">Angka Kedipan Konfirmasi</span>
                  <span className="font-bold text-[#2D3B2D] mt-0.5 block">
                    {selectedDeviceDetail.confirmation_code ? `${selectedDeviceDetail.confirmation_code} Kali` : '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E8EDE0]">
                  <span className="text-[#8A9B7A] block font-medium">Mode Operasional</span>
                  <span className="font-bold text-[#3A6B2A] mt-0.5 block">
                    {selectedDeviceDetail.mode || 'AUTO'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E8EDE0] xs:col-span-2">
                  <span className="text-[#8A9B7A] block font-medium">Terakhir Aktif</span>
                  <span className="font-mono font-medium text-[#2D3B2D] mt-0.5 block">
                    {formatWibFull(selectedDeviceDetail.last_seen)}
                  </span>
                </div>
              </div>

              {/* Pengujian lampu perangkat */}
              <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Pengujian Lampu Perangkat
                    </h4>
                  </div>
                  
                  {/* Pin Selection Tabs */}
                  <div className="grid grid-cols-2 bg-white/90 p-1 rounded-xl border border-emerald-300 text-[11px] font-bold w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setTestLedGpio(4)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        testLedGpio === 4 ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      Lampu Eksternal
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestLedGpio(2)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        testLedGpio === 2 ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      Lampu Perangkat
                    </button>
                  </div>
                </div>

                {ledNotice && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                    ledNotice.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {ledNotice.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{ledNotice.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLedControl('ON', testLedGpio, 0)}
                    disabled={ledTesting || !isOnline(selectedDeviceDetail)}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Nyalakan LED</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLedControl('OFF', testLedGpio, 0)}
                    disabled={ledTesting || !isOnline(selectedDeviceDetail)}
                    className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2 px-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Matikan LED</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLedControl('BLINK', testLedGpio, 3)}
                    disabled={ledTesting || !isOnline(selectedDeviceDetail)}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2 px-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ledTesting ? 'animate-spin' : ''}`} />
                    <span>Kedip 3x</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLedControl('ON', testLedGpio, 5)}
                    disabled={ledTesting || !isOnline(selectedDeviceDetail)}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2 px-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Nyala 5 Detik</span>
                  </button>
                </div>

              </div>

              {/* Footer */}
              <div className="flex items-center justify-end pt-2 border-t border-[#E8EDE0]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeviceDetail(null);
                    setLedNotice(null);
                  }}
                  className="bg-[#FAFAF7] hover:bg-[#F0F4EA] border border-[#D4DFC8] text-[#2D3B2D] font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PAIRING & LED CONFIRMATION MODAL                                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showPairModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPairModal(false)}
              className="fixed inset-0 bg-[#2D3B2D]/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white border border-[#D4DFC8] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 max-h-[94dvh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EDE0]">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-[#7BAF5A]" />
                  <h3 className="font-bold text-base text-[#2D3B2D]">
                    {pairStep === 1 && 'Tambah Perangkat ESP32'}
                    {pairStep === 2 && 'Scan QR Code Perangkat'}
                    {pairStep === 3 && 'Konfirmasi Kedipan Lampu'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowPairModal(false)}
                  className="p-1 rounded-lg text-[#8A9B7A] hover:text-[#2D3B2D] hover:bg-[#F0F4EA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: Input Serial Code / Device Name */}
              {pairStep === 1 && (() => {
                const trimmedSerial = (inputSerialCode || '').trim();
                const isSerialAlreadyAdded = trimmedSerial.length > 0 && devices.some((d) => 
                  (d.serial_code && d.serial_code.trim().toLowerCase() === trimmedSerial.toLowerCase()) ||
                  (d.device_code && d.device_code.trim().toLowerCase() === trimmedSerial.toLowerCase())
                );
                const isDeviceOnlineWs = isWsConnected && (
                  wsOnlineDevices.has(trimmedSerial) ||
                  wsOnlineDevices.has(`serial_${trimmedSerial}`) ||
                  Array.from(wsOnlineDevices).some(code => code.toLowerCase() === trimmedSerial.toLowerCase())
                );

                return (
                  <form onSubmit={handleRequestVerification} className="space-y-4">
                    {/* Danger notice if backend reports error or offline */}
                    {pairModalNotice && (
                      <div className="bg-red-50 border-2 border-red-300 text-red-700 p-3.5 rounded-xl text-xs space-y-1">
                        <div className="flex items-center space-x-2 font-bold text-red-800">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                          <span>Peringatan Koneksi ESP32</span>
                        </div>
                        <p className="leading-relaxed">{pairModalNotice.text}</p>
                      </div>
                    )}

                    <p className="text-xs text-[#5A6B5A]">
                      Masukkan nomor seri yang tertera pada perangkat atau pindai kode QR.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[#5A6B5A]">Nomor Seri / Kode Serial ESP32</label>
                          <button
                            type="button"
                            onClick={() => setPairStep(2)}
                            className="text-xs text-[#5A8A3A] hover:underline flex items-center space-x-1"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Scan QR</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={inputSerialCode}
                          onChange={(e) => {
                            setInputSerialCode(e.target.value);
                            setPairModalNotice(null);
                          }}
                          placeholder="Contoh: tes123"
                          required
                          className={`w-full font-mono rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none ${
                            isSerialAlreadyAdded
                              ? 'bg-red-50/70 border-2 border-red-400 text-red-900 focus:border-red-500'
                              : 'bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] focus:border-[#7BAF5A]'
                          }`}
                        />
                        {isSerialAlreadyAdded && (
                          <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                            <span>ESP dengan nomor seri ini sudah ditambahkan</span>
                          </div>
                        )}
                      </div>

                      {/* Real-time WebSocket connection check before pairing */}
                      {trimmedSerial && !isSerialAlreadyAdded && (
                        <div>
                          {isDeviceOnlineWs ? (
                            <div className="flex items-center space-x-2 text-xs text-[#3A6B2A] font-medium bg-[#F0F4EA] border border-[#C8D9B0] px-3.5 py-2.5 rounded-xl">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#7BAF5A] animate-ping shrink-0" />
                              <span>Perangkat "{trimmedSerial}" terdeteksi online</span>
                            </div>
                          ) : (
                            <div className="flex items-start space-x-2.5 text-xs text-red-700 bg-red-50 border-2 border-red-300 p-3.5 rounded-xl">
                              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                              <div className="space-y-0.5">
                                <p className="font-bold text-red-800">Perangkat sedang offline</p>
                                <p className="text-[11px] text-red-600 leading-relaxed">
                                  Nyalakan perangkat dan pastikan sudah terhubung ke Wi-Fi, lalu coba kembali.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-[#5A6B5A] mb-1.5">Nama Perangkat</label>
                        <input
                          type="text"
                          value={inputDevName}
                          onChange={(e) => setInputDevName(e.target.value)}
                          placeholder="Contoh: ESP32 Melon Greenhouse A"
                          required
                          className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E8EDE0]">
                      <button
                        type="button"
                        onClick={() => setShowPairModal(false)}
                        className="border border-[#D4DFC8] text-[#5A6B5A] hover:bg-[#FAFAF7] text-xs font-medium px-4 py-2.5 rounded-xl transition"
                      >
                        Batal
                      </button>

                      <button
                        type="submit"
                        disabled={requestingVerify || isSerialAlreadyAdded || !isDeviceOnlineWs}
                        className="border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#4A7A3A]"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{requestingVerify ? 'Mengirim Sinyal...' : 'Kirim Sinyal Kedip'}</span>
                      </button>
                    </div>
                  </form>
                );
              })()}

              {/* Step 2: QR Camera Scanner */}
              {pairStep === 2 && (
                <div className="space-y-4">
                  <p className="text-xs text-[#5A6B5A]">
                    Arahkan kamera ke QR Code yang ada pada modul ESP32:
                  </p>

                  <div className="relative border-2 border-dashed border-[#7BAF5A] rounded-xl overflow-hidden bg-[#FAFAF7] aspect-square flex items-center justify-center">
                    <div id="qr-reader-container" className="w-full h-full"></div>
                  </div>

                  {scannerError && (
                    <div className="border border-amber-300 text-amber-700 p-3 rounded-xl text-xs">
                      <p>{scannerError}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E8EDE0] flex items-center justify-between">
                    <label className="cursor-pointer border border-[#D4DFC8] hover:border-[#7BAF5A] text-[#5A6B5A] text-xs font-medium px-3 py-2 rounded-xl transition flex items-center space-x-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload QR Gambar</span>
                      <input type="file" accept="image/*" onChange={handleFileUploadQr} className="hidden" />
                    </label>

                    <button
                      type="button"
                      onClick={() => setPairStep(1)}
                      className="text-xs text-[#5A8A3A] hover:underline font-medium"
                    >
                      Kembali ke Input Manual
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: LED Confirmation (Select 1-8 Blinks) */}
              {pairStep === 3 && (
                <form onSubmit={handleConfirmVerification} className="space-y-4">
                  <div className="border border-[#C8D9B0] bg-[#F9FAF6] p-4 rounded-xl space-y-2 text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-[#7BAF5A] bg-white flex items-center justify-center mx-auto text-[#7BAF5A] animate-pulse">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-[#2D3B2D]">Perhatikan Lampu LED ESP32!</h4>
                    <p className="text-xs text-[#5A6B5A] leading-relaxed">
                      Sinyal konfirmasi telah dikirim. Lampu perangkat akan berkedip antara <strong>1 sampai 8 kali</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5A6B5A] mb-2 text-center">
                      Berapa kali lampu LED berkedip? (Pilih Angka 1 - 8):
                    </label>

                    {/* Number buttons 1 - 8 */}
                    <div className="grid grid-cols-4 gap-2.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                        const isSelected = selectedBlinkCount === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSelectedBlinkCount(num)}
                            className={`py-3 rounded-xl font-bold text-base transition flex flex-col items-center justify-center border-2 ${
                              isSelected
                                ? 'border-[#7BAF5A] bg-[#7BAF5A] text-white shadow-md'
                                : 'border-[#D4DFC8] bg-[#FAFAF7] text-[#2D3B2D] hover:border-[#7BAF5A] hover:bg-[#F0F4EA]'
                            }`}
                          >
                            <span>{num}</span>
                            <span className="text-[9px] font-normal opacity-80">{num} Kedip</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#E8EDE0]">
                    <button
                      type="button"
                      onClick={handleRequestVerification}
                      disabled={requestingVerify}
                      className="border border-[#D4DFC8] text-[#5A6B5A] hover:bg-[#FAFAF7] text-xs font-medium px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${requestingVerify ? 'animate-spin' : ''}`} />
                      <span>Ulangi Kedipan</span>
                    </button>

                    <button
                      type="submit"
                      disabled={confirmingVerify || !selectedBlinkCount}
                      className="border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{confirmingVerify ? 'Memverifikasi...' : 'Konfirmasi & Tambah'}</span>
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

      {/* Delete WhatsApp Number Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteWaId)}
        title="Hapus Nomor WhatsApp"
        message="Apakah Anda yakin ingin menghapus nomor WhatsApp ini dari daftar notifikasi bot fertigasi?"
        confirmText="Ya, Hapus Nomor"
        cancelText="Batal"
        confirmVariant="danger"
        loading={deletingWa}
        onConfirm={handleConfirmDeleteWaNumber}
        onCancel={() => setConfirmDeleteWaId(null)}
      />

      {/* Delete ESP32 Device Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteDeviceId)}
        title="Hapus Perangkat ESP32"
        message="Apakah Anda yakin ingin menghapus perangkat ESP32 ini? Anda harus melakukan verifikasi pairing ulang jika ingin menghubungkannya kembali."
        confirmText="Ya, Hapus Perangkat"
        cancelText="Batal"
        confirmVariant="danger"
        loading={deletingDevice}
        onConfirm={handleConfirmDeleteDevice}
        onCancel={() => setConfirmDeleteDeviceId(null)}
      />
    </motion.div>
  );
};
