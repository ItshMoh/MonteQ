import { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-80 border p-4 shadow-2xl flex items-start gap-3 relative overflow-hidden ${
                toast.type === 'success' ? 'bg-[#1A1A1A] border-green-500/50' :
                toast.type === 'error' ? 'bg-[#1A1A1A] border-red-500/50' :
                toast.type === 'warning' ? 'bg-[#1A1A1A] border-accent/50' :
                'bg-[#1A1A1A] border-gray-500/50'
              }`}
            >
              {/* Left accent line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                toast.type === 'success' ? 'bg-green-500' :
                toast.type === 'error' ? 'bg-red-500' :
                toast.type === 'warning' ? 'bg-accent' :
                'bg-gray-500'
              }`} />

              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-accent" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-gray-400" />}
              </div>

              <div className="flex-1 pr-6">
                <div className="font-mono text-sm font-bold text-[#EBE8E1] mb-1">{toast.title}</div>
                <div className="font-mono text-xs text-gray-400">{toast.message}</div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-4 right-4 text-gray-500 hover:text-[#EBE8E1] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
