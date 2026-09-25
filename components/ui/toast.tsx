"use client";

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200'
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl border shadow-lg transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${bgColors[toast.type]}`}
    >
      <div className="flex items-start gap-3">
        {icons[toast.type]}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{toast.message}</p>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...toasts]));
}

export function showToast(type: ToastType, message: string, duration?: number) {
  const id = `toast-${toastId++}`;
  const toast: Toast = { id, type, message, duration };
  toasts.push(toast);
  notifyListeners();
}

export function useToasts() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setCurrentToasts);
    return () => {
      listeners.delete(setCurrentToasts);
    };
  }, []);

  const removeToast = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  };

  return {
    toasts: currentToasts,
    removeToast
  };
}

export const toast = {
  success: (message: string, duration?: number) => showToast('success', message, duration),
  error: (message: string, duration?: number) => showToast('error', message, duration),
  warning: (message: string, duration?: number) => showToast('warning', message, duration),
  info: (message: string, duration?: number) => showToast('info', message, duration)
};