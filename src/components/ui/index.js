import { useState, useEffect, useRef } from 'react';

export { ThemeToggle } from './ThemeToggle';

// ── Formatting helpers ─────────────────────────────────
export const fmt = {
  usd: v => `$${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
  date: s => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—',
  month: s => {
    if (!s) return '—';
    const [y, m] = s.split('-');
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  },
  timeAgo: s => {
    if (!s) return '';
    const d = Date.now() - new Date(s).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m/60)}h ago`;
    return fmt.date(s);
  },
  payMethod: m => ({ evc_plus:'EVC Plus', zaad:'Zaad', sahal:'Sahal', cash:'Cash', bank_transfer:'Bank Transfer' })[m] || m || '—',
  mrType: t => ({ electricity:'Electricity', plumbing:'Plumbing', painting:'Painting', ac_cooling:'AC/Cooling', other:'Other' })[t] || t,
  mrIcon: t => ({ electricity:'⚡', plumbing:'🔧', painting:'🎨', ac_cooling:'❄️', other:'🔩' })[t] || '🔩',
  initials: n => (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(),
  currentMonth: () => new Date().toISOString().slice(0,7),
};

const iconTint = {
  purple: 'bg-accent-dim text-accent',
  green: 'bg-status-green-dim text-status-green',
  amber: 'bg-status-amber-dim text-status-amber',
  red: 'bg-status-red-dim text-status-red',
  blue: 'bg-status-blue-dim text-status-blue',
  neutral: 'bg-surface text-text-2 border-[0.5px] border-border',
};

export function IconBox({ children, tint = 'purple', className = '' }) {
  return (
    <div className={`icon-box ${iconTint[tint] || iconTint.purple} ${className}`}>
      {children}
    </div>
  );
}

/** Unit/property feature chips — tinted backgrounds, readable in light & dark */
const featurePillStyles = {
  bedroom: 'bg-status-blue-dim text-status-blue border-status-blue/25',
  bath: 'bg-status-amber-dim text-status-amber border-status-amber/25',
  furnished: 'bg-accent-dim text-accent border-accent/25',
  kitchen: 'bg-status-green-dim text-status-green border-status-green/25',
  neutral: 'bg-surface text-text-2 border-border',
  off: 'bg-page text-text-3 border-border',
};

export function FeaturePill({ icon, children, variant = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[12px] font-semibold border-[0.5px] whitespace-nowrap ${featurePillStyles[variant] || featurePillStyles.neutral} ${className}`}
    >
      {icon && <span className="text-[13px] leading-none" aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}

// ── Badges ────────────────────────────────────────────
const statusStyles = {
  paid: 'bg-status-green-dim text-status-green border-status-green/20',
  pending: 'bg-status-amber-dim text-status-amber border-status-amber/20',
  overdue: 'bg-status-red-dim text-status-red border-status-red/20',
  in_progress: 'bg-status-blue-dim text-status-blue border-status-blue/20',
  completed: 'bg-status-green-dim text-status-green border-status-green/20',
  occupied: 'bg-status-green-dim text-status-green border-status-green/20',
  vacant: 'bg-status-amber-dim text-status-amber border-status-amber/20',
  maintenance: 'bg-status-red-dim text-status-red border-status-red/20',
  active: 'bg-status-green-dim text-status-green border-status-green/20',
  low: 'bg-surface text-text-3 border-border',
  medium: 'bg-status-amber-dim text-status-amber border-status-amber/20',
  high: 'bg-status-red-dim text-status-red border-status-red/20',
};

const statusLabels = {
  paid:'Paid', pending:'Pending', overdue:'Overdue',
  in_progress:'In Progress', completed:'Completed',
  occupied:'Occupied', vacant:'Vacant', maintenance:'Maintenance',
  active:'Active', low:'Low', medium:'Medium', high:'High',
};

const pulseStatuses = new Set(['paid', 'occupied', 'active', 'completed']);

export function Badge({ status, className = '' }) {
  const pulse = pulseStatuses.has(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-[11px] font-semibold uppercase tracking-wide border-[0.5px] ${statusStyles[status] || 'bg-surface text-text-3 border-border'} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? 'pulse-dot' : 'opacity-70'}`} />
      {statusLabels[status] || status}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────
export function Card({ children, className = '', onClick, hero }) {
  return (
    <div
      onClick={onClick}
      className={`surface-card ${hero ? 'rounded-xl p-edge' : ''} ${onClick ? 'surface-card-interactive cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
      <div>
        <h2 className="font-display text-[32px] leading-tight text-text-1">{title}</h2>
        {subtitle && <p className="label-ui mt-1 normal-case tracking-wide text-text-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────
const statSizes = {
  sm: {
    card: 'min-h-0 !py-3 !px-4',
    bar: 'h-[2px]',
    icon: '!w-8 !h-8 mb-2 rounded-[8px]',
    value: 'text-[22px] mb-0.5',
    label: 'text-[10px]',
    sub: 'text-[11px] mt-1',
  },
  md: {
    card: 'min-h-[100px]',
    bar: 'h-[2px]',
    icon: '!w-9 !h-9 mb-3',
    value: 'text-[28px] mb-1',
    label: 'text-[11px]',
    sub: 'text-[12px] mt-1.5',
  },
  lg: {
    card: 'min-h-[140px] !py-5 !px-5',
    bar: 'h-[3px]',
    icon: '!w-10 !h-10 mb-4',
    value: 'text-[36px] mb-1',
    label: 'text-[11px]',
    sub: 'text-[13px] mt-2',
  },
};

export function StatCard({ label, value, sub, icon, color = 'purple', size = 'sm' }) {
  const barColors = {
    purple: 'bg-accent',
    green: 'bg-status-green',
    amber: 'bg-status-amber',
    red: 'bg-status-red',
    blue: 'bg-status-blue',
  };
  const tintMap = { purple: 'purple', green: 'green', amber: 'amber', red: 'red', blue: 'blue' };
  const accentValue = color === 'purple';
  const s = statSizes[size] || statSizes.sm;
  return (
    <Card className={`relative overflow-hidden group ${s.card}`}>
      <div className={`absolute top-0 left-0 right-0 ${s.bar} ${barColors[color] || barColors.purple}`} />
      <IconBox tint={tintMap[color] || 'purple'} className={`${s.icon} group-hover:scale-105 transition-transform duration-200`}>
        {icon}
      </IconBox>
      <div className={`font-display leading-none ${s.value} ${accentValue ? 'text-accent' : 'text-text-1'}`}>{value}</div>
      <div className={`label-ui text-text-2 normal-case ${s.label}`}>{label}</div>
      {sub && <div className={`text-text-3 ${s.sub}`}>{sub}</div>}
    </Card>
  );
}

// ── Horizontal bar chart (infographic) ──────────────────
export function BarChart({ items }) {
  if (!items?.length) return null;
  const max = Math.max(...items.map(i => i.value), 1);
  const fills = { purple: 'bg-accent', green: 'bg-status-green', blue: 'bg-status-blue', amber: 'bg-status-amber', red: 'bg-status-red' };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.label || i}>
          <div className="flex items-center justify-between mb-2 gap-3">
            <span className="text-[13px] font-medium text-text-1 truncate">{item.label}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-3 flex-shrink-0">{item.meta}</span>
          </div>
          <div className="bar-chart-track">
            <div
              className={`bar-chart-fill ${fills[item.color] || fills.purple}`}
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Button ────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className = '', type = 'button' }) {
  const variants = {
    primary: 'btn-primary border-[0.5px] border-accent/30',
    secondary: 'bg-card text-text-1 border-[0.5px] border-border hover:bg-accent-dim hover:text-accent',
    danger: 'bg-status-red-dim text-status-red border-[0.5px] border-status-red/25 hover:opacity-90',
    success: 'bg-status-green-dim text-status-green border-[0.5px] border-status-green/25 hover:opacity-90',
    ghost: 'text-text-2 hover:text-accent hover:bg-accent-dim border-[0.5px] border-transparent',
  };
  const sizes = { xs: 'px-2.5 py-1 text-[11px]', sm: 'px-3 py-1.5 text-[13px]', md: 'px-4 py-2 text-[14px]', lg: 'px-5 py-2.5 text-[15px]' };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-sm font-semibold transition-all duration-200
        ${variants[variant]} ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}`}
    >
      {children}
    </button>
  );
}

// ── Input / Select / Textarea ─────────────────────────
const inputClass = 'w-full bg-input border-[0.5px] border-border rounded-sm px-3.5 py-2.5 text-text-1 text-[14px] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-dim transition-all duration-200';
const labelClass = 'label-ui block mb-1.5';

function PasswordToggle({ visible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1 transition-colors duration-200 p-0.5"
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export function Input({ label, id, className = '', type, ...props }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && passwordVisible ? 'text' : type;

  return (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={id} className={labelClass}>{label}</label>}
      <div className="relative">
        <input id={id} type={inputType} className={inputClass + (isPassword ? ' pr-10' : '')} {...props} />
        {isPassword && (
          <PasswordToggle visible={passwordVisible} onToggle={() => setPasswordVisible(v => !v)} />
        )}
      </div>
    </div>
  );
}

export function Select({ label, id, children, className = '', ...props }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={id} className={labelClass}>{label}</label>}
      <select id={id} className={inputClass + ' cursor-pointer'} {...props}>{children}</select>
    </div>
  );
}

export function Textarea({ label, id, className = '', ...props }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={id} className={labelClass}>{label}</label>}
      <textarea id={id} className={inputClass + ' min-h-[90px] resize-y rounded-md'} {...props} />
    </div>
  );
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input type="checkbox" className="w-4 h-4 accent-accent cursor-pointer" {...props} />
      <span className="text-[14px] text-text-1">{label}</span>
    </label>
  );
}

// ── Modal ─────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, large }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade"
      style={{ background: 'var(--overlay)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className={`surface-card rounded-xl w-full animate-up overflow-hidden max-h-[90vh] flex flex-col
        ${large ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between px-edge py-4 border-b-[0.5px] border-border">
          <h3 className="font-display text-[20px] text-text-1">{title}</h3>
          <button onClick={onClose} className="icon-box bg-surface text-text-3 hover:text-text-1">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="p-edge overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-edge py-4 border-t-[0.5px] border-border flex gap-3 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────
let toastFn = null;
export const toast = {
  success: (msg) => toastFn?.('success', msg),
  error: (msg) => toastFn?.('error', msg),
  info: (msg) => toastFn?.('info', msg),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    toastFn = (type, message) => {
      const id = Date.now();
      setToasts(t => [...t, { id, type, message }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    };
    return () => { toastFn = null; };
  }, []);

  const borderColors = {
    success: 'border-l-status-green',
    error: 'border-l-status-red',
    info: 'border-l-accent',
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`surface-card flex items-start gap-3 border-l-[3px] ${borderColors[t.type]} max-w-xs pointer-events-auto animate-up py-3`}>
          <span className="text-[13px] text-text-2 mt-0.5">{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span className="text-[14px] text-text-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-3' };
  return (
    <div className={`${sizes[size]} border-border rounded-full spinner`} style={{ borderTopColor: 'var(--accent)' }} />
  );
}

// ── Progress Bar ──────────────────────────────────────
export function ProgressBar({ value, max, color = 'purple' }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  const fills = { purple: 'bg-accent', green: 'bg-status-green', blue: 'bg-status-blue', amber: 'bg-status-amber', red: 'bg-status-red', accent: 'bg-accent' };
  const c = color !== 'purple' ? color : (pct > 70 ? 'green' : pct > 40 ? 'purple' : 'amber');
  return (
    <div className="bar-chart-track">
      <div className={`bar-chart-fill ${fills[c] || fills.purple}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3 opacity-40">{icon || '📭'}</div>
      <h3 className="font-display text-[20px] text-text-2 mb-1">{title}</h3>
      {description && <p className="text-[13px] text-text-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────
export function Avatar({ name, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-[11px]', md: 'w-9 h-9 text-[13px]', lg: 'w-12 h-12 text-[14px]' };
  return (
    <div className={`${sizes[size]} rounded-full bg-accent-dim border-[0.5px] border-accent/25 flex items-center justify-center font-display text-accent flex-shrink-0`}>
      {fmt.initials(name)}
    </div>
  );
}

// ── API helper ────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
