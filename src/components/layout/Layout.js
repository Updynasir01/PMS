import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../pages/_app';
import { Avatar, ToastContainer, ThemeToggle, IconBox } from '../ui';

const navConfig = {
  superadmin: [
    { label: 'Dashboard', href: '/', icon: 'grid' },
    { label: 'Owners', href: '/owners', icon: 'users' },
    { label: 'Tenants', href: '/tenants', icon: 'user' },
    { label: 'Payments', href: '/payments', icon: 'wallet' },
    { label: 'Maintenance', href: '/maintenance', icon: 'wrench' },
  ],
  owner: [
    { label: 'Dashboard', href: '/', icon: 'grid' },
    { label: 'Properties', href: '/properties', icon: 'building' },
    { label: 'Tenants', href: '/tenants', icon: 'users' },
    { label: 'Payments', href: '/payments', icon: 'wallet' },
    { label: 'Maintenance', href: '/maintenance', icon: 'wrench' },
  ],
  tenant: [
    { label: 'My Home', href: '/', icon: 'home' },
    { label: 'Payments', href: '/payments', icon: 'wallet' },
    { label: 'Maintenance', href: '/maintenance', icon: 'wrench' },
  ],
};

const roleLabel = { superadmin: 'Super Admin', owner: 'Property Owner', tenant: 'Tenant' };

function NavIcon({ name }) {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    wallet: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M16 14h.01"/></>,
    wrench: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>,
    building: <><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-3"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;
  const nav = navConfig[user.role] || [];

  const Sidebar = () => (
    <aside className="w-64 surface-panel border-r-[0.5px] border-border flex flex-col h-full">
      <div className="px-edge py-6 border-b-[0.5px] border-border">
        <div className="font-display text-[28px] leading-none text-text-1">
          Prop<span className="text-accent">Sync</span>
        </div>
        <p className="label-ui mt-2">Mogadishu · PropMgmt</p>
      </div>

      <div className="px-4 py-4 border-b-[0.5px] border-border flex items-center gap-3">
        <Avatar name={user.full_name} />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold truncate text-text-1">{user.full_name}</div>
          <p className="label-ui mt-0.5">{roleLabel[user.role]}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(item => {
          const active = router.pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => { router.push(item.href); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[14px] font-medium transition-all duration-200
                ${active
                  ? 'bg-accent-dim text-accent border-[0.5px] border-accent/20'
                  : 'text-text-2 hover:bg-accent-dim hover:text-accent border-[0.5px] border-transparent'
                }`}
            >
              <IconBox tint={active ? 'purple' : 'neutral'} className="!w-9 !h-9">
                <NavIcon name={item.icon} />
              </IconBox>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t-[0.5px] border-border space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="label-ui">Theme</span>
          <ThemeToggle />
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[14px] font-medium text-text-3 hover:text-status-red hover:bg-status-red-dim transition-all duration-200 border-[0.5px] border-transparent"
        >
          <IconBox tint="neutral">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </IconBox>
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden surface-page">
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-shrink-0 w-64">
            <Sidebar />
          </div>
          <div className="flex-1 backdrop-blur-sm" style={{ background: 'var(--overlay)' }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b-[0.5px] border-border bg-page/90 backdrop-blur-md flex items-center justify-between px-edge flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden icon-box bg-surface text-text-2 hover:text-text-1"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h1 className="font-display text-[20px] text-text-1">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block label-ui normal-case">@{user.username}</span>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-edge lg:p-8">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
