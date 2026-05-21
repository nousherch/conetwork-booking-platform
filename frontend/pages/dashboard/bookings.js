import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format, isFuture, isPast } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { bookingsApi } from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  CONFIRMED: { label: 'Confirmed', cls: 'badge-green' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-red' },
  COMPLETED: { label: 'Completed', cls: 'badge-gray' },
};

export default function MyBookings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({});
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'ADMIN') router.replace('/admin');
  }, [user, loading]);

  const fetchBookings = async () => {
    setFetching(true);
    try {
      const now = new Date().toISOString();
      const params = { page, limit: 15 };
      if (tab === 'upcoming') {
        params.startDate = now;
        params.status = 'CONFIRMED';
      } else {
        params.endDate = now;
      }
      const { data } = await bookingsApi.getAll(params);
      setBookings(data.bookings);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'CLIENT') fetchBookings();
  }, [user, tab, page]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingsApi.cancel(id);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const handleEndEarly = async (id) => {
    if (!confirm('End this booking now? This will free up the room immediately.')) return;
    try {
      await bookingsApi.update(id, { endTime: new Date().toISOString() });
      toast.success('Booking ended — room is now free');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to end booking');
    }
  };

  if (loading || !user) return null;

  const isActive = (b) => {
    const now = new Date();
    return b.status === 'CONFIRMED' &&
      new Date(b.startTime) <= now &&
      new Date(b.endTime) > now;
  };

  const canCancel = (b) => b.status === 'CONFIRMED';

  return (
    <>
      <Head><title>My Bookings — CoNetwork</title></Head>
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl">
          <div className="page-header mb-6">
            <div>
              <h1 className="page-title">My Bookings</h1>
              <p className="page-subtitle">{pagination.total || 0} total</p>
            </div>
            <Link href="/dashboard/book" className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              New Booking
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5 w-fit">
            {['upcoming', 'past'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                  tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            {/* Mobile card view */}
            <div className="divide-y divide-slate-50 md:hidden">
              {fetching ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="skeleton h-4 w-40 rounded mb-2" />
                    <div className="skeleton h-3 w-28 rounded" />
                  </div>
                ))
              ) : bookings.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-400 text-sm mb-3">
                    {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
                  </p>
                  {tab === 'upcoming' && (
                    <Link href="/dashboard/book" className="btn-primary text-xs">Book a room</Link>
                  )}
                </div>
              ) : (
                bookings.map((b) => {
                  const s = STATUS_LABELS[b.status] || { label: b.status, cls: 'badge-gray' };
                  const active = isActive(b);
                  return (
                    <div key={b.id} className={`p-4 ${active ? 'bg-emerald-50/50' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: b.room.color }} />
                          <p className="font-semibold text-slate-800 text-sm">{b.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {active && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                              <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
                              Live
                            </span>
                          )}
                          <span className={s.cls}>{s.label}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 ml-4">
                        {format(new Date(b.startTime), 'EEE, MMM d · h:mm a')} – {format(new Date(b.endTime), 'h:mm a')}
                      </p>
                      <p className="text-xs text-slate-400 ml-4 mb-3">{b.room.name}</p>
                      {canCancel(b) && (
                        <div className="ml-4 flex gap-3">
                          {active && (
                            <button
                              onClick={() => handleEndEarly(b.id)}
                              className="text-xs text-amber-600 font-semibold hover:text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
                            >
                              🏁 End Early
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="text-xs text-red-500 font-medium hover:text-red-700"
                          >
                            Cancel booking
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Meeting</th>
                    <th>Room</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fetching ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j}><div className="skeleton h-4 w-24 rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <p className="text-slate-400 text-sm mb-2">
                          {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
                        </p>
                        {tab === 'upcoming' && (
                          <Link href="/dashboard/book" className="text-emerald-500 hover:text-emerald-600 text-sm font-medium">
                            Book a room →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => {
                      const duration = Math.round((new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60));
                      const hrs = Math.floor(duration / 60);
                      const mins = duration % 60;
                      const durationLabel = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;
                      const s = STATUS_LABELS[b.status] || { label: b.status, cls: 'badge-gray' };
                      const active = isActive(b);

                      return (
                        <tr key={b.id} className={active ? 'bg-emerald-50/40' : ''}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.room.color }} />
                              <span className="font-medium text-slate-800">{b.title}</span>
                              {active && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                                  <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
                                  Live
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-slate-500 text-sm">{b.room.name}</td>
                          <td>
                            <p className="text-sm font-medium text-slate-700">
                              {format(new Date(b.startTime), 'EEE, MMM d')}
                            </p>
                            <p className="text-xs text-slate-400">
                              {format(new Date(b.startTime), 'h:mm a')} – {format(new Date(b.endTime), 'h:mm a')}
                            </p>
                          </td>
                          <td className="text-slate-500 text-sm">{durationLabel}</td>
                          <td><span className={s.cls}>{s.label}</span></td>
                          <td>
                            <div className="flex items-center gap-2">
                              {active && canCancel(b) && (
                                <button
                                  onClick={() => handleEndEarly(b.id)}
                                  className="btn-ghost text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50 font-semibold"
                                >
                                  🏁 End Early
                                </button>
                              )}
                              {canCancel(b) && (
                                <button
                                  onClick={() => handleCancel(b.id)}
                                  className="btn-ghost text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {((page - 1) * 15) + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </>
  );
}