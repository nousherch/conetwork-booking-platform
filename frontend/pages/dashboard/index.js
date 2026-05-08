import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format, isToday, isFuture } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { analyticsApi } from '../../lib/api';

function useCountUp(target, duration = 1000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  useEffect(() => {
    if (!target) { setCount(0); return; }
    startRef.current = null;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);
  return count;
}

function formatTime(dt) { return format(new Date(dt), 'h:mm a'); }
function formatDate(dt) {
  const d = new Date(dt);
  if (isToday(d)) return 'Today';
  return format(d, 'EEE, MMM d');
}

export default function ClientDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(true);

  const hoursCount = useCountUp(!fetching ? (data?.monthlyHours ?? 0) : 0);
  const bookingsCount = useCountUp(!fetching ? (data?.monthlyBookings ?? 0) : 0);
  const upcomingCount = useCountUp(!fetching ? (data?.upcomingBookings?.length ?? 0) : 0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'ADMIN') router.replace('/admin');
  }, [user, loading]);

  useEffect(() => {
    if (!user || user.role !== 'CLIENT') return;
    analyticsApi.getClientDashboard()
      .then(({ data: d }) => setData(d))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  const now = new Date();

  return (
    <>
      <Head><title>Dashboard — CoNetwork</title></Head>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes livePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
        }
        @keyframes bookBtnGlow {
          0%, 100% { box-shadow: 0 4px 20px rgba(16,185,129,0.3); }
          50% { box-shadow: 0 4px 30px rgba(16,185,129,0.55); }
        }
        .anim { animation: fadeSlideUp 0.5s ease-out forwards; opacity: 0; }
        .stat-card-hover {
          transition: all 0.2s ease;
        }
        .stat-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .book-btn {
          animation: bookBtnGlow 2.5s ease-in-out infinite;
          transition: all 0.2s ease;
        }
        .book-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 35px rgba(16,185,129,0.5) !important;
        }
        .book-btn:active { transform: scale(0.98); }
        .live-dot { animation: livePulse 1.5s ease-in-out infinite; }
        .booking-row { transition: background 0.15s ease; }
        .booking-row:hover { background: #f8fafc; }
      `}</style>

      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl">

          {/* Header */}
          <div className="mb-8 anim" style={{ animationDelay: '0ms' }}>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{format(now, 'EEEE, MMMM d yyyy')}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'This Month', value: fetching ? '—' : hoursCount, suffix: 'hrs', sub: 'Meeting Room Time Used', delay: 80 },
              { label: 'Bookings', value: fetching ? '—' : bookingsCount, suffix: '', sub: 'This Month', delay: 160 },
              { label: 'Upcoming', value: fetching ? '—' : upcomingCount, suffix: '', sub: 'Scheduled Meetings', delay: 240 },
            ].map((s, i) => (
              <div
                key={i}
                className={`stat-card-hover bg-white rounded-xl border border-slate-100 p-5 anim ${i === 0 ? 'col-span-2 md:col-span-1' : ''}`}
                style={{ animationDelay: `${s.delay}ms`, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="font-display text-3xl font-bold text-slate-900 tracking-tight">
                  {s.value}
                  {s.suffix && <span className="text-lg font-normal text-slate-400 ml-1">{s.suffix}</span>}
                </p>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Book a room CTA */}
          <div className="mb-8 anim" style={{ animationDelay: '300ms' }}>
            <Link href="/dashboard/book">
              <div
                className="book-btn rounded-xl p-5 text-white cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-lg">Book a Meeting Room</p>
                    <p className="text-emerald-100 text-sm mt-0.5">Check availability and reserve in under 10 seconds</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upcoming bookings */}
            <div className="card anim" style={{ animationDelay: '380ms' }}>
              <div className="card-header">
                <h2 className="card-title">Upcoming Meetings</h2>
                <Link href="/dashboard/bookings" className="text-xs text-emerald-500 hover:text-emerald-600 font-medium">
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {fetching ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="skeleton h-4 w-40 rounded mb-1.5" />
                      <div className="skeleton h-3 w-28 rounded" />
                    </div>
                  ))
                ) : !data?.upcomingBookings?.length ? (
                  <div className="px-5 py-10 text-center">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <p className="text-sm text-slate-400">No upcoming meetings</p>
                    <Link href="/dashboard/book" className="text-xs text-emerald-500 font-medium mt-1 block">Book one now →</Link>
                  </div>
                ) : (
                  data.upcomingBookings.map((b) => {
                    const isNow = new Date(b.startTime) <= now && new Date(b.endTime) >= now;
                    return (
                      <div key={b.id} className={`booking-row px-5 py-4 flex items-center gap-3 ${isNow ? 'bg-emerald-50/60' : ''}`}>
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: b.room.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{b.title}</p>
                          <p className="text-xs text-slate-400">
                            {formatDate(b.startTime)} · {formatTime(b.startTime)} – {formatTime(b.endTime)}
                          </p>
                          <p className="text-xs text-slate-400">{b.room.name}</p>
                        </div>
                        {isNow && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white flex-shrink-0">
                            <span className="live-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                            Now
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent history */}
            <div className="card anim" style={{ animationDelay: '460ms' }}>
              <div className="card-header">
                <h2 className="card-title">Recent History</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {fetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-5 py-3.5">
                      <div className="skeleton h-4 w-36 rounded mb-1" />
                      <div className="skeleton h-3 w-24 rounded" />
                    </div>
                  ))
                ) : (
                  (data?.bookingHistory || [])
                    .filter(b => !isFuture(new Date(b.endTime)))
                    .slice(0, 7)
                    .map((b) => (
                      <div key={b.id} className="booking-row px-5 py-3.5 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.room.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{b.title}</p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(b.startTime), 'MMM d')} · {b.room.name}
                          </p>
                        </div>
                        <span className={b.status === 'CANCELLED' ? 'badge-red' : 'badge-gray'}>
                          {b.status === 'CANCELLED' ? 'Cancelled' : 'Done'}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}
