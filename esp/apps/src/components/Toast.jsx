import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export function ToastContainer({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      {toasts.map((toast) => {
        const typeStyles = {
          success: 'bg-[#E8F2DF] border-[#C8D9B0] text-[#2D3B2D] shadow-sm',
          error: 'bg-red-50 border-red-200 text-red-800 shadow-sm',
          warning: 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm',
          info: 'bg-[#F0F4EA] border-[#D4DFC8] text-[#2D3B2D] shadow-sm',
        }[toast.type || 'info'];

        const Icon = {
          success: CheckCircle2,
          error: XCircle,
          warning: AlertTriangle,
          info: Info,
        }[toast.type || 'info'];

        const iconColor = {
          success: 'text-[#7BAF5A]',
          error: 'text-red-500',
          warning: 'text-amber-600',
          info: 'text-[#5A6B5A]',
        }[toast.type || 'info'];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${typeStyles}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-sm font-medium">
              {toast.title && <div className="font-bold text-[#2D3B2D] mb-0.5">{toast.title}</div>}
              <div className="text-xs opacity-90">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-lg hover:bg-black/5 text-[#8A9B7A] hover:text-[#2D3B2D] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
