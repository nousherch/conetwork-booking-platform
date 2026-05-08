import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format, isToday } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { analyticsApi, bookingsApi } from '../../lib/api';

// Animated counting number hook
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const startTime = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined || target === 0) {
      setCount(0);
      return;
    }
    startTime.current = null;
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

function StatCard({ label, value, sub, accent, iconColor, icon, delay }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0, 1000);

  return (
    <div
      className="stat-card-anim bg-white rounded-xl border border-slate-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      style={{
        animation: `statFadeUp 0.5s ease-out forwards`,
        animationDelay: `${delay}ms`,
        opacity: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="font-display text-3xl font-bold text-slate-900 mt-1 tracking-tight">
            {value === '—' || value === null || value === undefined ? '—' : animated}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function formatTime(dt) {
  return format(new Date(dt), 'h:mm a');
}

function formatDate(dt) {
  const d = new Date(dt);
  if (isToday(d)) return 'Today';
  return format(d, 'MMM d');
}

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/login');
  }, [user, loading, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      try {
        const [statsRes, todayRes] = await Promise.all([
          analyticsApi.getDashboard(),
          bookingsApi.getToday(),
        ]);
        setStats(statsRes.data);
        setTodayBookings(todayRes.data.bookings);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  if (loading || !user) return null;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <>
      <Head><title>Dashboard — CoNetwork Admin</title></Head>

      <style>{`
        @keyframes statFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }
        .card-anim {
          animation: fadeSlideUp 0.5s ease-out forwards;
          opacity: 0;
        }
        .live-dot {
          animation: livePulse 1.5s ease-in-out infinite;
        }
        .quick-action {
          transition: all 0.15s ease;
        }
        .quick-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .quick-action:active {
          transform: scale(0.97);
        }
        .booking-row {
          transition: background 0.15s ease;
        }
        .booking-row:hover {
          background: #f8fafc;
        }
      `}</style>

      <AppLayout>
        <div className="p-6 md:p-8 max-w-screen-xl">

          {/* Header */}
          <div className="mb-8 card-anim" style={{ animationDelay: '0ms' }}>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Good {greeting} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {format(now, 'EEEE, MMMM d yyyy')} · Here&apos;s what&apos;s happening at CoNetwork today.
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Today's Bookings"
              value={fetching ? '—' : stats?.stats.todayTotal ?? 0}
              sub="active right now"
              accent="bg-emerald-50"
              delay={100}
              icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
            />
            <StatCard
              label="This Month"
              value={fetching ? '—' : stats?.stats.monthTotal ?? 0}
              sub="total bookings"
              accent="bg-blue-50"
              delay={180}
              icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
            />
            <StatCard
              label="Active Members"
              value={fetching ? '—' : stats?.stats.activeClients ?? 0}
              sub="registered clients"
              accent="bg-violet-50"
              delay={260}
              icon={<svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
            />
            <StatCard
              label="Meeting Rooms"
              value={fetching ? '—' : stats?.stats.activeRooms ?? 0}
              sub="available rooms"
              accent="bg-amber-50"
              delay={340}
              icon={<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Today's schedule */}
            <div className="lg:col-span-2 card card-anim" style={{ animationDelay: '400ms' }}>
              <div className="card-header">
                <div>
                  <h2 className="card-title">Today&apos;s Schedule</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{format(now, 'EEEE, MMMM d')}</p>
                </div>
                <Link href="/reception" target="_blank" className="btn-ghost text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  Reception Board
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {fetching ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-5 py-4 flex gap-3 items-center">
                      <div className="skeleton w-16 h-4 rounded" />
                      <div className="flex-1">
                        <div className="skeleton h-4 w-48 rounded mb-1.5" />
                        <div className="skeleton h-3 w-32 rounded" />
                      </div>
                    </div>
                  ))
                ) : todayBookings.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <p className="text-slate-400 text-sm">No bookings today</p>
                  </div>
                ) : (
                  todayBookings.map((b) => {
                    const isNow = new Date(b.startTime) <= now && new Date(b.endTime) >= now;
                    return (
                      <div key={b.id} className={`booking-row px-5 py-4 flex items-center gap-4 ${isNow ? 'bg-emerald-50/60' : ''}`}>
                        <div className="text-right flex-shrink-0 w-16">
                          <p className="text-xs font-semibold text-slate-800">{formatTime(b.startTime)}</p>
                          <p className="text-xs text-slate-400">{formatTime(b.endTime)}</p>
                        </div>
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: b.room.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{b.title}</p>
                          <p className="text-xs text-slate-400 truncate">{b.client.user.name} · {b.room.name}</p>
                        </div>
                        {isNow && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white flex-shrink-0">
                            <span className="live-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                            Live
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Upcoming */}
            <div className="card card-anim" style={{ animationDelay: '480ms' }}>
              <div className="card-header">
                <h2 className="card-title">Upcoming</h2>
                <Link href="/admin/bookings" className="text-xs text-emerald-500 hover:text-emerald-600 font-medium">
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {fetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-5 py-3.5">
                      <div className="skeleton h-4 w-36 rounded mb-1" />
                      <div className="skeleton h-3 w-24 rounded" />
                    </div>
                  ))
                ) : (stats?.upcomingBookings || []).filter(b => !isToday(new Date(b.startTime))).slice(0, 7).length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-slate-400 text-sm">No upcoming bookings</p>
                  </div>
                ) : (
                  (stats?.upcomingBookings || [])
                    .filter(b => !isToday(new Date(b.startTime)))
                    .slice(0, 7)
                    .map((b) => (
                      <div key={b.id} className="booking-row px-5 py-3.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.room.color }} />
                          <p className="text-sm font-medium text-slate-800 truncate">{b.title}</p>
                        </div>
                        <p className="text-xs text-slate-400 ml-4">
                          {formatDate(b.startTime)} · {formatTime(b.startTime)} · {b.room.name}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 card-anim" style={{ animationDelay: '560ms' }}>
            {[
              { label: 'New Booking', href: '/admin/bookings?new=1', icon: '＋', color: 'bg-emerald-500 text-white' },
              { label: 'Add Client', href: '/admin/clients?new=1', icon: '👤', color: 'bg-slate-800 text-white' },
              { label: 'Add Room', href: '/admin/rooms?new=1', icon: '🏢', color: 'bg-blue-500 text-white' },
              { label: 'Analytics', href: '/admin/analytics', icon: '📊', color: 'bg-violet-500 text-white' },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`quick-action ${a.color} rounded-xl p-4 flex items-center gap-3 font-medium text-sm shadow-sm`}
              >
                <span className="text-lg">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </AppLayout>
    </>
  );
}
