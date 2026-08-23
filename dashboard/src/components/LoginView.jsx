import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Droplets, Mail, Lock, LogIn, AlertCircle, UserPlus } from 'lucide-react';
import api from '../lib/axios';

export const LoginView = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/api/auth/login', { identifier, password });

      if (res.data.success) {
        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('auth_user', JSON.stringify(res.data.user));
        if (onLoginSuccess) {
          onLoginSuccess(res.data.user);
        }
      } else {
        setError(res.data.message || 'Login gagal');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal terhubung ke API server';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#2D3B2D] flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm border border-[#C8D9B0] rounded-2xl p-8 bg-white/80 backdrop-blur-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <img src="/favicon.png" alt="Logo" className="w-14 h-14 rounded-2xl object-contain mx-auto" />
          <h1 className="text-xl font-bold text-[#2D3B2D]">Smart Fertigation</h1>
        </div>

        {error && (
          <div className="border border-red-300 rounded-xl p-3 text-xs text-red-600 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Email atau Username</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9CAF88] absolute left-3 top-3" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@smart.com"
                required
                className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5A6B5A] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9CAF88] absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#FAFAF7] border border-[#D4DFC8] text-[#2D3B2D] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7BAF5A] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center space-x-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Memuat...' : 'Masuk'}</span>
          </button>
        </form>

        <div className="pt-3 border-t border-[#E8EDE0] text-center flex items-center justify-between text-xs">
          <span className="text-[#8A9B7A]">Belum punya akun?</span>
          <button
            onClick={onSwitchToRegister}
            className="text-[#5A8A3A] hover:text-[#4A7A3A] font-semibold flex items-center space-x-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
