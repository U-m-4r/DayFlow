/**
 * Shared UI primitives — §8.1 / §8.3 (Enhanced Modern SaaS Edition).
 * Button, Field, Select, TextArea, Status badge, StatusDot, Empty state, Modal, Toast system, Chip.
 * Every component uses modern design tokens and Framer Motion primitives.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock3, XCircle, X, Plane, AlertCircle, Sparkles } from 'lucide-react';

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
      whileHover={{ scale: 1.015 }}
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
      {label && <span className="label block">{label}</span>}
      <input className={`field ${error ? 'field-error' : ''}`} {...props} />
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger"
        >
          <AlertCircle size={13} className="shrink-0" /> {error}
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
      {label && <span className="label block">{label}</span>}
      <select className={`field ${error ? 'field-error' : ''}`} {...props}>
        {children}
      </select>
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger"
        >
          <AlertCircle size={13} className="shrink-0" /> {error}
        </motion.span>
      )}
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
      {label && <span className="label block">{label}</span>}
      <textarea className={`field min-h-[88px] ${error ? 'field-error' : ''}`} {...props} />
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger"
        >
          <AlertCircle size={13} className="shrink-0" /> {error}
        </motion.span>
      )}
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
      <Icon size={13} className="shrink-0" />
      <span>{value.replace(/_/g, ' ')}</span>
    </motion.span>
  );
}

// ── StatusDot — green/yellow/airplane (§7.2) ────────────────────────────────
export function StatusDot({
  status,
  size = 'md',
  pulse = false,
}: {
  status: 'PRESENT' | 'ON_LEAVE' | 'ABSENT' | string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}) {
  const sizeClass = size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';

  if (status === 'ON_LEAVE') {
    return (
      <motion.span
        layout
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`inline-flex items-center justify-center rounded-full bg-teal-50 border border-teal-200 ${sizeClass}`}
      >
        <Plane size={size === 'sm' ? 10 : size === 'lg' ? 15 : 12} className="text-primary" />
      </motion.span>
    );
  }

  const isPresent = status === 'PRESENT';
  const color = isPresent ? 'bg-emerald-500' : 'bg-amber-400';

  return (
    <span className="relative inline-flex items-center justify-center">
      {isPresent && pulse && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60`} />
      )}
      <motion.span
        layout
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        className={`status-dot ${sizeClass} ${color}`}
      />
    </span>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────
export function Empty({
  children,
  icon,
  action,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center justify-center p-12 text-center text-slate-400">
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100/80 text-slate-400 border border-slate-200/50 shadow-inner">
        {icon || <Sparkles size={28} className="text-slate-300" />}
      </div>
      <p className="max-w-sm text-sm font-medium text-slate-600">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-slate-100/90 border border-slate-200/30 ${className}`} />
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
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="glass w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 scrollbar-thin border border-white/70 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between border-b border-slate-100/80 pb-4">
                <h2 className="font-display text-2xl tracking-tight text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              {children}
            </motion.div>
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
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2.5">
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`glass flex items-center gap-3 px-5 py-3 text-sm font-bold shadow-surface-3 border ${
                  t.type === 'error'
                    ? 'text-danger border-red-200/80 bg-red-50/90'
                    : t.type === 'info'
                    ? 'text-primary border-teal-200/80 bg-teal-50/90'
                    : 'text-emerald-700 border-emerald-200/80 bg-emerald-50/90'
                }`}
              >
                {t.type === 'error' ? (
                  <XCircle size={18} className="shrink-0 text-danger" />
                ) : t.type === 'info' ? (
                  <Sparkles size={18} className="shrink-0 text-primary" />
                ) : (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                )}
                <span>{t.message}</span>
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
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 text-slate-400 hover:bg-slate-300 hover:text-slate-700 transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </motion.span>
  );
}
