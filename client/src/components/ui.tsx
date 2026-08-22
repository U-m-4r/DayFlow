/**
 * Shared UI primitives — §8.1 / §8.3.
 * Button, Field, Status badge, StatusDot, Empty state, Modal, Toast system, Chip.
 * Every component uses the design tokens and motion primitives.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock3, XCircle, X, Plane, AlertCircle } from 'lucide-react';

// ── Button ──────────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'default',
  className = '',
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'success';
  size?: 'default' | 'sm';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = variant === 'primary' ? 'btn-primary'
    : variant === 'secondary' ? 'btn-secondary'
    : variant === 'danger' ? 'btn-danger'
    : variant === 'success' ? 'btn-success'
    : 'btn-quiet';
  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${base} ${sizeClass} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

// ── Field (input with label + error) ────────────────────────────────────────
export function Field({
  label,
  error,
  className = '',
  ...props
}: {
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <input className={`field ${error ? 'field-error' : ''}`} {...props} />
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 flex items-center gap-1 text-xs text-danger"
        >
          <AlertCircle size={12} /> {error}
        </motion.span>
      )}
    </label>
  );
}

// ── Select ──────────────────────────────────────────────────────────────────
export function Select({
  label,
  error,
  children,
  className = '',
  ...props
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <select className={`field ${error ? 'field-error' : ''}`} {...props}>
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

// ── TextArea ────────────────────────────────────────────────────────────────
export function TextArea({
  label,
  error,
  className = '',
  ...props
}: {
  label: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <textarea className={`field min-h-[80px] ${error ? 'field-error' : ''}`} {...props} />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
export function Status({ value }: { value: string }) {
  const kind = /APPROVED|PRESENT/.test(value) ? 'badge-success'
    : /REJECTED|ABSENT/.test(value) ? 'badge-danger'
    : 'badge-warning';
  const Icon = /APPROVED|PRESENT/.test(value) ? CheckCircle2
    : /REJECTED|ABSENT/.test(value) ? XCircle
    : Clock3;

  return (
    <motion.span layout className={kind}>
      <Icon size={14} />
      {value.replace(/_/g, ' ')}
    </motion.span>
  );
}

// ── StatusDot — green/yellow/airplane (§7.2) ────────────────────────────────
export function StatusDot({ status, size = 'md' }: { status: 'PRESENT' | 'ON_LEAVE' | 'ABSENT' | string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';

  if (status === 'ON_LEAVE') {
    return (
      <motion.span
        layout
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`inline-flex items-center justify-center ${sizeClass}`}
      >
        <Plane size={size === 'sm' ? 10 : size === 'lg' ? 16 : 12} className="text-primary" />
      </motion.span>
    );
  }

  const color = status === 'PRESENT' ? 'bg-success' : 'bg-warning';
  return (
    <motion.span
      layout
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      className={`status-dot ${sizeClass} ${color}`}
    />
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────
export function Empty({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="surface flex flex-col items-center justify-center p-12 text-center text-muted">
      {icon && <div className="mb-4 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="glass fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 p-8"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink">
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Toast system ────────────────────────────────────────────────────────────
type ToastItem = { id: string; message: string; type: 'success' | 'error' | 'info' };
const ToastCtx = createContext<{ toast: (msg: string, type?: ToastItem['type']) => void }>({ toast: () => {} });

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`glass flex items-center gap-3 px-5 py-3 text-sm font-bold shadow-surface-3 ${
                  t.type === 'error' ? 'text-danger' : t.type === 'info' ? 'text-primary' : 'text-success'
                }`}
              >
                {t.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                {t.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

// ── Chip (editable tag) ─────────────────────────────────────────────────────
export function Chip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <motion.span layout className="chip">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 rounded-full p-0.5 hover:bg-slate-300">
          <X size={12} />
        </button>
      )}
    </motion.span>
  );
}
