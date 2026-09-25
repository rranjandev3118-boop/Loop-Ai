"use client";

import * as React from "react";
import { X } from "lucide-react";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30" role="dialog" aria-modal="true">
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "", onClose }: DialogContentProps) {
  return (
    <div className={`relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ${className}`}>
      {onClose && (
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-slate-900">{children}</h2>;
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm text-slate-500">{children}</p>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}