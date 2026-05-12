import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ADMIN = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: DashIcon },
      { label: 'Calendar', href: '/admin/calendar', icon: CalIcon },
      { label: 'Today\'s Board', href: '/reception', icon: BoardIcon, target: '_blank' },
    ],
  },
  {
    group: 'Management',
    items: [
      { label: 'Bookings', href: '/admin/bookings', icon: BookIcon },
      { label: 'Meeting Rooms', href: '/admin/rooms', icon: RoomIcon },
      { label: 'Clients', href: '/admin/clients', icon: ClientIcon },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Analytics', href: '/admin/analytics', icon: ChartIcon },
    ],
  },
];

const NAV_CLIENT = [
  {
    group: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: DashIcon },
      { label: 'Book a Room', href: '/dashboard/book', icon: BookIcon },
      { label: 'My Bookings', href: '/dashboard/bookings', icon: CalIcon },
    ],
  },
];

function DashIcon({ cls }) {
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalIcon({ cls }) {
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function BookIcon({ cls }) {
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function RoomIcon({ cls }) {
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ClientIcon({ cls }) {
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ChartIcon({ cls }) {
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function BoardIcon({ cls }) {
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

export default function AppLayout({ children, title }) {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = isAdmin ? NAV_ADMIN : NAV_CLIENT;

  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname]);

  const isActive = (href) => {
    if (href === '/admin' || href === '/dashboard') return router.pathname === href;
    if (href === '/dashboard/book') return router.pathname === '/dashboard/book';
    if (href === '/dashboard/bookings') return router.pathname === '/dashboard/bookings';
    return router.pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
  <Link href="https://meeting.conetwork.pk/dashboard" target="_blank" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
    <img
      src="/logo.png"
      alt="CoNetwork"
      className="h-8 w-auto object-contain brightness-0 invert flex-shrink-0"
    />
    <div className="text-slate-300 text-sm font-semibold mt-0.5">CoNetwork</div>
  </Link>
</div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {nav.map((group) => (
          <div key={group.group}>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1.5">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.target}
                    className={`sidebar-link ${active ? 'active' : ''}`}
                  >
                    <item.icon cls="w-4 h-4 flex-shrink-0" />
                    {item.label}
                    {item.target && (
                      <svg className="w-3 h-3 ml-auto opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-400 font-bold text-xs">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.role === 'ADMIN' ? 'Administrator' : 'Member'}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/10 rounded-md transition-all"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="https://meeting.conetwork.pk/dashboard" target="_blank">
  <img src="/logo.png" alt="CoNetwork" className="h-7 w-auto object-contain" />
</Link>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
