"use client";

import { useToasts, Toast } from './toast';

export function ToastProvider() {
  const { toasts, removeToast } = useToasts();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}