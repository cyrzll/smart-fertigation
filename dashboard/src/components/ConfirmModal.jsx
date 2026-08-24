import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  confirmVariant = 'danger', // 'danger' | 'primary' | 'warning'
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const getConfirmButtonClasses = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20';
      case 'primary':
      default:
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl ${
                confirmVariant === 'danger' ? 'bg-red-50 text-red-600 border border-red-200' :
                confirmVariant === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}>
                {confirmVariant === 'danger' ? <Trash2 className="w-5 h-5" /> :
                 confirmVariant === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                 <Info className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">{title}</h3>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed pl-0.5">{message}</p>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer transition"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex items-center space-x-1.5 ${getConfirmButtonClasses()}`}
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              <span>{confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
