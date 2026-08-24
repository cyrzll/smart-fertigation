import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Plus, Trash2, Shield, User, Phone, AtSign,
  Smartphone, Clock, RefreshCw, Send, Check, Edit2, Save, X
} from 'lucide-react';
import { actions } from 'astro:actions';
import api from '../lib/axios';
import { goeyToast } from 'goey-toast';
import { ConfirmModal } from './ConfirmModal';

export const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState('user');
  const [submitting, setSubmitting] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [newWaPhone, setNewWaPhone] = useState('');
  const [addingWa, setAddingWa] = useState(false);
  const [otpInput, setOtpInput] = useState({});
  const [verifyingOtp, setVerifyingOtp] = useState({});

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingPhone, setEditingPhone] = useState('');

  // Delete Confirm Modal States
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  const [confirmDeleteWa, setConfirmDeleteWa] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deletingWa, setDeletingWa] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: resData, error: actionError } = await actions.getUsers();
      if (!actionError && resData && resData.success) {
        setUsers(resData.users);
      } else {
        const res = await api.get('/api/auth/users');
        if (res.data.success) {
          setUsers(res.data.users);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    try {
      setSubmitting(true);
      const payload = { name, username, email, phone, password, level };
      const { data: resData, error: actionError } = await actions.createUser(payload);
      if (!actionError && resData?.success) {
        goeyToast.success(resData.message || 'Pengguna berhasil ditambahkan!');
        setName('');
        setUsername('');
        setEmail('');
        setPhone('');
        setPassword('');
        fetchUsers();
      } else {
        const res = await api.post('/api/auth/users', payload);
        if (res.data.success) {
          goeyToast.success(res.data.message || 'Pengguna berhasil ditambahkan!');
          setName('');
          setUsername('');
          setEmail('');
          setPhone('');
          setPassword('');
          fetchUsers();
        } else {
          goeyToast.error(res.data.message || 'Gagal menambah pengguna');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal terhubung ke server';
      goeyToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePhone = async (userId) => {
    try {
      const res = await api.put(`/api/auth/users/${userId}`, { phone: editingPhone });
      if (res.data.success) {
        goeyToast.success('Nomor HP berhasil diperbarui');
        setEditingUserId(null);
        fetchUsers();
      } else {
        goeyToast.error(res.data.message || 'Gagal memperbarui nomor HP');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memperbarui nomor HP.';
      goeyToast.error(msg);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!confirmDeleteUserId) return;
    try {
      setDeletingUser(true);
      const res = await api.delete(`/api/auth/users/${confirmDeleteUserId}`);
      if (res.data.success) {
        goeyToast.success('Akun user berhasil dihapus!');
        setConfirmDeleteUserId(null);
        fetchUsers();
      } else {
        goeyToast.error(res.data.message || 'Gagal menghapus user');
      }
    } catch (err) {
      goeyToast.error('Gagal menghapus user');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleAddWaNumber = async (userId) => {
    if (!newWaPhone.trim()) return;
    try {
      setAddingWa(true);
      const res = await api.post(`/api/auth/users/${userId}/wa-numbers`, { phone: newWaPhone });
      if (res.data.success) {
        goeyToast.success(res.data.message || 'Nomor WhatsApp ditambahkan, kode OTP telah dikirim!');
        setNewWaPhone('');
        fetchUsers();
      } else {
        goeyToast.error(res.data.message || 'Gagal menambah nomor WhatsApp');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menambah nomor WhatsApp.';
      goeyToast.error(msg);
    } finally {
      setAddingWa(false);
    }
  };

  const handleVerifyOtp = async (userId, numberId) => {
    const code = otpInput[numberId];
    if (!code) return;
    try {
      setVerifyingOtp((prev) => ({ ...prev, [numberId]: true }));
      const res = await api.post(`/api/auth/users/${userId}/wa-numbers/${numberId}/verify`, { otp_code: code });
      if (res.data.success) {
        setNotice({ type: 'success', text: res.data.message });
        fetchUsers();
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

  const handleResendOtp = async (userId, numberId) => {
    try {
      const res = await api.post(`/api/auth/users/${userId}/wa-numbers/${numberId}/resend`);
      if (res.data.success) {
        goeyToast.success(res.data.message || 'Kode OTP berhasil dikirim ulang!');
        fetchUsers();
      } else {
        goeyToast.error(res.data.message || 'Gagal mengirim ulang OTP');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengirim ulang OTP.';
      goeyToast.error(msg);
    }
  };

  const handleDeleteWaConfirm = async () => {
    if (!confirmDeleteWa) return;
    try {
      setDeletingWa(true);
      const { userId, numberId } = confirmDeleteWa;
      const res = await api.delete(`/api/auth/users/${userId}/wa-numbers/${numberId}`);
      if (res.data.success) {
        goeyToast.success('Nomor WhatsApp berhasil dihapus!');
        setConfirmDeleteWa(null);
        fetchUsers();
      } else {
        goeyToast.error(res.data.message || 'Gagal menghapus nomor WhatsApp');
      }
    } catch (err) {
      goeyToast.error('Gagal menghapus nomor WhatsApp');
    } finally {
      setDeletingWa(false);
    }
  };

  const inputCls = "w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <h2 className="text-xl font-bold text-[#2D3B2D]">Manajemen User</h2>

      {/* Add User Form */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl p-5">
        <h3 className="text-sm font-bold text-[#2D3B2D] mb-3 flex items-center space-x-1.5">
          <Plus className="w-4 h-4 text-[#7BAF5A]" />
          <span>Tambah User</span>
        </h3>

        <form onSubmit={handleAddUser} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Nama</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmad Fauzi" required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="fauzi99" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="fauzi@smart.com" required className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Nomor HP</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081234567890" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white border border-[#D4DFC8] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#2D3B2D]">Daftar User</h3>
          <span className="text-xs font-medium text-[#8A9B7A] border border-[#D4DFC8] px-2.5 py-0.5 rounded-full">
            {users.length} user
          </span>
        </div>

        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="border border-[#E8EDE0] rounded-xl p-4 space-y-3 hover:border-[#C8D9B0] transition">
              {/* User Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8EDE0]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg border-2 border-[#7BAF5A] text-[#3A6B2A] font-bold text-xs flex items-center justify-center shrink-0">
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-[#2D3B2D]">{u.name}</h4>
                      <span className="text-[10px] font-mono text-[#8A9B7A] border border-[#D4DFC8] px-1.5 py-0.5 rounded">
                        {u.uid || `USR-${String(u.id).padStart(4, '0')}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-[#8A9B7A] mt-0.5">
                      <span>{u.email}</span>
                      <span>·</span>
                      <span>{u.username ? `@${u.username}` : '-'}</span>
                      <span>·</span>
                      {editingUserId === u.id ? (
                        <div className="inline-flex items-center space-x-1">
                          <input
                            type="text"
                            value={editingPhone}
                            onChange={(e) => setEditingPhone(e.target.value)}
                            className="bg-white border border-[#7BAF5A] rounded px-2 py-0.5 text-xs font-mono"
                          />
                          <button onClick={() => handleUpdatePhone(u.id)} className="p-0.5 text-[#5A8A3A]"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditingUserId(null)} className="p-0.5 text-[#8A9B7A]"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center space-x-1">
                          <span className="font-mono text-[#2D3B2D]">{u.phone || '-'}</span>
                          <button onClick={() => { setEditingUserId(u.id); setEditingPhone(u.phone || ''); }} className="text-[#9CAF88] hover:text-[#5A8A3A]"><Edit2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  {u.level === 'admin' ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#C8D9B0] text-[#5A8A3A]">
                      <Shield className="w-3 h-3" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#D4DFC8] text-[#8A9B7A]">
                      <User className="w-3 h-3" />
                      <span>User</span>
                    </span>
                  )}
                  <button
                    onClick={() => setConfirmDeleteUserId(u.id)}
                    className="p-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition cursor-pointer"
                    title="Hapus Akun User"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* WhatsApp Numbers */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-medium text-[#5A6B5A] flex items-center space-x-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#7BAF5A]" />
                    <span>WhatsApp ({u.waNumbers?.length || 0}/3)</span>
                  </h5>

                  {selectedUser !== u.id && (!u.waNumbers || u.waNumbers.length < 3) && (
                    <button
                      onClick={() => setSelectedUser(u.id)}
                      className="inline-flex items-center space-x-1 text-xs font-medium text-[#5A8A3A] hover:text-[#3A6B2A] border border-[#C8D9B0] hover:border-[#7BAF5A] px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah</span>
                    </button>
                  )}
                </div>

                {/* Add WA Form */}
                {selectedUser === u.id && (
                  <div className="bg-[#FAFAF7] border border-[#E8EDE0] rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#5A6B5A]">Tambah Nomor WA</span>
                      <button onClick={() => setSelectedUser(null)} className="text-xs text-[#8A9B7A] hover:text-[#5A6B5A]">Batal</button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newWaPhone}
                        onChange={(e) => setNewWaPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full bg-white border border-[#D4DFC8] text-[#2D3B2D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7BAF5A]"
                      />
                      <button
                        onClick={() => handleAddWaNumber(u.id)}
                        disabled={addingWa}
                        className="border border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-medium px-3 py-2 rounded-lg text-xs transition flex items-center space-x-1 shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim OTP</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* WA Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {u.waNumbers && u.waNumbers.length > 0 ? (
                    u.waNumbers.map((num) => (
                      <div key={num.id} className="border border-[#E8EDE0] rounded-lg p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-semibold text-[#2D3B2D]">+{num.whatsapp_number}</span>
                          {num.status === 'verified' ? (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-[#C8D9B0] text-[#5A8A3A]">
                              <Check className="w-2.5 h-2.5" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-amber-300 text-amber-600">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>

                        {num.status === 'pending' && (
                          <div className="pt-2 border-t border-[#E8EDE0] space-y-1.5">
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                maxLength={6}
                                value={otpInput[num.id] || ''}
                                onChange={(e) => setOtpInput((prev) => ({ ...prev, [num.id]: e.target.value }))}
                                placeholder="OTP"
                                className="w-full bg-white border border-[#D4DFC8] text-[#2D3B2D] rounded-lg px-2 py-1 text-xs font-mono text-center focus:outline-none focus:border-[#7BAF5A]"
                              />
                              <button
                                onClick={() => handleVerifyOtp(u.id, num.id)}
                                disabled={verifyingOtp[num.id]}
                                className="border border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white text-[10px] font-medium px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer"
                              >
                                Verifikasi
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <button onClick={() => handleResendOtp(u.id, num.id)} className="text-[#5A8A3A] hover:underline flex items-center space-x-0.5 cursor-pointer">
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>Kirim Ulang</span>
                              </button>
                              <button onClick={() => setConfirmDeleteWa({ userId: u.id, numberId: num.id })} className="text-red-500 hover:underline cursor-pointer">
                                Hapus
                              </button>
                            </div>
                          </div>
                        )}

                        {num.status === 'verified' && (
                          <div className="pt-1.5 border-t border-[#E8EDE0] flex items-center justify-between text-[10px]">
                            <span className="text-[#5A8A3A] font-medium">ESP32 Active</span>
                            <button onClick={() => setConfirmDeleteWa({ userId: u.id, numberId: num.id })} className="text-red-500 hover:underline cursor-pointer">
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-[#8A9B7A] text-xs py-2">
                      Belum ada nomor WhatsApp terdaftar.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteUserId)}
        title="Hapus Akun Pengguna"
        message="Apakah Anda yakin ingin menghapus akun pengguna ini beserta seluruh data konfigurasi terkait?"
        confirmText="Ya, Hapus Akun"
        cancelText="Batal"
        confirmVariant="danger"
        loading={deletingUser}
        onConfirm={handleDeleteUserConfirm}
        onCancel={() => setConfirmDeleteUserId(null)}
      />

      {/* Delete WA Number Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteWa)}
        title="Hapus Nomor WhatsApp"
        message="Apakah Anda yakin ingin menghapus nomor WhatsApp ini dari daftar akun pengguna?"
        confirmText="Ya, Hapus Nomor"
        cancelText="Batal"
        confirmVariant="danger"
        loading={deletingWa}
        onConfirm={handleDeleteWaConfirm}
        onCancel={() => setConfirmDeleteWa(null)}
      />
    </motion.div>
  );
};
