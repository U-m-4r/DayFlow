/**
 * Dayflow — Route-level UI with top nav, all screens per §7, and the §8 motion system.
 * Landing page = Employees grid (§7.2). No separate dashboard.
 * Top nav: Company Logo · Employees · Attendance · Time Off · Notification Bell · Avatar menu.
 */
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Edit2, Eye, EyeOff, FileText,
  LogOut, Menu, Plane, Plus, Save, Search, User as UserIcon, Users, Wallet, X
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { api } from './api';
import { AuthProvider, useAuth, User } from './auth';
import { AnimatedPage, MotionProvider, Stagger, StaggerItem, motion } from './components/motion';
import { Button, Chip, Empty, Field, Modal, Select, Skeleton, Status, StatusDot, TextArea, ToastProvider, useToast } from './components/ui';

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
    GENERAL: 'Info',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 text-muted hover:text-ink transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="surface-2 absolute right-0 top-12 w-80 z-50"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(notifications as any[]).length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">No notifications yet.</p>
              ) : (
                (notifications as any[]).map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                    className={`flex items-start gap-3 cursor-pointer px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider">{typeLabel[n.type] || n.type}</p>
                      <p className="mt-0.5 text-sm">{n.message}</p>
                      <p className="mt-1 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</p>
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
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
        {/* Logo */}
        <Link to="/employees" className="mr-4 flex items-center gap-2">
          {user?.companyLogo && (
            <img src={`http://localhost:4000${user.companyLogo}`} alt="" className="h-8 w-8 rounded-lg object-cover" />
          )}
          <span className="font-display text-xl text-ink">{user?.companyName || 'dayflow.'}</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `tab ${isActive ? 'tab-active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Check In/Out widget */}
          <div className="hidden items-center gap-2 sm:flex">
            {!hasCheckedIn ? (
              <Button size="sm" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
                Check In →
              </Button>
            ) : !hasCheckedOut ? (
              <div className="flex items-center gap-2">
                <StatusDot status="PRESENT" />
                <span className="text-xs font-bold text-muted">Since {checkedInTime}</span>
                <Button size="sm" variant="quiet" onClick={() => checkOut.mutate()} disabled={checkOut.isPending}>
                  Check Out →
                </Button>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-xs font-bold text-success">
                <Check size={14} /> Done for today
              </span>
            )}
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white"
            >
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              <span className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={hasCheckedIn && !hasCheckedOut ? 'PRESENT' : 'ABSENT'} size="sm" />
              </span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="surface-2 absolute right-0 top-12 w-56 p-2"
                >
                  <div className="border-b border-slate-100 px-3 py-2 mb-1">
                    <p className="font-bold text-sm">{user?.fullName}</p>
                    <p className="text-xs text-muted">{user?.email}</p>
                  </div>
                  <NavLink to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50">
                    <UserIcon size={16} /> My Profile
                  </NavLink>
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger hover:bg-red-50">
                    <LogOut size={16} /> Log Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden rounded-lg p-1.5 hover:bg-slate-100" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 md:hidden"
          >
            <div className="flex flex-col gap-1 p-3">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${
                      isActive ? 'bg-primary/5 text-primary' : 'text-muted hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon size={18} /> {label}
                </NavLink>
              ))}
              {/* Mobile check in/out */}
              <div className="mt-2 flex items-center gap-2 px-4 sm:hidden">
                {!hasCheckedIn ? (
                  <Button size="sm" className="w-full" onClick={() => { checkIn.mutate(); setMobileOpen(false); }}>Check In →</Button>
                ) : !hasCheckedOut ? (
                  <Button size="sm" variant="quiet" className="w-full" onClick={() => { checkOut.mutate(); setMobileOpen(false); }}>Check Out →</Button>
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
    <div className="min-h-screen bg-background">
      <TopNav />
      <AnimatedPage>
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          {children}
        </div>
      </AnimatedPage>
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-ink p-16 text-white lg:flex lg:flex-col lg:justify-center">
        <p className="font-display text-3xl">dayflow.</p>
        <h1 className="mt-12 max-w-md font-display text-6xl leading-[0.95] tracking-tight">
          Every workday, perfectly aligned.
        </h1>
        <p className="mt-6 max-w-sm text-lg text-slate-400">
          Premium HR management for teams that care about their people.
        </p>
      </div>
      <main className="flex items-center justify-center bg-gradient-auth p-6">
        <form onSubmit={submit} className="surface-2 w-full max-w-md p-10">
          <p className="font-bold text-primary tracking-widest text-xs">WELCOME BACK</p>
          <h1 className="mt-3 font-display text-5xl">Sign in</h1>
          <div className="mt-10 space-y-5">
            <Field label="Login ID or Email" name="identifier" required autoFocus />
            <div className="relative">
              <Field label="Password" name="password" type={showPw ? 'text' : 'password'} required minLength={8} />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-9 text-muted hover:text-ink"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="text-sm font-medium text-danger">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Enter Dayflow'}
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted">
            New here? <Link to="/signup" className="font-bold text-primary hover:underline">Register your company</Link>
          </p>
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
    <main className="min-h-screen bg-gradient-auth p-6 flex items-center justify-center">
      <form onSubmit={submit} className="surface-2 w-full max-w-xl p-10">
        <Link to="/" className="font-display text-3xl text-ink">dayflow.</Link>
        <h1 className="mt-6 font-display text-4xl">Register your company</h1>
        <p className="mt-2 text-sm text-muted">Set up your HR workspace in under a minute.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Field label="Company Name" name="companyName" required className="sm:col-span-2" />
          <label className="block sm:col-span-2">
            <span className="label">Company Logo</span>
            <input className="field" name="logo" type="file" accept="image/jpeg,image/png" />
          </label>
          <Field label="Your Full Name" name="fullName" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone" name="phone" type="tel" required />
          <div /> {/* spacer */}
          <div className="relative">
            <Field label="Password" name="password" type={showPw ? 'text' : 'password'} required minLength={8} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-9 text-muted hover:text-ink">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Field label="Confirm Password" name="confirmPassword" type="password" required minLength={8} />
        </div>
        {error && <p className="mt-4 text-sm font-medium text-danger">{error}</p>}
        {message && <p className="mt-4 text-sm font-medium text-success">{message}</p>}
        <Button className="mt-6 w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create Company'}
        </Button>
        <p className="mt-4 text-sm text-center text-muted">
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
      <div className="surface-2 max-w-md p-10 text-center">
        <h1 className="font-display text-3xl">Email Verification</h1>
        {isLoading && <p className="mt-4 text-muted">Verifying…</p>}
        {data && <p className="mt-4 text-success font-bold">{data.message}</p>}
        {error && <p className="mt-4 text-danger">{(error as any)?.response?.data?.message || 'Verification failed'}</p>}
        <Link to="/" className="mt-6 inline-block font-bold text-primary hover:underline">← Back to Sign In</Link>
      </div>
    </main>
  );
}

function ChangePassword() {
  const { user, updateUser, logout } = useAuth();
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
      toast('Password changed successfully');
      go('/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to change password');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-auth p-6">
      <form onSubmit={submit} className="surface-2 w-full max-w-md p-10">
        <h1 className="font-display text-3xl">
          {user.mustChangePassword ? 'Set your password' : 'Change password'}
        </h1>
        {user.mustChangePassword && (
          <p className="mt-2 text-sm text-muted">You must set a new password before continuing.</p>
        )}
        <div className="mt-8 space-y-4">
          {!user.mustChangePassword && (
            <Field label="Current Password" name="currentPassword" type="password" required />
          )}
          <Field label="New Password" name="newPassword" type="password" required minLength={8} />
          <Field label="Confirm New Password" name="confirmPassword" type="password" required minLength={8} />
          <p className="text-xs text-muted">Min 8 characters, 1 number, 1 symbol</p>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <Button className="w-full">Update Password</Button>
        </div>
      </form>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEES GRID (§7.2) — Landing page
// ═══════════════════════════════════════════════════════════════════════════

function EmployeesGrid() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => api.get(`/users?search=${encodeURIComponent(search)}&limit=50`).then(r => r.data),
  });

  const createEmployee = useMutation({
    mutationFn: (body: any) => api.post('/users', body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setShowCreate(false);
      toast(`${res.data.fullName} added. Credentials sent to their email.`);
    },
  });

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="page-title">Employees</h1>
        <div className="relative ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="field !mt-0 pl-9 w-64"
            placeholder="Search by name, email, or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {user?.role === 'ADMIN' && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New
          </Button>
        )}
      </div>

      {/* Employee cards grid */}
      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : data?.items?.length ? (
        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((emp: any) => (
            <StaggerItem key={emp.id}>
              <Link to={`/employees/${emp.id}`}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className="surface relative flex items-center gap-4 p-5 transition-shadow hover:shadow-surface-2"
                >
                  {/* Status dot in top-right */}
                  <span className="absolute right-4 top-4">
                    <StatusDot status={emp.todayStatus} />
                  </span>

                  {/* Avatar */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-lg font-bold text-white">
                    {emp.profilePicture ? (
                      <img src={`http://localhost:4000${emp.profilePicture}`} alt="" className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      emp.fullName?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold">{emp.fullName}</p>
                    <p className="truncate text-sm text-muted">{emp.designation || emp.department || emp.email}</p>
                  </div>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <div className="mt-8">
          <Empty icon={<Users size={40} />}>No employees found.</Empty>
        </div>
      )}

      {/* Create employee modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Employee">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            createEmployee.mutate(f);
          }}
          className="space-y-4"
        >
          <Field label="Full Name" name="fullName" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone" name="phone" type="tel" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" name="department" />
            <Field label="Job Position" name="designation" />
          </div>
          <Field
            label="Date of Joining"
            name="dateOfJoining"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            min="1970-01-01"
            max="2099-12-31"
          />
          <Field label="Location" name="location" />
          {createEmployee.isError && (
            <p className="text-sm text-danger">{(createEmployee.error as any)?.response?.data?.message || 'Failed to create'}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? 'Creating…' : 'Create Employee'}
            </Button>
            <Button type="button" variant="quiet" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE DETAIL (§7.3 — view-only for non-owner non-admin; editable for admin)
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

  // Admin can edit admin-only fields
  const saveAdminFields = useMutation({
    mutationFn: (body: any) => api.patch(`/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      toast('Profile updated');
    },
  });

  if (isLoading) return <Shell><Skeleton className="h-64" /></Shell>;
  if (!employee) return <Shell><Empty>Employee not found.</Empty></Shell>;

  // If viewing own profile, redirect to /profile (editable)
  if (isOwn) return <Navigate to="/profile" />;

  const p = employee.profile || {};
  const managerName = p.manager?.profile?.fullName;

  return (
    <Shell>
      {/* Profile header */}
      <div className="surface p-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-primary text-2xl font-bold text-white">
            {p.profilePictureUrl ? (
              <img src={`http://localhost:4000${p.profilePictureUrl}`} alt="" className="h-full w-full rounded-3xl object-cover" />
            ) : (
              p.fullName?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <h1 className="font-display text-3xl">{p.fullName}</h1>
            <p className="text-muted">{p.designation} · {employee.loginId}</p>
            <p className="text-sm text-muted">{employee.email} · {employee.phone}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          {p.department && <div><span className="section-title">Department</span><p className="mt-1 font-bold">{p.department}</p></div>}
          {p.location && <div><span className="section-title">Location</span><p className="mt-1 font-bold">{p.location}</p></div>}
          {p.dateOfJoining && <div><span className="section-title">Joined</span><p className="mt-1 font-bold">{new Date(p.dateOfJoining).toLocaleDateString()}</p></div>}
          {managerName && <div><span className="section-title">Manager</span><p className="mt-1 font-bold">{managerName}</p></div>}
        </div>

        {/* Admin edit fields */}
        {isAdmin && (
          <form
            onSubmit={e => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              saveAdminFields.mutate(f);
            }}
            className="mt-6 border-t border-slate-100 pt-6"
          >
            <p className="section-title mb-4">Admin: Edit Profile Fields</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Department" name="department" defaultValue={p.department || ''} />
              <Field label="Job Position" name="designation" defaultValue={p.designation || ''} />
              <Field label="Location" name="location" defaultValue={p.location || ''} />
              <Field label="Date of Joining" name="dateOfJoining" type="date" defaultValue={p.dateOfJoining?.slice(0, 10) || ''} min="1970-01-01" max="2099-12-31" />
            </div>
            {saveAdminFields.isError && (
              <p className="mt-2 text-sm text-danger">{(saveAdminFields.error as any)?.response?.data?.message || 'Failed to update'}</p>
            )}
            <Button size="sm" className="mt-4" disabled={saveAdminFields.isPending}>
              <Save size={14} /> {saveAdminFields.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        )}
      </div>

      {/* View-only tabs (Admin sees Salary Info too) */}
      <ProfileTabs data={employee} viewOnly={!isAdmin} isAdmin={isAdmin} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MY PROFILE (§7.3 — editable, tabbed)
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
      {/* Header */}
      <div className="surface p-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-primary text-2xl font-bold text-white">
            {p.profilePictureUrl ? (
              <img src={`http://localhost:4000${p.profilePictureUrl}`} alt="" className="h-full w-full rounded-3xl object-cover" />
            ) : (
              p.fullName?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <h1 className="font-display text-3xl">{p.fullName}</h1>
            <p className="text-muted">{p.designation || 'Team Member'} · {data.loginId}</p>
            <p className="text-sm text-muted">{data.email} · {data.phone}</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-6 text-sm">
            {data.companyName && <div><span className="section-title">Company</span><p className="mt-1 font-bold">{data.companyName}</p></div>}
            {p.department && <div><span className="section-title">Department</span><p className="mt-1 font-bold">{p.department}</p></div>}
            {p.location && <div><span className="section-title">Location</span><p className="mt-1 font-bold">{p.location}</p></div>}
            {managerName && <div><span className="section-title">Manager</span><p className="mt-1 font-bold">{managerName}</p></div>}
          </div>
        </div>
      </div>

      <ProfileTabs data={data} viewOnly={false} isAdmin={isAdmin} />
    </Shell>
  );
}

// ── Shared Profile Tabs component ───────────────────────────────────────────
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
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-100">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`tab ${activeTab === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>

      <div className="mt-6">
        {/* ── Resume Tab ─────────────────────────────────────────────── */}
        {activeTab === 'Resume' && (
          <Stagger className="grid gap-6 lg:grid-cols-2">
            <StaggerItem className="surface p-6 space-y-4">
              <h3 className="section-title">About Me</h3>
              {viewOnly ? <p className="text-sm">{p.aboutMe || '—'}</p> : (
                <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); saveProfile.mutate(f); }}>
                  <TextArea label="" name="aboutMe" defaultValue={p.aboutMe || ''} placeholder="Tell us about yourself…" />
                  <Button size="sm" className="mt-3" disabled={saveProfile.isPending}>Save</Button>
                </form>
              )}
              <h3 className="section-title pt-4">What I Love About My Job</h3>
              {viewOnly ? <p className="text-sm">{p.whatILoveMyJob || '—'}</p> : (
                <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); saveProfile.mutate(f); }}>
                  <TextArea label="" name="whatILoveMyJob" defaultValue={p.whatILoveMyJob || ''} placeholder="What motivates you?" />
                  <Button size="sm" className="mt-3" disabled={saveProfile.isPending}>Save</Button>
                </form>
              )}
              <h3 className="section-title pt-4">Interests & Hobbies</h3>
              {viewOnly ? <p className="text-sm">{p.interestsHobbies || '—'}</p> : (
                <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); saveProfile.mutate(f); }}>
                  <TextArea label="" name="interestsHobbies" defaultValue={p.interestsHobbies || ''} placeholder="Your interests…" />
                  <Button size="sm" className="mt-3" disabled={saveProfile.isPending}>Save</Button>
                </form>
              )}
            </StaggerItem>
            <StaggerItem className="surface p-6 space-y-6">
              <div>
                <h3 className="section-title">Skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data.skills || []).map((s: any) => (
                    <Chip key={s.id} label={s.name} onRemove={viewOnly ? undefined : () => removeSkill.mutate(s.id)} />
                  ))}
                  {!viewOnly && (
                    <button className="chip-add" onClick={() => {
                      const name = prompt('Add a skill:');
                      if (name?.trim()) addSkill.mutate(name.trim());
                    }}>
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h3 className="section-title">Certifications</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data.certifications || []).map((c: any) => (
                    <Chip key={c.id} label={c.name} onRemove={viewOnly ? undefined : () => removeCert.mutate(c.id)} />
                  ))}
                  {!viewOnly && (
                    <button className="chip-add" onClick={() => {
                      const name = prompt('Add a certification:');
                      if (name?.trim()) addCert.mutate(name.trim());
                    }}>
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h3 className="section-title">Documents</h3>
                <div className="mt-3 space-y-2">
                  {(data.documents || []).map((d: any) => (
                    <a key={d.id} href={`http://localhost:4000${d.fileUrl}`} target="_blank" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <FileText size={14} /> {d.docType}
                    </a>
                  ))}
                  {!data.documents?.length && <p className="text-sm text-muted">No documents uploaded.</p>}
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
            <div className="surface p-6 space-y-4">
              <h3 className="section-title">Personal Details</h3>
              <Field label="Date of Birth" name="dateOfBirth" type="date" defaultValue={p.dateOfBirth?.slice(0, 10) || ''} disabled={viewOnly} />
              <Field label="Residing Address" name="residingAddress" defaultValue={p.residingAddress || ''} disabled={viewOnly} />
              <Field label="Nationality" name="nationality" defaultValue={p.nationality || ''} disabled={viewOnly} />
              <Field label="Personal Email" name="personalEmail" type="email" defaultValue={p.personalEmail || ''} disabled={viewOnly} />
              <Select label="Gender" name="gender" defaultValue={p.gender || ''} disabled={viewOnly}>
                <option value="">—</option>
                <option>Male</option>
                <option>Female</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </Select>
              <Select label="Marital Status" name="maritalStatus" defaultValue={p.maritalStatus || ''} disabled={viewOnly}>
                <option value="">—</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </Select>
              <Field label="Date of Joining" name="dateOfJoining" type="date" defaultValue={p.dateOfJoining?.slice(0, 10) || ''} disabled />
            </div>
            <div className="surface p-6 space-y-4">
              <h3 className="section-title">Bank Details</h3>
              <Field label="Account Number" name="bankAccountNumber" defaultValue={p.bankAccountNumber || ''} disabled={viewOnly} />
              <Field label="Bank Name" name="bankName" defaultValue={p.bankName || ''} disabled={viewOnly} />
              <Field label="IFSC Code" name="ifscCode" defaultValue={p.ifscCode || ''} disabled={viewOnly} />
              <Field label="PAN No" name="panNo" defaultValue={p.panNo || ''} disabled={viewOnly} />
              <Field label="UAN No" name="uanNo" defaultValue={p.uanNo || ''} disabled={viewOnly} />
              <Field label="Emp Code" name="empCode" defaultValue={data.loginId || ''} disabled />
              {!viewOnly && (
                <div className="pt-2 space-y-3">
                  <label className="block">
                    <span className="label">Profile Photo</span>
                    <input className="field" name="profilePicture" type="file" accept="image/jpeg,image/png" />
                  </label>
                  <Field label="Phone" name="phone" type="tel" defaultValue={data.phone || ''} />
                  <Button disabled={saveProfile.isPending}>{saveProfile.isPending ? 'Saving…' : 'Save Changes'}</Button>
                </div>
              )}
            </div>
          </form>
        )}

        {/* ── Salary Info Tab (Admin-only, §7.6) ────────────────────── */}
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

// ── Salary Info Tab (§7.6) — Editable wage, components, PF, tax ─────────────
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', userId] }); toast('Components updated'); },
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

  // Local state for inline component editing
  const [editComponents, setEditComponents] = useState<any[]>([]);
  const [editPf, setEditPf] = useState<any[]>([]);
  const [editTax, setEditTax] = useState<any[]>([]);

  useEffect(() => {
    if (components.length) {
      setEditComponents(components.map((c: any) => ({
        name: c.name,
        computationType: c.computationType,
        basisOf: c.basisOf,
        value: Number(c.value),
        description: c.description || '',
      })));
    } else {
      // Default component template
      setEditComponents([
        { name: 'BASIC', computationType: 'PERCENTAGE', basisOf: 'WAGE', value: 40, description: 'Basic Salary' },
        { name: 'HRA', computationType: 'PERCENTAGE', basisOf: 'BASIC', value: 50, description: 'House Rent Allowance' },
        { name: 'STANDARD_ALLOWANCE', computationType: 'PERCENTAGE', basisOf: 'WAGE', value: 10, description: 'Standard Allowance' },
        { name: 'PERFORMANCE_BONUS', computationType: 'PERCENTAGE', basisOf: 'BASIC', value: 5, description: 'Performance Bonus' },
        { name: 'LTA', computationType: 'PERCENTAGE', basisOf: 'BASIC', value: 5, description: 'Leave Travel Allowance' },
        { name: 'FIXED_ALLOWANCE', computationType: 'FIXED', basisOf: 'WAGE', value: 0, description: 'Fixed Allowance (auto-remainder)' },
      ]);
    }
  }, [salary]);

  useEffect(() => {
    if (pf.length) {
      setEditPf(pf.map((p: any) => ({ payer: p.payer, ratePercent: Number(p.ratePercent) })));
    } else {
      setEditPf([
        { payer: 'EMPLOYEE', ratePercent: 12 },
        { payer: 'EMPLOYER', ratePercent: 12 },
      ]);
    }
  }, [salary]);

  useEffect(() => {
    if (tax.length) {
      setEditTax(tax.map((t: any) => ({ name: t.name, amount: Number(t.amount) })));
    } else {
      setEditTax([{ name: 'Professional Tax', amount: 200 }]);
    }
  }, [salary]);

  const COMPONENT_LABELS: Record<string, string> = {
    BASIC: 'Basic Salary',
    HRA: 'House Rent Allowance',
    STANDARD_ALLOWANCE: 'Standard Allowance',
    PERFORMANCE_BONUS: 'Performance Bonus',
    LTA: 'Leave Travel Allowance',
    FIXED_ALLOWANCE: 'Fixed Allowance',
  };

  return (
    <Stagger className="grid gap-6 lg:grid-cols-2">
      {/* Wage */}
      <StaggerItem className="surface p-6">
        <h3 className="section-title">Wage</h3>
        <form onSubmit={e => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          saveWage.mutate(f);
        }} className="mt-4 space-y-4">
          <p className="text-sm text-muted">Wage Type: <strong>Fixed Wage</strong></p>
          <Field label="Month Wage (₹)" name="monthWage" type="number" step="0.01" defaultValue={wage?.monthWage || ''} required />
          <p className="text-sm text-muted">Yearly Wage: <strong>{fmt((Number(wage?.monthWage) || 0) * 12)}</strong></p>
          <Field label="Working Days/Week" name="workingDaysPerWeek" type="number" min="1" max="7" defaultValue={wage?.workingDaysPerWeek || 5} />
          <Field label="Break Time (minutes)" name="breakTimeMinutes" type="number" min="0" max="240" defaultValue={wage?.breakTimeMinutes || 60} />
          <Field label="Effective From" name="effectiveFrom" type="date" defaultValue={wage?.effectiveFrom?.slice(0, 10) || new Date().toISOString().slice(0, 10)} required />
          <Button size="sm" disabled={saveWage.isPending}>Save Wage</Button>
        </form>
      </StaggerItem>

      {/* Salary Components */}
      <StaggerItem className="surface p-6">
        <h3 className="section-title">Salary Components</h3>
        <div className="mt-4 space-y-3">
          {editComponents.map((c, i) => (
            <div key={c.name} className="border border-slate-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{COMPONENT_LABELS[c.name] || c.name.replace(/_/g, ' ')}</p>
                {components.find((sc: any) => sc.name === c.name) && (
                  <p className="text-sm font-bold text-primary">
                    {fmt(components.find((sc: any) => sc.name === c.name)?.computedAmount)}/mo
                  </p>
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
                <p className="text-xs text-muted">Auto-calculated as remainder of Wage − other components</p>
              )}
            </div>
          ))}
          {saveComponents.isError && <p className="text-sm text-danger">{(saveComponents.error as any)?.response?.data?.message}</p>}
          <Button size="sm" onClick={() => saveComponents.mutate(editComponents)} disabled={saveComponents.isPending || !wage}>
            {saveComponents.isPending ? 'Saving…' : 'Save Components'}
          </Button>
          {!wage && <p className="text-xs text-warning">Set month wage first</p>}
        </div>
      </StaggerItem>

      {/* Provident Fund */}
      <StaggerItem className="surface p-6">
        <h3 className="section-title">Provident Fund (PF)</h3>
        <div className="mt-4 space-y-3">
          {editPf.map((p, i) => (
            <div key={p.payer} className="flex items-center gap-3">
              <p className="w-32 text-sm font-bold shrink-0">{p.payer === 'EMPLOYEE' ? 'Employee' : 'Employer'}</p>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  value={p.ratePercent}
                  min="0"
                  max="100"
                  step="0.01"
                  onChange={e => setEditPf(prev => prev.map((x, xi) => xi === i ? { ...x, ratePercent: Number(e.target.value) } : x))}
                  className="field !mt-0 flex-1"
                />
                <span className="text-sm text-muted">%</span>
              </div>
              {pf.find((pfc: any) => pfc.payer === p.payer) && (
                <p className="text-sm font-bold w-24 text-right">{fmt(pf.find((pfc: any) => pfc.payer === p.payer)?.computedAmount)}/mo</p>
              )}
            </div>
          ))}
          {savePf.isError && <p className="text-sm text-danger">{(savePf.error as any)?.response?.data?.message}</p>}
          <Button size="sm" onClick={() => savePf.mutate(editPf)} disabled={savePf.isPending}>
            {savePf.isPending ? 'Saving…' : 'Save PF Rates'}
          </Button>
        </div>
      </StaggerItem>

      {/* Tax Deductions */}
      <StaggerItem className="surface p-6">
        <h3 className="section-title">Tax Deductions</h3>
        <div className="mt-4 space-y-3">
          {editTax.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="text"
                value={t.name}
                onChange={e => setEditTax(prev => prev.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))}
                className="field !mt-0 flex-1"
                placeholder="Tax name"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted">₹</span>
                <input
                  type="number"
                  value={t.amount}
                  min="0"
                  step="1"
                  onChange={e => setEditTax(prev => prev.map((x, xi) => xi === i ? { ...x, amount: Number(e.target.value) } : x))}
                  className="field !mt-0 w-24"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditTax(prev => prev.filter((_, xi) => xi !== i))}
                className="text-muted hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEditTax(prev => [...prev, { name: '', amount: 0 }])}
            className="chip-add"
          >
            <Plus size={12} /> Add Tax
          </button>
          {saveTax.isError && <p className="text-sm text-danger">{(saveTax.error as any)?.response?.data?.message}</p>}
          <Button size="sm" onClick={() => saveTax.mutate(editTax)} disabled={saveTax.isPending}>
            {saveTax.isPending ? 'Saving…' : 'Save Tax Deductions'}
          </Button>
        </div>
      </StaggerItem>
    </Stagger>
  );
}

// Inline change password form for Security tab
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
      setSuccess('Password changed successfully');
      setError('');
      e.currentTarget.reset();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed');
      setSuccess('');
    }
  }

  return (
    <form onSubmit={submit} className="surface p-6 space-y-4">
      <h3 className="section-title">Change Password</h3>
      <Field label="Current Password" name="currentPassword" type="password" required />
      <Field label="New Password" name="newPassword" type="password" required minLength={8} />
      <Field label="Confirm New Password" name="confirmPassword" type="password" required minLength={8} />
      <p className="text-xs text-muted">Min 8 characters, 1 number, 1 symbol</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <Button>Update Password</Button>
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
      <h1 className="page-title">Attendance</h1>

      {/* Month nav */}
      <div className="mt-6 flex items-center gap-4">
        <button onClick={prevMonth} className="rounded-xl p-2 hover:bg-slate-100"><ChevronLeft size={20} /></button>
        <span className="font-bold">{monthLabel}</span>
        <button onClick={nextMonth} className="rounded-xl p-2 hover:bg-slate-100"><ChevronRight size={20} /></button>
      </div>

      {/* Summary strip — bento-style */}
      <Stagger className="mt-6 grid gap-4 sm:grid-cols-3">
        <StaggerItem className="surface p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-50" />
          <p className="section-title relative">Days Present</p>
          <p className="relative mt-2 font-display text-5xl text-primary">{summary.daysPresent || 0}</p>
        </StaggerItem>
        <StaggerItem className="surface p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-50" />
          <p className="section-title relative">Leaves</p>
          <p className="relative mt-2 font-display text-5xl text-warning">{summary.leavesCount || 0}</p>
        </StaggerItem>
        <StaggerItem className="surface p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-50" />
          <p className="section-title relative">Total Hours</p>
          <p className="relative mt-2 font-display text-5xl text-ink">{summary.totalWorkingHours || 0}</p>
        </StaggerItem>
      </Stagger>

      {/* Day-wise table */}
      <div className="surface mt-6 overflow-x-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : records.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-muted">
                <th className="p-4">DATE</th>
                <th className="p-4">CHECK IN</th>
                <th className="p-4">CHECK OUT</th>
                <th className="p-4">WORK HOURS</th>
                <th className="p-4">EXTRA HOURS</th>
                <th className="p-4">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {records.map((a: any) => (
                <motion.tr layout key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-4 font-medium">{new Date(a.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="p-4">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-4">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-4 font-bold">{a.workHours ? `${Number(a.workHours).toFixed(1)}h` : '—'}</td>
                  <td className="p-4 font-bold text-primary">{a.extraHours && Number(a.extraHours) > 0 ? `+${Number(a.extraHours).toFixed(1)}h` : '—'}</td>
                  <td className="p-4"><Status value={a.status} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No attendance records for this month.</Empty>
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
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="page-title">Attendance</h1>
        <input
          type="date"
          className="field !mt-0 !w-auto ml-auto"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="surface mt-6 overflow-x-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : data.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-muted">
                <th className="p-4">EMPLOYEE</th>
                <th className="p-4">CHECK IN</th>
                <th className="p-4">CHECK OUT</th>
                <th className="p-4">WORK HOURS</th>
                <th className="p-4">EXTRA HOURS</th>
                <th className="p-4">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a: any) => (
                <motion.tr layout key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-4 font-bold">{a.user?.profile?.fullName || a.userId}</td>
                  <td className="p-4">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-4">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-4 font-bold">{a.workHours ? `${Number(a.workHours).toFixed(1)}h` : '—'}</td>
                  <td className="p-4 font-bold text-primary">{a.extraHours && Number(a.extraHours) > 0 ? `+${Number(a.extraHours).toFixed(1)}h` : '—'}</td>
                  <td className="p-4"><Status value={a.status} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No attendance records for this date.</Empty>
        )}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEAVE CALENDAR (§7.5) — Year-view calendar for employees
// ═══════════════════════════════════════════════════════════════════════════

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const LEAVE_COLORS: Record<string, { bg: string; text: string }> = {
  PAID: { bg: 'bg-primary/15', text: 'text-primary' },
  SICK: { bg: 'bg-warning/15', text: 'text-warning' },
  UNPAID: { bg: 'bg-muted/10', text: 'text-muted' },
};

function LeaveCalendar({ leaves }: { leaves: any[] }) {
  const year = new Date().getFullYear();

  // Build a map: date string → leave info
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
    <div className="mt-8">
      <h2 className="section-title mb-4">Year Calendar — {year}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const firstDay = new Date(year, monthIdx, 1);
          const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
          const startDow = firstDay.getDay(); // 0=Sun

          return (
            <div key={monthIdx} className="surface p-4">
              <p className="mb-3 text-sm font-bold">{monthName}</p>
              <div className="grid grid-cols-7 gap-0.5">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[9px] font-bold text-muted py-0.5">{d}</div>
                ))}
                {/* Blank cells for start */}
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
                        flex h-6 w-full items-center justify-center rounded text-[10px] font-medium
                        ${isToday ? 'ring-1 ring-primary font-bold' : ''}
                        ${leave ? `${LEAVE_COLORS[leave.leaveType]?.bg || 'bg-slate-100'} ${LEAVE_COLORS[leave.leaveType]?.text || ''}` : 'hover:bg-slate-50'}
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
      <div className="mt-4 flex flex-wrap gap-4">
        {Object.entries(LEAVE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded ${colors.bg}`} />
            <span className="text-xs font-medium text-muted">{type === 'PAID' ? 'Paid Time Off' : type === 'SICK' ? 'Sick Leave' : 'Unpaid Leave'}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded ring-1 ring-primary" />
          <span className="text-xs font-medium text-muted">Today</span>
        </div>
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

  // Leave allocations / balances — both roles see their own
  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => api.get('/leave/allocations/me').then(r => r.data),
  });

  // Leave requests
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
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="page-title">Time Off</h1>
        {/* Both roles can request leave */}
        <Button className="ml-auto" onClick={() => setShowRequest(true)}>
          <Plus size={16} /> New Request
        </Button>
      </div>

      {/* Balance headers — BOTH roles see their own balances (§7.5) */}
      <Stagger className="mt-6 grid gap-4 sm:grid-cols-3">
        {(['PAID', 'SICK', 'UNPAID'] as const).map(type => {
          const b = getBalance(type);
          const label = LEAVE_TYPE_LABELS[type];
          return (
            <StaggerItem key={type} className="surface relative overflow-hidden p-6">
              <div className="absolute inset-0 bg-gradient-glow opacity-40" />
              <p className="section-title relative">{label}</p>
              <p className="relative mt-2 font-display text-4xl text-primary">{type === 'UNPAID' ? '∞' : b.available}</p>
              <p className="relative text-xs text-muted">{type !== 'UNPAID' ? `${b.total} total · ${b.used} used` : 'No limit'}</p>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* Admin sub-tabs */}
      {isAdmin && (
        <div className="mt-6 flex gap-1 border-b border-slate-100">
          <button onClick={() => setSubTab('requests')} className={`tab ${subTab === 'requests' ? 'tab-active' : ''}`}>Requests</button>
          <button onClick={() => setSubTab('allocation')} className={`tab ${subTab === 'allocation' ? 'tab-active' : ''}`}>Allocation</button>
        </div>
      )}

      {/* Requests list */}
      {(!isAdmin || subTab === 'requests') && (
        <div className="mt-6 space-y-3">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)
            ) : requests.length ? (
              requests.map((item: any) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="surface flex flex-wrap items-center gap-4 p-5"
                >
                  <div className="min-w-0 flex-1">
                    {/* Show employee name for admin, leave type label for employee */}
                    <p className="font-bold">
                      {isAdmin
                        ? (item.user?.profile?.fullName || 'Unknown Employee')
                        : LEAVE_TYPE_LABELS[item.leaveType] || item.leaveType
                      }
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(item.startDate).toLocaleDateString()} — {new Date(item.endDate).toLocaleDateString()}
                      {' · '}{Number(item.days)} day{Number(item.days) !== 1 ? 's' : ''}
                      {isAdmin && ` · ${LEAVE_TYPE_LABELS[item.leaveType] || item.leaveType}`}
                    </p>
                    {item.remarks && <p className="mt-1 text-xs text-muted">"{item.remarks}"</p>}
                    {item.reviewerComment && <p className="mt-1 text-xs text-warning">Comment: {item.reviewerComment}</p>}
                  </div>
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
                </motion.div>
              ))
            ) : (
              <Empty icon={<CalendarDays size={40} />}>No leave requests yet.</Empty>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Employee: year-view calendar */}
      {!isAdmin && <LeaveCalendar leaves={requests} />}

      {/* Allocation sub-tab (Admin) */}
      {isAdmin && subTab === 'allocation' && <AllocationTab />}

      {/* Request modal */}
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
          <Field label="Remarks" name="remarks" />
          <label className="block">
            <span className="label">Attachment (required for sick leave)</span>
            <input className="field" name="attachment" type="file" accept="image/jpeg,image/png,application/pdf" />
          </label>
          {applyLeave.isError && (
            <p className="text-sm text-danger">{(applyLeave.error as any)?.response?.data?.message || 'Failed to submit'}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={applyLeave.isPending}>
              {applyLeave.isPending ? 'Submitting…' : 'Submit Request'}
            </Button>
            <Button type="button" variant="quiet" onClick={() => setShowRequest(false)}>Discard</Button>
          </div>
        </form>
      </Modal>

      {/* Reject modal — proper modal instead of prompt() */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectComment(''); }} title="Reject Leave Request">
        <div className="space-y-4">
          <p className="text-sm text-muted">Please provide a reason for rejecting this leave request.</p>
          <TextArea
            label="Reason for Rejection"
            name="comment"
            value={rejectComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectComment(e.target.value)}
            placeholder="Enter rejection reason…"
            required
          />
          {decide.isError && (
            <p className="text-sm text-danger">{(decide.error as any)?.response?.data?.message || 'Failed'}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="danger"
              disabled={!rejectComment.trim() || decide.isPending}
              onClick={() => rejectModal && decide.mutate({ id: rejectModal.id, status: 'REJECTED', comment: rejectComment })}
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

// ── Admin Allocation sub-tab ────────────────────────────────────────────────
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
      <Select label="Select Employee" value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="">— Choose —</option>
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
                className="surface p-5 space-y-3"
              >
                <h4 className="text-sm font-bold">{type === 'PAID' ? 'Paid Time Off' : type === 'SICK' ? 'Sick Leave' : 'Unpaid Leave'}</h4>
                <Field label="Total Days" name="totalDays" type="number" step="0.5" defaultValue={alloc ? Number(alloc.totalDays) : 0} />
                <p className="text-xs text-muted">Used: {alloc ? Number(alloc.usedDays) : 0}</p>
                <Button size="sm" disabled={save.isPending}>Save</Button>
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
