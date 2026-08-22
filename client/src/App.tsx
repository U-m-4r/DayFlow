/**
 * Dayflow — Premium Modern SaaS HR Management System.
 * Landing page = Employees Hub & Analytics Bento Grid.
 * Top nav: Company Logo · Employees · Attendance · Time Off · Notification Bell · Avatar menu.
 */
import React, { FormEvent, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Edit2, Eye, EyeOff, FileText,
  LogOut, Menu, Plane, Plus, Save, Search, User as UserIcon, Users, Wallet, X,
  Building2, MapPin, Mail, Phone, Calendar, ArrowUpRight, Sparkles, Filter, CheckCircle2, Shield
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { api } from './api';
import { AuthProvider, useAuth } from './auth';
import { AnimatedPage, MotionProvider, Stagger, StaggerItem, motion } from './components/motion';
import { Button, Chip, Empty, Field, Modal, Select, Skeleton, Status, StatusDot, TextArea, ToastProvider, useToast } from './components/ui';
import { ChatbotWidget } from './components/ChatbotWidget';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// ── Guards ──────────────────────────────────────────────────────────────────
function Guard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;
  if (user.mustChangePassword) return <Navigate to="/change-password" />;
  return <>{children}</>;
}

// ── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
  });

  const unread = (notifications as any[]).filter((n: any) => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const typeLabel: Record<string, string> = {
    LEAVEUPDATE: 'Leave Update',
    ATTENDANCEALERT: 'Attendance',
    GENERAL: 'General',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm hover:border-primary/40 hover:text-primary hover:bg-white transition-all"
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-danger text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="glass absolute right-0 top-13 w-84 sm:w-96 z-50 p-2 shadow-2xl border border-white/80"
          >
            <div className="flex items-center justify-between border-b border-slate-100/90 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm font-bold text-ink">Notifications</p>
                {unread > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {unread} new
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-84 overflow-y-auto scrollbar-thin divide-y divide-slate-50">
              {(notifications as any[]).length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">All caught up! No notifications.</p>
                </div>
              ) : (
                (notifications as any[]).map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                    className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-xl transition-all hover:bg-slate-50/80 ${
                      !n.isRead ? 'bg-teal-50/50' : ''
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.isRead ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-200'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {typeLabel[n.type] || n.type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink font-medium leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ── Top Navigation (§7.2, §8.3) ─────────────────────────────────────────────
function TopNav() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const qc = useQueryClient();

  const { data: todayAttendance } = useQuery({
    queryKey: ['today-attendance'],
    queryFn: () => api.get('/attendance/me?month=' + new Date().toISOString().slice(0, 7)).then(r => {
      const today = new Date().toISOString().slice(0, 10);
      return r.data.records?.find((r: any) => r.date?.slice(0, 10) === today) || null;
    }),
    refetchInterval: 30_000,
  });

  const checkIn = useMutation({
    mutationFn: () => api.post('/attendance/check-in'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today-attendance'] }),
  });
  const checkOut = useMutation({
    mutationFn: () => api.post('/attendance/check-out'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today-attendance'] }),
  });

  const hasCheckedIn = !!todayAttendance?.checkIn;
  const hasCheckedOut = !!todayAttendance?.checkOut;
  const checkedInTime = todayAttendance?.checkIn ? new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const navLinks = [
    { to: '/employees', label: 'Employees', icon: Users },
    { to: '/attendance', label: 'Attendance', icon: Clock3 },
    { to: '/leave', label: 'Time Off', icon: CalendarDays },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-sm shadow-slate-100/50">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 lg:px-8">
        {/* Brand Logo */}
        <Link to="/employees" className="mr-2 flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
            {user?.companyLogo ? (
              <img src={`http://localhost:4000${user.companyLogo}`} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <Sparkles size={18} className="text-white" />
            )}
          </div>
          <div>
            <span className="font-display text-2xl tracking-tight text-ink font-bold leading-none block">
              {user?.companyName || 'dayflow.'}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/80 block">Workspace</span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden items-center gap-1 md:flex ml-4 pl-4 border-l border-slate-200/60">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-50 text-primary shadow-xs border border-primary/20'
                    : 'text-slate-500 hover:text-ink hover:bg-slate-50'
                }`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right Section */}
        <div className="ml-auto flex items-center gap-3">
          {/* Check In/Out pill */}
          <div className="hidden items-center gap-2 sm:flex">
            {!hasCheckedIn ? (
              <Button size="sm" onClick={() => checkIn.mutate()} disabled={checkIn.isPending} className="shadow-xs">
                <Clock3 size={14} />
                <span>Check In →</span>
              </Button>
            ) : !hasCheckedOut ? (
              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 shadow-xs">
                <StatusDot status="PRESENT" size="sm" pulse />
                <span className="text-xs font-bold text-emerald-800">Since {checkedInTime}</span>
                <Button size="sm" variant="quiet" onClick={() => checkOut.mutate()} disabled={checkOut.isPending} className="!py-1 !px-2.5 !text-xs !bg-white hover:!bg-emerald-100/60 text-emerald-900 border border-emerald-200">
                  Check Out →
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Completed today</span>
              </div>
            )}
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* User Avatar Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-sm font-extrabold text-white shadow-md shadow-primary/20 ring-2 ring-white hover:scale-105 transition-transform"
            >
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              <span className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={hasCheckedIn && !hasCheckedOut ? 'PRESENT' : 'ABSENT'} size="sm" pulse={hasCheckedIn && !hasCheckedOut} />
              </span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="glass absolute right-0 top-13 w-64 p-2 shadow-2xl border border-white/80 z-50"
                >
                  <div className="border-b border-slate-100/90 px-3.5 py-3 mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-ink truncate">{user?.fullName}</p>
                      {user?.role === 'ADMIN' && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary uppercase">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <NavLink
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                  >
                    <UserIcon size={16} />
                    <span>My Profile</span>
                  </NavLink>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-danger hover:bg-red-50 transition-colors mt-1"
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 bg-white/95 md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${
                      isActive ? 'bg-primary-50 text-primary border border-primary/20' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon size={18} /> {label}
                </NavLink>
              ))}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 sm:hidden">
                {!hasCheckedIn ? (
                  <Button size="sm" className="w-full" onClick={() => { checkIn.mutate(); setMobileOpen(false); }}>
                    <Clock3 size={14} /> Check In →
                  </Button>
                ) : !hasCheckedOut ? (
                  <Button size="sm" variant="quiet" className="w-full" onClick={() => { checkOut.mutate(); setMobileOpen(false); }}>
                    Check Out →
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── Shell wraps authenticated pages ─────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <AnimatedPage>
        <main className="mx-auto max-w-7xl w-full px-4 py-8 lg:px-8 flex-1">
          {children}
        </main>
      </AnimatedPage>
      <ChatbotWidget />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH PAGES
// ═══════════════════════════════════════════════════════════════════════════

function SignIn() {
  const { user, login } = useAuth();
  const go = useNavigate();
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user && !user.mustChangePassword) return <Navigate to="/employees" />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await login(String(form.get('identifier')), String(form.get('password')));
      go('/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-gradient-auth">
      <div className="hidden bg-slate-900 p-16 text-white lg:flex lg:flex-col lg:justify-between relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/40">
            <Sparkles size={20} />
          </div>
          <span className="font-display text-3xl tracking-tight">dayflow.</span>
        </div>

        <div className="relative z-10 my-auto py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold text-teal-300 backdrop-blur-md mb-6">
            <Sparkles size={14} /> Modern HR & Team Workspace
          </div>
          <h1 className="font-display text-6xl leading-[0.95] tracking-tight">
            Every workday, <br />
            <span className="bg-gradient-to-r from-teal-300 via-teal-100 to-white bg-clip-text text-transparent">
              perfectly aligned.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base text-slate-300 leading-relaxed">
            Streamlined attendance, instant leave approvals, automated salary structure, and employee directory in one unified hub.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-400 font-medium flex items-center gap-4">
          <span>© {new Date().getFullYear()} Dayflow Inc.</span>
          <span>·</span>
          <span>Local-First Workspace</span>
        </div>
      </div>

      <main className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="surface-2 w-full max-w-md p-8 sm:p-10 shadow-2xl border border-white/80">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="font-extrabold text-primary tracking-widest text-[11px] uppercase">Welcome Back</p>
          </div>
          <h1 className="font-display text-4xl text-ink">Sign in</h1>
          <p className="text-xs text-slate-500 mt-1">Enter your company login credentials below.</p>

          <div className="mt-8 space-y-4">
            <Field label="Login ID or Email" name="identifier" required autoFocus placeholder="e.g. admin@dayflow.local" />
            <div className="relative">
              <Field label="Password" name="password" type={showPw ? 'text' : 'password'} required minLength={8} placeholder="••••••••" />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-9 text-slate-400 hover:text-ink transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-danger flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}
            <Button className="w-full mt-2" disabled={loading}>
              {loading ? 'Signing in…' : 'Enter Dayflow →'}
            </Button>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need a company workspace?{' '}
              <Link to="/signup" className="font-bold text-primary hover:underline">
                Register your company
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

function SignUp() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      await api.post('/auth/signup', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Company registered! Check MailHog to verify your email, then sign in.');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to register');
      setMessage('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-auth p-6 sm:p-12 flex items-center justify-center">
      <form onSubmit={submit} className="surface-2 w-full max-w-xl p-8 sm:p-10 shadow-2xl border border-white/80">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-ink font-bold">dayflow.</Link>
          <span className="rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-[11px] font-bold text-primary">New Organization</span>
        </div>
        <h1 className="mt-4 font-display text-3xl text-ink">Register your company</h1>
        <p className="mt-1 text-xs text-slate-500">Set up your HR workspace in under a minute.</p>
        
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Company Name" name="companyName" required className="sm:col-span-2" placeholder="Acme Corp" />
          <label className="block sm:col-span-2">
            <span className="label block">Company Logo</span>
            <input className="field" name="logo" type="file" accept="image/jpeg,image/png" />
          </label>
          <Field label="Your Full Name" name="fullName" required placeholder="Jane Doe" />
          <Field label="Email" name="email" type="email" required placeholder="jane@acme.com" />
          <Field label="Phone" name="phone" type="tel" required placeholder="+1 555-0100" />
          <div className="hidden sm:block" />
          <div className="relative">
            <Field label="Password" name="password" type={showPw ? 'text' : 'password'} required minLength={8} placeholder="Min 8 chars" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-9 text-slate-400 hover:text-ink">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Field label="Confirm Password" name="confirmPassword" type="password" required minLength={8} placeholder="Re-enter password" />
        </div>
        
        {error && <p className="mt-4 text-xs font-semibold text-danger p-3 rounded-xl bg-red-50 border border-red-200">{error}</p>}
        {message && <p className="mt-4 text-xs font-semibold text-success p-3 rounded-xl bg-emerald-50 border border-emerald-200">{message}</p>}
        
        <Button className="mt-6 w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create Company Workspace →'}
        </Button>
        <p className="mt-4 text-xs text-center text-slate-500">
          Already registered? <Link to="/" className="font-bold text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </main>
  );
}

function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { data, error, isLoading } = useQuery({
    queryKey: ['verify', token],
    queryFn: () => api.get(`/auth/verify-email?token=${token}`).then(r => r.data),
    enabled: !!token,
    retry: false,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-auth p-6">
      <div className="surface-2 max-w-md p-10 text-center shadow-2xl">
        <h1 className="font-display text-3xl">Email Verification</h1>
        {isLoading && <p className="mt-4 text-sm text-slate-400">Verifying your token…</p>}
        {data && <p className="mt-4 text-sm text-success font-bold">{data.message}</p>}
        {error && <p className="mt-4 text-sm text-danger font-semibold">{(error as any)?.response?.data?.message || 'Verification failed'}</p>}
        <Link to="/" className="mt-6 inline-block font-bold text-primary hover:underline text-sm">← Back to Sign In</Link>
      </div>
    </main>
  );
}

function ChangePassword() {
  const { user, updateUser } = useAuth();
  const go = useNavigate();
  const [error, setError] = useState('');
  const { toast } = useToast();

  if (!user) return <Navigate to="/" />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: user?.mustChangePassword ? undefined : String(form.get('currentPassword')),
        newPassword: String(form.get('newPassword')),
        confirmPassword: String(form.get('confirmPassword')),
      });
      updateUser({ mustChangePassword: false });
      toast('Password updated successfully');
      go('/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to change password');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-auth p-6">
      <form onSubmit={submit} className="surface-2 w-full max-w-md p-10 shadow-2xl">
        <h1 className="font-display text-3xl">
          {user.mustChangePassword ? 'Set your password' : 'Change password'}
        </h1>
        {user.mustChangePassword && (
          <p className="mt-2 text-xs text-slate-500">First-time login requirement: please choose a secure password.</p>
        )}
        <div className="mt-6 space-y-4">
          {!user.mustChangePassword && (
            <Field label="Current Password" name="currentPassword" type="password" required />
          )}
          <Field label="New Password" name="newPassword" type="password" required minLength={8} />
          <Field label="Confirm New Password" name="confirmPassword" type="password" required minLength={8} />
          <p className="text-[11px] text-slate-400 font-medium">Requirement: Min 8 chars, at least 1 number & 1 symbol</p>
          {error && <p className="text-xs font-semibold text-danger p-2.5 rounded-lg bg-red-50">{error}</p>}
          <Button className="w-full mt-2">Update Password</Button>
        </div>
      </form>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEES GRID & DASHBOARD HUB (§7.2)
// ═══════════════════════════════════════════════════════════════════════════

function EmployeesGrid() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => api.get(`/users?search=${encodeURIComponent(search)}&limit=100`).then(r => r.data),
  });

  const createEmployee = useMutation({
    mutationFn: (body: any) => api.post('/users', body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setShowCreate(false);
      toast(`${res.data.fullName} added! Credentials sent to their email.`);
    },
  });

  const allItems = data?.items || [];

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((emp: any) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set);
  }, [allItems]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return allItems.filter((emp: any) => {
      const matchDept = selectedDept === 'ALL' || emp.department === selectedDept;
      const matchStatus = selectedStatus === 'ALL' || emp.todayStatus === selectedStatus;
      return matchDept && matchStatus;
    });
  }, [allItems, selectedDept, selectedStatus]);

  // Compute KPI metrics
  const stats = useMemo(() => {
    const total = allItems.length;
    const present = allItems.filter((e: any) => e.todayStatus === 'PRESENT').length;
    const onLeave = allItems.filter((e: any) => e.todayStatus === 'ON_LEAVE').length;
    const absent = total - present - onLeave;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, onLeave, absent, attendanceRate, deptCount: departments.length };
  }, [allItems, departments]);

  return (
    <Shell>
      {/* Header & New Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="section-title">Directory & Live Overview</span>
          </div>
          <h1 className="page-title mt-1">Employees Hub</h1>
        </div>
        
        {user?.role === 'ADMIN' && (
          <Button onClick={() => setShowCreate(true)} className="self-start sm:self-auto">
            <Plus size={16} />
            <span>Add New Employee</span>
          </Button>
        )}
      </div>

      {/* ── Visual KPI Bento Grid ─────────────────────────────────── */}
      <Stagger className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Team */}
        <StaggerItem className="bento-stat bg-white/90">
          <div className="flex items-center justify-between">
            <span className="section-title">Total Team</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-primary border border-teal-100">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-display text-4xl text-ink font-bold">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <span>Across</span>
              <span className="font-bold text-ink">{stats.deptCount} departments</span>
            </p>
          </div>
        </StaggerItem>

        {/* Card 2: Present Today */}
        <StaggerItem className="bento-stat bg-white/90">
          <div className="flex items-center justify-between">
            <span className="section-title">Present Today</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="font-display text-4xl text-emerald-600 font-bold">{stats.present}</p>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                {stats.attendanceRate}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Checked in today</p>
          </div>
        </StaggerItem>

        {/* Card 3: On Leave */}
        <StaggerItem className="bento-stat bg-white/90">
          <div className="flex items-center justify-between">
            <span className="section-title">On Time Off</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-warning border border-amber-100">
              <Plane size={18} />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-display text-4xl text-warning font-bold">{stats.onLeave}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Approved leave today</p>
          </div>
        </StaggerItem>

        {/* Card 4: Departments */}
        <StaggerItem className="bento-stat bg-white/90">
          <div className="flex items-center justify-between">
            <span className="section-title">Active Teams</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
              <Building2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-display text-4xl text-sky-600 font-bold">{stats.deptCount}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Functional units</p>
          </div>
        </StaggerItem>
      </Stagger>

      {/* ── Modern Search & Interactive Filter Bar ────────────────── */}
      <div className="surface mt-8 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="field !mt-0 pl-10 pr-9 py-2.5 text-sm bg-white"
              placeholder="Search by name, email, or Login ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">Status:</span>
            {[
              { id: 'ALL', label: 'All', count: stats.total },
              { id: 'PRESENT', label: 'Present', count: stats.present },
              { id: 'ON_LEAVE', label: 'On Leave', count: stats.onLeave },
              { id: 'ABSENT', label: 'Absent', count: stats.absent },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStatus(s.id)}
                className={`filter-pill ${selectedStatus === s.id ? 'filter-pill-active' : ''}`}
              >
                <span>{s.label}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  selectedStatus === s.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Department Filter Pills */}
        {departments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 shrink-0">Department:</span>
            <button
              onClick={() => setSelectedDept('ALL')}
              className={`filter-pill shrink-0 ${selectedDept === 'ALL' ? 'filter-pill-active' : ''}`}
            >
              All Departments
            </button>
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`filter-pill shrink-0 ${selectedDept === dept ? 'filter-pill-active' : ''}`}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Employee Cards Grid ───────────────────────────────────── */}
      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : filteredEmployees.length ? (
        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((emp: any) => (
            <StaggerItem key={emp.id}>
              <Link to={`/employees/${emp.id}`} className="block h-full group">
                <motion.div
                  whileHover={{ y: -3 }}
                  className="surface relative flex flex-col justify-between h-full p-6 bg-white/95 border border-slate-200/70 group-hover:border-primary/40 group-hover:shadow-glass-glow transition-all"
                >
                  {/* Top row: Avatar + Status + ID */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-bold text-white shadow-md shadow-primary/20 ring-2 ring-white">
                        {emp.profilePicture ? (
                          <img src={`http://localhost:4000${emp.profilePicture}`} alt="" className="h-full w-full rounded-2xl object-cover" />
                        ) : (
                          emp.fullName?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1">
                        <StatusDot status={emp.todayStatus} size="md" pulse={emp.todayStatus === 'PRESENT'} />
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="inline-block font-mono text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {emp.loginId}
                      </span>
                    </div>
                  </div>

                  {/* Body: Full name, designation, department */}
                  <div className="mt-4 min-w-0">
                    <h3 className="truncate font-bold text-base text-ink group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{emp.fullName}</span>
                      <ArrowUpRight size={15} className="text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </h3>
                    <p className="truncate text-xs font-semibold text-slate-600 mt-0.5">
                      {emp.designation || 'Team Member'}
                    </p>
                    
                    {emp.department && (
                      <span className="inline-flex items-center gap-1 mt-2.5 rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-primary border border-teal-100/80">
                        <Building2 size={11} /> {emp.department}
                      </span>
                    )}
                  </div>

                  {/* Bottom: Contact micro-tags */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="truncate max-w-[180px] flex items-center gap-1.5">
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </span>
                    {emp.location && (
                      <span className="truncate flex items-center gap-1 shrink-0">
                        <MapPin size={12} />
                        <span>{emp.location.split(',')[0]}</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <div className="mt-8">
          <Empty
            icon={<Users size={36} />}
            action={
              (search || selectedDept !== 'ALL' || selectedStatus !== 'ALL') ? (
                <Button size="sm" variant="secondary" onClick={() => { setSearch(''); setSelectedDept('ALL'); setSelectedStatus('ALL'); }}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          >
            No employees match your search or filter criteria.
          </Empty>
        </div>
      )}

      {/* ── Create Employee Modal ──────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Onboard New Employee">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            createEmployee.mutate(f);
          }}
          className="space-y-4"
        >
          <p className="text-xs text-slate-500 mb-2">
            Add employee credentials. The system will auto-generate their company Login ID and send temporary credentials.
          </p>

          <Field label="Full Name" name="fullName" required placeholder="e.g. Avery Morgan" />
          
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Email" name="email" type="email" required placeholder="avery@company.com" />
            <Field label="Phone" name="phone" type="tel" required placeholder="+1 555-0199" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" name="department" placeholder="e.g. Engineering" />
            <Field label="Job Position" name="designation" placeholder="e.g. Senior Frontend Engineer" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date of Joining"
              name="dateOfJoining"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              min="1970-01-01"
              max="2099-12-31"
            />
            <Field label="Location" name="location" placeholder="e.g. San Francisco, CA" />
          </div>

          {createEmployee.isError && (
            <p className="text-xs font-semibold text-danger p-3 rounded-xl bg-red-50 border border-red-200">
              {(createEmployee.error as any)?.response?.data?.message || 'Failed to create employee'}
            </p>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button type="submit" disabled={createEmployee.isPending} className="flex-1">
              {createEmployee.isPending ? 'Onboarding…' : 'Create Employee Profile →'}
            </Button>
            <Button type="button" variant="quiet" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE DETAIL (§7.3)
// ═══════════════════════════════════════════════════════════════════════════

function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: authUser } = useAuth();
  const isOwn = authUser?.id === id;
  const isAdmin = authUser?.role === 'ADMIN';
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/users/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const saveAdminFields = useMutation({
    mutationFn: (body: any) => api.patch(`/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      toast('Profile updated');
    },
  });

  if (isLoading) return <Shell><Skeleton className="h-64" /></Shell>;
  if (!employee) return <Shell><Empty>Employee not found.</Empty></Shell>;

  if (isOwn) return <Navigate to="/profile" />;

  const p = employee.profile || {};
  const managerName = p.manager?.profile?.fullName;

  return (
    <Shell>
      {/* Back breadcrumb */}
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary mb-6 transition-colors">
        <ChevronLeft size={14} /> Back to Directory
      </Link>

      {/* Hero Profile Banner */}
      <div className="surface p-6 sm:p-8 bg-white/95 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-mesh opacity-60 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          <div className="relative">
            <div className="flex h-22 w-22 items-center justify-center rounded-3xl bg-gradient-primary text-3xl font-extrabold text-white shadow-lg shadow-primary/25 ring-4 ring-white">
              {p.profilePictureUrl ? (
                <img src={`http://localhost:4000${p.profilePictureUrl}`} alt="" className="h-full w-full rounded-3xl object-cover" />
              ) : (
                p.fullName?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-3xl text-ink font-bold">{p.fullName}</h1>
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                {employee.loginId}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              {p.designation || 'Team Member'} {p.department && `· ${p.department}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><Mail size={13} /> {employee.email}</span>
              {employee.phone && <span className="flex items-center gap-1"><Phone size={13} /> {employee.phone}</span>}
              {p.location && <span className="flex items-center gap-1"><MapPin size={13} /> {p.location}</span>}
              {p.dateOfJoining && <span className="flex items-center gap-1"><Calendar size={13} /> Joined {new Date(p.dateOfJoining).toLocaleDateString()}</span>}
              {managerName && <span className="flex items-center gap-1"><UserIcon size={13} /> Manager: {managerName}</span>}
            </div>
          </div>
        </div>

        {/* Admin Direct Field Editing */}
        {isAdmin && (
          <form
            onSubmit={e => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              saveAdminFields.mutate(f);
            }}
            className="mt-8 border-t border-slate-100 pt-6 relative z-10"
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-primary" />
              <p className="section-title text-primary">Admin Controls — Edit Employee Details</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Department" name="department" defaultValue={p.department || ''} />
              <Field label="Job Position" name="designation" defaultValue={p.designation || ''} />
              <Field label="Location" name="location" defaultValue={p.location || ''} />
              <Field label="Date of Joining" name="dateOfJoining" type="date" defaultValue={p.dateOfJoining?.slice(0, 10) || ''} min="1970-01-01" max="2099-12-31" />
            </div>
            {saveAdminFields.isError && (
              <p className="mt-2 text-xs font-semibold text-danger">{(saveAdminFields.error as any)?.response?.data?.message || 'Failed to update'}</p>
            )}
            <Button size="sm" className="mt-4" disabled={saveAdminFields.isPending}>
              <Save size={14} /> {saveAdminFields.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        )}
      </div>

      {/* Tabs */}
      <ProfileTabs data={employee} viewOnly={!isAdmin} isAdmin={isAdmin} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MY PROFILE (§7.3)
// ═══════════════════════════════════════════════════════════════════════════

function MyProfile() {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/users/me').then(r => r.data),
  });

  if (isLoading) return <Shell><div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div></Shell>;
  if (!data) return <Shell><Empty>Profile not found.</Empty></Shell>;

  const p = data.profile || {};
  const managerName = p.manager?.profile?.fullName;

  return (
    <Shell>
      {/* Hero Banner */}
      <div className="surface p-6 sm:p-8 bg-white/95 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-mesh opacity-60 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          <div className="flex h-22 w-22 items-center justify-center rounded-3xl bg-gradient-primary text-3xl font-extrabold text-white shadow-lg shadow-primary/25 ring-4 ring-white">
            {p.profilePictureUrl ? (
              <img src={`http://localhost:4000${p.profilePictureUrl}`} alt="" className="h-full w-full rounded-3xl object-cover" />
            ) : (
              p.fullName?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-3xl text-ink font-bold">{p.fullName}</h1>
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                {data.loginId}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              {p.designation || 'Team Member'} {p.department && `· ${p.department}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><Mail size={13} /> {data.email}</span>
              {data.phone && <span className="flex items-center gap-1"><Phone size={13} /> {data.phone}</span>}
              {p.location && <span className="flex items-center gap-1"><MapPin size={13} /> {p.location}</span>}
              {managerName && <span className="flex items-center gap-1"><UserIcon size={13} /> Manager: {managerName}</span>}
            </div>
          </div>
        </div>
      </div>

      <ProfileTabs data={data} viewOnly={false} isAdmin={isAdmin} />
    </Shell>
  );
}

// ── Shared Profile Tabs Component ───────────────────────────────────────────
function ProfileTabs({ data, viewOnly, isAdmin }: { data: any; viewOnly: boolean; isAdmin: boolean }) {
  const tabs = ['Resume', 'Private Info', ...(isAdmin ? ['Salary Info'] : []), ...(!viewOnly ? ['Security'] : [])];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const qc = useQueryClient();
  const { toast } = useToast();

  const saveProfile = useMutation({
    mutationFn: (body: FormData) => api.patch('/users/me', body, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-profile'] }); toast('Profile updated'); },
  });

  const addSkill = useMutation({
    mutationFn: (name: string) => api.post(`/users/${data.id}/skills`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  });
  const removeSkill = useMutation({
    mutationFn: (skillId: string) => api.delete(`/users/${data.id}/skills/${skillId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  });
  const addCert = useMutation({
    mutationFn: (name: string) => api.post(`/users/${data.id}/certifications`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  });
  const removeCert = useMutation({
    mutationFn: (certId: string) => api.delete(`/users/${data.id}/certifications/${certId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  });

  const p = data.profile || {};

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-slate-200/80 pb-1">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`tab ${activeTab === t ? 'tab-active' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* ── Resume Tab ─────────────────────────────────────────────── */}
        {activeTab === 'Resume' && (
          <Stagger className="grid gap-6 lg:grid-cols-2">
            <StaggerItem className="surface p-6 sm:p-7 space-y-5 bg-white/95">
              <div>
                <h3 className="section-title">About Me</h3>
                {viewOnly ? <p className="text-sm text-slate-700 mt-2 leading-relaxed">{p.aboutMe || '—'}</p> : (
                  <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); saveProfile.mutate(f); }} className="mt-2">
                    <TextArea label="" name="aboutMe" defaultValue={p.aboutMe || ''} placeholder="Tell us about yourself…" />
                    <Button size="sm" className="mt-3" disabled={saveProfile.isPending}>Save Bio</Button>
                  </form>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="section-title">What I Love About My Job</h3>
                {viewOnly ? <p className="text-sm text-slate-700 mt-2 leading-relaxed">{p.whatILoveMyJob || '—'}</p> : (
                  <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); saveProfile.mutate(f); }} className="mt-2">
                    <TextArea label="" name="whatILoveMyJob" defaultValue={p.whatILoveMyJob || ''} placeholder="What motivates you?" />
                    <Button size="sm" className="mt-3" disabled={saveProfile.isPending}>Save</Button>
                  </form>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="section-title">Interests & Hobbies</h3>
                {viewOnly ? <p className="text-sm text-slate-700 mt-2 leading-relaxed">{p.interestsHobbies || '—'}</p> : (
                  <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); saveProfile.mutate(f); }} className="mt-2">
                    <TextArea label="" name="interestsHobbies" defaultValue={p.interestsHobbies || ''} placeholder="Your hobbies and interests…" />
                    <Button size="sm" className="mt-3" disabled={saveProfile.isPending}>Save</Button>
                  </form>
                )}
              </div>
            </StaggerItem>

            <StaggerItem className="surface p-6 sm:p-7 space-y-6 bg-white/95">
              <div>
                <h3 className="section-title">Skills & Proficiencies</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data.skills || []).map((s: any) => (
                    <Chip key={s.id} label={s.name} onRemove={viewOnly ? undefined : () => removeSkill.mutate(s.id)} />
                  ))}
                  {!viewOnly && (
                    <button className="chip-add" onClick={() => {
                      const name = prompt('Add a skill (e.g. React, TypeScript):');
                      if (name?.trim()) addSkill.mutate(name.trim());
                    }}>
                      <Plus size={12} /> Add Skill
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="section-title">Certifications</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data.certifications || []).map((c: any) => (
                    <Chip key={c.id} label={c.name} onRemove={viewOnly ? undefined : () => removeCert.mutate(c.id)} />
                  ))}
                  {!viewOnly && (
                    <button className="chip-add" onClick={() => {
                      const name = prompt('Add certification title:');
                      if (name?.trim()) addCert.mutate(name.trim());
                    }}>
                      <Plus size={12} /> Add Cert
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="section-title">Documents</h3>
                <div className="mt-3 space-y-2">
                  {(data.documents || []).map((d: any) => (
                    <a key={d.id} href={`http://localhost:4000${d.fileUrl}`} target="_blank" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <FileText size={16} />
                      <span>{d.docType}</span>
                    </a>
                  ))}
                  {!data.documents?.length && <p className="text-xs text-slate-400">No documents uploaded.</p>}
                </div>
              </div>
            </StaggerItem>
          </Stagger>
        )}

        {/* ── Private Info Tab ───────────────────────────────────────── */}
        {activeTab === 'Private Info' && (
          <form
            onSubmit={e => { e.preventDefault(); saveProfile.mutate(new FormData(e.currentTarget)); }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <div className="surface p-6 sm:p-7 space-y-4 bg-white/95">
              <h3 className="section-title">Personal Details</h3>
              <Field label="Date of Birth" name="dateOfBirth" type="date" defaultValue={p.dateOfBirth?.slice(0, 10) || ''} disabled={viewOnly} />
              <Field label="Residing Address" name="residingAddress" defaultValue={p.residingAddress || ''} disabled={viewOnly} />
              <Field label="Nationality" name="nationality" defaultValue={p.nationality || ''} disabled={viewOnly} />
              <Field label="Personal Email" name="personalEmail" type="email" defaultValue={p.personalEmail || ''} disabled={viewOnly} />
              <Select label="Gender" name="gender" defaultValue={p.gender || ''} disabled={viewOnly}>
                <option value="">— Select —</option>
                <option>Male</option>
                <option>Female</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </Select>
              <Select label="Marital Status" name="maritalStatus" defaultValue={p.maritalStatus || ''} disabled={viewOnly}>
                <option value="">— Select —</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </Select>
            </div>
            <div className="surface p-6 sm:p-7 space-y-4 bg-white/95">
              <h3 className="section-title">Bank & Tax Details</h3>
              <Field label="Account Number" name="bankAccountNumber" defaultValue={p.bankAccountNumber || ''} disabled={viewOnly} />
              <Field label="Bank Name" name="bankName" defaultValue={p.bankName || ''} disabled={viewOnly} />
              <Field label="IFSC Code" name="ifscCode" defaultValue={p.ifscCode || ''} disabled={viewOnly} />
              <Field label="PAN No" name="panNo" defaultValue={p.panNo || ''} disabled={viewOnly} />
              <Field label="UAN No" name="uanNo" defaultValue={p.uanNo || ''} disabled={viewOnly} />
              {!viewOnly && (
                <div className="pt-4 space-y-3 border-t border-slate-100">
                  <label className="block">
                    <span className="label block">Update Profile Photo</span>
                    <input className="field" name="profilePicture" type="file" accept="image/jpeg,image/png" />
                  </label>
                  <Field label="Phone" name="phone" type="tel" defaultValue={data.phone || ''} />
                  <Button disabled={saveProfile.isPending}>{saveProfile.isPending ? 'Saving…' : 'Save Changes'}</Button>
                </div>
              )}
            </div>
          </form>
        )}

        {/* ── Salary Info Tab (Admin-only) ──────────────────────────── */}
        {activeTab === 'Salary Info' && isAdmin && (
          <SalaryInfoTab userId={data.id} salary={data.salary} />
        )}

        {/* ── Security Tab ──────────────────────────────────────────── */}
        {activeTab === 'Security' && !viewOnly && (
          <div className="max-w-md">
            <ChangePasswordInline />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Salary Info Tab (§7.6) ──────────────────────────────────────────────────
function SalaryInfoTab({ userId, salary: initialSalary }: { userId: string; salary?: any }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: salary } = useQuery({
    queryKey: ['payroll', userId],
    queryFn: () => api.get(`/payroll/${userId}`).then(r => r.data),
    initialData: initialSalary,
  });

  const saveWage = useMutation({
    mutationFn: (body: any) => api.put(`/payroll/${userId}/wage`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', userId] }); toast('Wage updated'); },
  });

  const saveComponents = useMutation({
    mutationFn: (body: any[]) => api.put(`/payroll/${userId}/components`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', userId] }); toast('Salary structure updated'); },
  });

  const savePf = useMutation({
    mutationFn: (body: any[]) => api.put(`/payroll/${userId}/pf`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', userId] }); toast('PF contributions updated'); },
  });

  const saveTax = useMutation({
    mutationFn: (body: any[]) => api.put(`/payroll/${userId}/tax`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', userId] }); toast('Tax deductions updated'); },
  });

  const wage = salary?.wage;
  const components = salary?.components || [];
  const pf = salary?.pf || [];
  const tax = salary?.tax || [];
  const fmt = (n: any) => Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  const [editComponents, setEditComponents] = useState<any[]>([]);
  const [editPf, setEditPf] = useState<any[]>([]);
  const [editTax, setEditTax] = useState<any[]>([]);

  useMemo(() => {
    if (components.length) {
      setEditComponents(components.map((c: any) => ({
        name: c.name,
        computationType: c.computationType,
        basisOf: c.basisOf,
        value: Number(c.value),
        description: c.description || '',
      })));
    } else {
      setEditComponents([
        { name: 'BASIC', computationType: 'PERCENTAGE', basisOf: 'WAGE', value: 40, description: 'Basic Salary' },
        { name: 'HRA', computationType: 'PERCENTAGE', basisOf: 'BASIC', value: 50, description: 'House Rent Allowance' },
        { name: 'STANDARD_ALLOWANCE', computationType: 'PERCENTAGE', basisOf: 'WAGE', value: 10, description: 'Standard Allowance' },
        { name: 'PERFORMANCE_BONUS', computationType: 'PERCENTAGE', basisOf: 'BASIC', value: 5, description: 'Performance Bonus' },
        { name: 'LTA', computationType: 'PERCENTAGE', basisOf: 'BASIC', value: 5, description: 'Leave Travel Allowance' },
        { name: 'FIXED_ALLOWANCE', computationType: 'FIXED', basisOf: 'WAGE', value: 0, description: 'Fixed Allowance (auto-remainder)' },
      ]);
    }
  }, [components]);

  useMemo(() => {
    if (pf.length) {
      setEditPf(pf.map((p: any) => ({ payer: p.payer, ratePercent: Number(p.ratePercent) })));
    } else {
      setEditPf([
        { payer: 'EMPLOYEE', ratePercent: 12 },
        { payer: 'EMPLOYER', ratePercent: 12 },
      ]);
    }
  }, [pf]);

  useMemo(() => {
    if (tax.length) {
      setEditTax(tax.map((t: any) => ({ name: t.name, amount: Number(t.amount) })));
    } else {
      setEditTax([{ name: 'Professional Tax', amount: 200 }]);
    }
  }, [tax]);

  const COMPONENT_LABELS: Record<string, string> = {
    BASIC: 'Basic Salary',
    HRA: 'House Rent Allowance (HRA)',
    STANDARD_ALLOWANCE: 'Standard Allowance',
    PERFORMANCE_BONUS: 'Performance Bonus',
    LTA: 'Leave Travel Allowance',
    FIXED_ALLOWANCE: 'Fixed Allowance',
  };

  return (
    <Stagger className="grid gap-6 lg:grid-cols-2">
      {/* Wage Configuration */}
      <StaggerItem className="surface p-6 sm:p-7 bg-white/95">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Wage Structure</h3>
          <span className="badge badge-info">Fixed CTC</span>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          saveWage.mutate(f);
        }} className="space-y-4">
          <Field label="Month Wage (₹)" name="monthWage" type="number" step="0.01" defaultValue={wage?.monthWage || ''} required />
          <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100 flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800">Annual Gross Salary:</span>
            <span className="font-display text-xl text-primary font-bold">{fmt((Number(wage?.monthWage) || 0) * 12)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Working Days/Week" name="workingDaysPerWeek" type="number" min="1" max="7" defaultValue={wage?.workingDaysPerWeek || 5} />
            <Field label="Daily Break Time (mins)" name="breakTimeMinutes" type="number" min="0" max="240" defaultValue={wage?.breakTimeMinutes || 60} />
          </div>
          <Field label="Effective From" name="effectiveFrom" type="date" defaultValue={wage?.effectiveFrom?.slice(0, 10) || new Date().toISOString().slice(0, 10)} required />
          <Button size="sm" disabled={saveWage.isPending}>Save Wage</Button>
        </form>
      </StaggerItem>

      {/* Salary Components Breakdown */}
      <StaggerItem className="surface p-6 sm:p-7 bg-white/95">
        <h3 className="section-title mb-4">Salary Components</h3>
        <div className="space-y-3">
          {editComponents.map((c, i) => (
            <div key={c.name} className="border border-slate-100 rounded-2xl p-3.5 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-ink">{COMPONENT_LABELS[c.name] || c.name}</p>
                {components.find((sc: any) => sc.name === c.name) && (
                  <span className="text-xs font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {fmt(components.find((sc: any) => sc.name === c.name)?.computedAmount)}/mo
                  </span>
                )}
              </div>
              {c.name !== 'FIXED_ALLOWANCE' && (
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={c.computationType}
                    onChange={e => setEditComponents(prev => prev.map((x, xi) => xi === i ? { ...x, computationType: e.target.value } : x))}
                    className="field !mt-0 text-xs"
                  >
                    <option value="PERCENTAGE">%</option>
                    <option value="FIXED">Fixed ₹</option>
                  </select>
                  {c.computationType === 'PERCENTAGE' && (
                    <select
                      value={c.basisOf}
                      onChange={e => setEditComponents(prev => prev.map((x, xi) => xi === i ? { ...x, basisOf: e.target.value } : x))}
                      className="field !mt-0 text-xs"
                    >
                      <option value="WAGE">of Wage</option>
                      <option value="BASIC">of Basic</option>
                    </select>
                  )}
                  <input
                    type="number"
                    value={c.value}
                    min="0"
                    step="0.01"
                    onChange={e => setEditComponents(prev => prev.map((x, xi) => xi === i ? { ...x, value: Number(e.target.value) } : x))}
                    className="field !mt-0 text-xs"
                    placeholder={c.computationType === 'PERCENTAGE' ? '%' : '₹'}
                  />
                </div>
              )}
              {c.name === 'FIXED_ALLOWANCE' && (
                <p className="text-[11px] text-slate-400">Auto-balanced remainder: Wage − sum(other components)</p>
              )}
            </div>
          ))}
          {saveComponents.isError && <p className="text-xs text-danger font-semibold">{(saveComponents.error as any)?.response?.data?.message}</p>}
          <Button size="sm" onClick={() => saveComponents.mutate(editComponents)} disabled={saveComponents.isPending || !wage}>
            {saveComponents.isPending ? 'Saving…' : 'Save Components'}
          </Button>
        </div>
      </StaggerItem>

      {/* Provident Fund */}
      <StaggerItem className="surface p-6 sm:p-7 bg-white/95">
        <h3 className="section-title mb-4">Provident Fund (PF) Contributions</h3>
        <div className="space-y-3">
          {editPf.map((p, i) => (
            <div key={p.payer} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="w-32 text-xs font-bold shrink-0">{p.payer === 'EMPLOYEE' ? 'Employee Share' : 'Employer Share'}</p>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  value={p.ratePercent}
                  min="0"
                  max="100"
                  step="0.01"
                  onChange={e => setEditPf(prev => prev.map((x, xi) => xi === i ? { ...x, ratePercent: Number(e.target.value) } : x))}
                  className="field !mt-0 flex-1 text-xs"
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>
              {pf.find((pfc: any) => pfc.payer === p.payer) && (
                <span className="text-xs font-bold text-ink w-24 text-right">
                  {fmt(pf.find((pfc: any) => pfc.payer === p.payer)?.computedAmount)}/mo
                </span>
              )}
            </div>
          ))}
          <Button size="sm" onClick={() => savePf.mutate(editPf)} disabled={savePf.isPending}>
            {savePf.isPending ? 'Saving…' : 'Save PF Rates'}
          </Button>
        </div>
      </StaggerItem>

      {/* Tax Deductions */}
      <StaggerItem className="surface p-6 sm:p-7 bg-white/95">
        <h3 className="section-title mb-4">Tax Deductions</h3>
        <div className="space-y-3">
          {editTax.map((t, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <input
                type="text"
                value={t.name}
                onChange={e => setEditTax(prev => prev.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))}
                className="field !mt-0 flex-1 text-xs"
                placeholder="Tax name"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">₹</span>
                <input
                  type="number"
                  value={t.amount}
                  min="0"
                  step="1"
                  onChange={e => setEditTax(prev => prev.map((x, xi) => xi === i ? { ...x, amount: Number(e.target.value) } : x))}
                  className="field !mt-0 w-24 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditTax(prev => prev.filter((_, xi) => xi !== i))}
                className="text-slate-400 hover:text-danger p-1"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEditTax(prev => [...prev, { name: '', amount: 0 }])}
            className="chip-add"
          >
            <Plus size={12} /> Add Tax Rule
          </button>
          <div>
            <Button size="sm" onClick={() => saveTax.mutate(editTax)} disabled={saveTax.isPending}>
              {saveTax.isPending ? 'Saving…' : 'Save Tax Deductions'}
            </Button>
          </div>
        </div>
      </StaggerItem>
    </Stagger>
  );
}

// Inline Change Password
function ChangePasswordInline() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: String(f.get('currentPassword')),
        newPassword: String(f.get('newPassword')),
        confirmPassword: String(f.get('confirmPassword')),
      });
      setSuccess('Password updated successfully');
      setError('');
      e.currentTarget.reset();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
      setSuccess('');
    }
  }

  return (
    <form onSubmit={submit} className="surface p-6 sm:p-7 space-y-4 bg-white/95">
      <h3 className="section-title">Security & Password</h3>
      <Field label="Current Password" name="currentPassword" type="password" required />
      <Field label="New Password" name="newPassword" type="password" required minLength={8} />
      <Field label="Confirm New Password" name="confirmPassword" type="password" required minLength={8} />
      <p className="text-[11px] text-slate-400">Min 8 chars with 1 number and 1 symbol</p>
      {error && <p className="text-xs font-semibold text-danger p-2.5 rounded-lg bg-red-50">{error}</p>}
      {success && <p className="text-xs font-semibold text-success p-2.5 rounded-lg bg-emerald-50">{success}</p>}
      <Button size="sm">Update Password</Button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE (§7.4)
// ═══════════════════════════════════════════════════════════════════════════

function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  if (isAdmin) return <AdminAttendance />;
  return <EmployeeAttendance />;
}

function EmployeeAttendance() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', month],
    queryFn: () => api.get(`/attendance/me?month=${month}`).then(r => r.data),
  });

  const records = data?.records || [];
  const summary = data?.summary || {};

  const prevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  return (
    <Shell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="section-title">Time Tracking</span>
          <h1 className="page-title mt-1">My Attendance</h1>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-white rounded-2xl p-1 border border-slate-200/80 shadow-sm self-start sm:self-auto">
          <button onClick={prevMonth} className="rounded-xl p-2 hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="font-bold text-sm px-3 text-ink min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="rounded-xl p-2 hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Bento Summary Strip */}
      <Stagger className="mt-8 grid gap-4 sm:grid-cols-3">
        <StaggerItem className="bento-stat bg-white/95">
          <span className="section-title">Days Present</span>
          <p className="mt-2 font-display text-5xl text-primary font-bold">{summary.daysPresent || 0}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Recorded this month</p>
        </StaggerItem>
        <StaggerItem className="bento-stat bg-white/95">
          <span className="section-title">Leaves Taken</span>
          <p className="mt-2 font-display text-5xl text-warning font-bold">{summary.leavesCount || 0}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Approved time off</p>
        </StaggerItem>
        <StaggerItem className="bento-stat bg-white/95">
          <span className="section-title">Total Hours Worked</span>
          <p className="mt-2 font-display text-5xl text-ink font-bold">{summary.totalWorkingHours || 0}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Computed effective hours</p>
        </StaggerItem>
      </Stagger>

      {/* Day-wise Table */}
      <div className="surface mt-8 overflow-x-auto scrollbar-thin bg-white/95 p-2">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : records.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="p-4">Date</th>
                <th className="p-4">Check In</th>
                <th className="p-4">Check Out</th>
                <th className="p-4">Work Hours</th>
                <th className="p-4">Extra Hours</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((a: any) => (
                <motion.tr layout key={a.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4 font-bold text-ink">{new Date(a.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="p-4 text-slate-600 font-medium">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-4 text-slate-600 font-medium">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-4 font-bold text-ink">{a.workHours ? `${Number(a.workHours).toFixed(1)}h` : '—'}</td>
                  <td className="p-4 font-bold text-primary">{a.extraHours && Number(a.extraHours) > 0 ? `+${Number(a.extraHours).toFixed(1)}h` : '—'}</td>
                  <td className="p-4"><Status value={a.status} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No attendance records found for {monthLabel}.</Empty>
        )}
      </div>
    </Shell>
  );
}

function AdminAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-attendance', date],
    queryFn: () => api.get(`/attendance?date=${date}`).then(r => r.data),
  });

  return (
    <Shell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="section-title">Admin Console</span>
          <h1 className="page-title mt-1">Company Attendance</h1>
        </div>
        <input
          type="date"
          className="field !mt-0 !w-auto bg-white"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="surface mt-8 overflow-x-auto scrollbar-thin bg-white/95 p-2">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : data.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="p-4">Employee</th>
                <th className="p-4">Check In</th>
                <th className="p-4">Check Out</th>
                <th className="p-4">Work Hours</th>
                <th className="p-4">Extra Hours</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((a: any) => (
                <motion.tr layout key={a.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4 font-bold text-ink">{a.user?.profile?.fullName || a.userId}</td>
                  <td className="p-4 text-slate-600 font-medium">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-4 text-slate-600 font-medium">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-4 font-bold text-ink">{a.workHours ? `${Number(a.workHours).toFixed(1)}h` : '—'}</td>
                  <td className="p-4 font-bold text-primary">{a.extraHours && Number(a.extraHours) > 0 ? `+${Number(a.extraHours).toFixed(1)}h` : '—'}</td>
                  <td className="p-4"><Status value={a.status} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No attendance records for {date}.</Empty>
        )}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEAVE CALENDAR (§7.5)
// ═══════════════════════════════════════════════════════════════════════════

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const LEAVE_COLORS: Record<string, { bg: string; text: string }> = {
  PAID: { bg: 'bg-teal-100 text-teal-800 font-bold', text: 'text-primary' },
  SICK: { bg: 'bg-amber-100 text-amber-800 font-bold', text: 'text-warning' },
  UNPAID: { bg: 'bg-slate-200 text-slate-700 font-bold', text: 'text-slate-600' },
};

function LeaveCalendar({ leaves }: { leaves: any[] }) {
  const year = new Date().getFullYear();

  const leaveMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const leave of leaves) {
      if (leave.status === 'REJECTED') continue;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const d = new Date(start);
      while (d <= end) {
        map[d.toISOString().slice(0, 10)] = leave;
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [leaves]);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="section-title">Annual Overview</span>
          <h2 className="text-xl font-display font-bold text-ink mt-0.5">Time Off Calendar — {year}</h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const firstDay = new Date(year, monthIdx, 1);
          const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
          const startDow = firstDay.getDay();

          return (
            <div key={monthIdx} className="surface p-4 bg-white/95">
              <p className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-600">{monthName}</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-[10px] font-bold text-slate-400 py-0.5">{d}</div>
                ))}
                {Array.from({ length: startDow }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const leave = leaveMap[dateStr];
                  const isToday = dateStr === new Date().toISOString().slice(0, 10);

                  return (
                    <div
                      key={day}
                      title={leave ? `${leave.leaveType} (${leave.status})` : undefined}
                      className={`
                        flex h-6 w-full items-center justify-center rounded-md text-[10px] font-medium transition-all
                        ${isToday ? 'ring-2 ring-primary font-extrabold bg-teal-50' : ''}
                        ${leave ? `${LEAVE_COLORS[leave.leaveType]?.bg || 'bg-slate-100'}` : 'hover:bg-slate-100/60 text-slate-700'}
                      `}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 p-3 rounded-2xl bg-white/80 border border-slate-100 text-xs font-semibold text-slate-600">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Legend:</span>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-teal-100 border border-teal-300" /> Paid Time Off</div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 border border-amber-300" /> Sick Leave</div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-200 border border-slate-300" /> Unpaid Leave</div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-primary bg-teal-50" /> Today</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIME OFF / LEAVE (§7.5)
// ═══════════════════════════════════════════════════════════════════════════

function TimeOffPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [subTab, setSubTab] = useState<'requests' | 'allocation'>('requests');
  const [showRequest, setShowRequest] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => api.get('/leave/allocations/me').then(r => r.data),
  });

  const endpoint = isAdmin ? '/leave' : '/leave/me';
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['leave-requests', endpoint],
    queryFn: () => api.get(endpoint).then(r => r.data),
  });

  const applyLeave = useMutation({
    mutationFn: (body: FormData) => api.post('/leave', body, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['allocations'] });
      setShowRequest(false);
      toast('Leave request submitted');
    },
  });

  const decide = useMutation({
    mutationFn: ({ id, status, comment }: any) => api.patch(`/leave/${id}/decision`, { status, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['allocations'] });
      toast('Decision recorded');
      setRejectModal(null);
      setRejectComment('');
    },
  });

  const getBalance = (type: string) => {
    const alloc = allocations.find((a: any) => a.leaveType === type);
    if (!alloc) return { total: 0, used: 0, available: 0 };
    return { total: Number(alloc.totalDays), used: Number(alloc.usedDays), available: Number(alloc.totalDays) - Number(alloc.usedDays) };
  };

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    PAID: 'Paid Time Off',
    SICK: 'Sick Leave',
    UNPAID: 'Unpaid Leave',
  };

  return (
    <Shell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="section-title">Absence Management</span>
          <h1 className="page-title mt-1">Time Off</h1>
        </div>
        <Button onClick={() => setShowRequest(true)} className="self-start sm:self-auto">
          <Plus size={16} /> New Request
        </Button>
      </div>

      {/* Balance Headers */}
      <Stagger className="mt-8 grid gap-4 sm:grid-cols-3">
        {(['PAID', 'SICK', 'UNPAID'] as const).map(type => {
          const b = getBalance(type);
          const label = LEAVE_TYPE_LABELS[type];
          return (
            <StaggerItem key={type} className="bento-stat bg-white/95">
              <span className="section-title">{label}</span>
              <p className="mt-2 font-display text-4xl text-primary font-bold">
                {type === 'UNPAID' ? '∞' : b.available}
                {type !== 'UNPAID' && <span className="text-sm font-sans font-bold text-slate-400 ml-1">days left</span>}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {type !== 'UNPAID' ? `${b.total} total allotted · ${b.used} used` : 'Unlimited policy'}
              </p>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* Admin Subtabs */}
      {isAdmin && (
        <div className="mt-8 flex gap-2 border-b border-slate-200 pb-1">
          <button onClick={() => setSubTab('requests')} className={`tab ${subTab === 'requests' ? 'tab-active' : ''}`}>Requests Queue</button>
          <button onClick={() => setSubTab('allocation')} className={`tab ${subTab === 'allocation' ? 'tab-active' : ''}`}>Quota Allocations</button>
        </div>
      )}

      {/* Requests Queue */}
      {(!isAdmin || subTab === 'requests') && (
        <div className="mt-6 space-y-3">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)
            ) : requests.length ? (
              requests.map((item: any) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  className="surface flex flex-wrap items-center justify-between gap-4 p-5 bg-white/95"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">
                      {isAdmin ? (item.user?.profile?.fullName || 'Employee') : (LEAVE_TYPE_LABELS[item.leaveType] || item.leaveType)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {new Date(item.startDate).toLocaleDateString()} — {new Date(item.endDate).toLocaleDateString()}
                      {' · '}<strong>{Number(item.days)} day{Number(item.days) !== 1 ? 's' : ''}</strong>
                      {isAdmin && ` · ${LEAVE_TYPE_LABELS[item.leaveType] || item.leaveType}`}
                    </p>
                    {item.remarks && <p className="mt-1.5 text-xs text-slate-600 italic">"{item.remarks}"</p>}
                    {item.reviewerComment && <p className="mt-1.5 text-xs text-warning font-semibold">Admin comment: {item.reviewerComment}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Status value={item.status} />
                    {isAdmin && item.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => decide.mutate({ id: item.id, status: 'APPROVED' })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => {
                          setRejectModal({ id: item.id });
                          setRejectComment('');
                        }}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <Empty icon={<CalendarDays size={36} />}>No leave requests recorded yet.</Empty>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Year Calendar for Employees */}
      {!isAdmin && <LeaveCalendar leaves={requests} />}

      {/* Admin Allocation Subtab */}
      {isAdmin && subTab === 'allocation' && <AllocationTab />}

      {/* Request Modal */}
      <Modal open={showRequest} onClose={() => setShowRequest(false)} title="Request Time Off">
        <form
          onSubmit={e => {
            e.preventDefault();
            applyLeave.mutate(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <Select label="Time Off Type" name="leaveType" required>
            <option value="PAID">Paid Time Off</option>
            <option value="SICK">Sick Leave</option>
            <option value="UNPAID">Unpaid Leave</option>
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date" name="startDate" type="date" required />
            <Field label="End Date" name="endDate" type="date" required />
          </div>
          <Field label="Remarks / Reason" name="remarks" placeholder="Optional notes for reviewer" />
          <label className="block">
            <span className="label block">Attachment (required for sick leave)</span>
            <input className="field" name="attachment" type="file" accept="image/jpeg,image/png,application/pdf" />
          </label>
          {applyLeave.isError && (
            <p className="text-xs font-semibold text-danger p-3 rounded-xl bg-red-50 border border-red-200">
              {(applyLeave.error as any)?.response?.data?.message || 'Failed to submit'}
            </p>
          )}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button type="submit" disabled={applyLeave.isPending} className="flex-1">
              {applyLeave.isPending ? 'Submitting…' : 'Submit Request →'}
            </Button>
            <Button type="button" variant="quiet" onClick={() => setShowRequest(false)}>Discard</Button>
          </div>
        </form>
      </Modal>

      {/* Rejection Modal */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectComment(''); }} title="Reject Time Off Request">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Provide a helpful reason for the employee regarding why this request was declined.</p>
          <TextArea
            label="Reason for Rejection"
            name="comment"
            value={rejectComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectComment(e.target.value)}
            placeholder="e.g. Incomplete sprint commitments, please reschedule."
            required
          />
          {decide.isError && (
            <p className="text-xs font-semibold text-danger">{(decide.error as any)?.response?.data?.message || 'Failed'}</p>
          )}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="danger"
              disabled={!rejectComment.trim() || decide.isPending}
              onClick={() => rejectModal && decide.mutate({ id: rejectModal.id, status: 'REJECTED', comment: rejectComment })}
              className="flex-1"
            >
              {decide.isPending ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
            <Button type="button" variant="quiet" onClick={() => { setRejectModal(null); setRejectComment(''); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}

// ── Admin Allocation Tab ────────────────────────────────────────────────────
function AllocationTab() {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/users?limit=100').then(r => r.data),
  });
  const [selected, setSelected] = useState('');
  const { data: allocs = [], refetch } = useQuery({
    queryKey: ['admin-allocs', selected],
    queryFn: () => api.get(`/leave/allocations/${selected}`).then(r => r.data),
    enabled: !!selected,
  });
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: ({ leaveType, totalDays }: any) =>
      api.put(`/leave/allocations/${selected}`, { leaveType, totalDays }),
    onSuccess: () => { refetch(); toast('Allocation updated'); },
  });

  return (
    <div className="mt-6 space-y-6">
      <Select label="Select Employee to Manage Quota" value={selected} onChange={e => setSelected(e.target.value)} className="max-w-md">
        <option value="">— Select Employee —</option>
        {employees?.items?.map((emp: any) => (
          <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.loginId})</option>
        ))}
      </Select>

      {selected && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(['PAID', 'SICK', 'UNPAID'] as const).map(type => {
            const alloc = allocs.find((a: any) => a.leaveType === type);
            return (
              <form
                key={type}
                onSubmit={e => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  save.mutate({ leaveType: type, totalDays: Number(f.get('totalDays')) });
                }}
                className="surface p-6 space-y-3 bg-white/95"
              >
                <h4 className="text-sm font-bold text-ink">{type === 'PAID' ? 'Paid Time Off' : type === 'SICK' ? 'Sick Leave' : 'Unpaid Leave'}</h4>
                <Field label="Total Allowed Days" name="totalDays" type="number" step="0.5" defaultValue={alloc ? Number(alloc.totalDays) : 0} />
                <p className="text-xs text-slate-400 font-semibold">Currently Used: {alloc ? Number(alloc.usedDays) : 0} days</p>
                <Button size="sm" disabled={save.isPending}>Update Quota</Button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MotionProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/change-password" element={<ChangePassword />} />

                {/* Protected */}
                <Route path="/employees" element={<Guard><EmployeesGrid /></Guard>} />
                <Route path="/employees/:id" element={<Guard><EmployeeDetail /></Guard>} />
                <Route path="/profile" element={<Guard><MyProfile /></Guard>} />
                <Route path="/attendance" element={<Guard><AttendancePage /></Guard>} />
                <Route path="/leave" element={<Guard><TimeOffPage /></Guard>} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </MotionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
