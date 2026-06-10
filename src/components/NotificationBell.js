import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, fmt } from './ui';
import { LIVE_REFRESH_MS, LIVE_REFRESH_EVENT } from '../hooks/useAutoRefresh';

const POLL_MS = LIVE_REFRESH_MS;

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/notifications');
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* ignore when logged out */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const onGlobal = () => load();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(LIVE_REFRESH_EVENT, onGlobal);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(LIVE_REFRESH_EVENT, onGlobal);
    };
  }, [load]);

  useEffect(() => {
    function onDocClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  }

  async function markAllRead() {
    const data = await apiFetch('/api/notifications', { method: 'PATCH', body: { all: true } });
    setUnreadCount(data.unreadCount || 0);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  }

  async function handleClick(item) {
    if (!item.read_at) {
      await apiFetch('/api/notifications', { method: 'PATCH', body: { id: item.id } });
      setUnreadCount((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  return (
    <div className="relative z-50" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative icon-box bg-surface text-text-2 hover:text-text-1"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-status-red text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,360px)] surface-card rounded-lg border border-border shadow-2xl z-[100] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm text-text-1">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <p className="text-center text-text-3 text-sm py-8">Loading…</p>
            ) : items.length ? (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-surface transition-colors ${
                    !n.read_at ? 'bg-accent-dim/40' : ''
                  }`}
                >
                  <p className="text-sm font-semibold text-text-1">{n.title}</p>
                  {n.body && <p className="text-xs text-text-2 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-text-3 mt-1">{fmt.timeAgo(n.created_at)}</p>
                </button>
              ))
            ) : (
              <p className="text-center text-text-3 text-sm py-8">No notifications yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
