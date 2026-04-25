'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; type: ToastType; message: string };

const ToasterContext = createContext<{
  show: (message: string, type?: ToastType) => void;
} | null>(null);

let externalShow: ((m: string, t?: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'success') {
  externalShow?.(message, type);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    externalShow = show;
    return () => { externalShow = null; };
  }, [show]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl pointer-events-auto min-w-[280px] max-w-md font-bold text-sm border ${
            t.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800'
              : t.type === 'error'
              ? 'bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {t.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
            className="opacity-60 hover:opacity-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToasterContext);
  return { show: ctx?.show ?? toast };
}
