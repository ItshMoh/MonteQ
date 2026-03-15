import { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface DialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

interface DialogContextType {
  showDialog: (options: DialogOptions) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);

  const showDialog = (options: DialogOptions) => {
    setDialog(options);
  };

  const closeDialog = () => {
    setDialog(null);
  };

  const handleConfirm = () => {
    if (dialog) {
      dialog.onConfirm();
      closeDialog();
    }
  };

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeDialog}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] shadow-2xl overflow-hidden"
            >
              {/* Top accent line */}
              <div className={`h-1 w-full ${dialog.isDestructive ? 'bg-red-500' : 'bg-accent'}`} />

              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`shrink-0 p-3 rounded-full ${dialog.isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-mono text-lg font-bold text-[#EBE8E1] mb-2">{dialog.title}</h3>
                    <p className="font-mono text-sm text-gray-400 leading-relaxed">{dialog.message}</p>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={closeDialog}
                    className="flex-1 px-4 py-3 font-mono text-sm font-bold text-gray-400 hover:text-[#EBE8E1] hover:bg-[#2A2A2A] border border-[#2A2A2A] transition-colors"
                  >
                    {dialog.cancelLabel || 'CANCEL'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 px-4 py-3 font-mono text-sm font-bold transition-colors ${
                      dialog.isDestructive
                        ? 'bg-red-500 text-[#141414] hover:bg-red-600'
                        : 'bg-[#EBE8E1] text-[#141414] hover:bg-white'
                    }`}
                  >
                    {dialog.confirmLabel || 'CONFIRM'}
                  </button>
                </div>
              </div>

              <button
                onClick={closeDialog}
                className="absolute top-4 right-4 text-gray-500 hover:text-[#EBE8E1] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
};
