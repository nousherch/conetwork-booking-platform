import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { bookingsApi, roomsApi } from '../../lib/api';
import BookingModal from '../../components/modals/BookingModal';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  CONFIRMED: { label: 'Confirmed', cls: 'badge-green' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-red' },
  COMPLETED: { label: 'Completed', cls: 'badge-gray' },
};

export default function AdminBookings() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [pagination, setPagination] = useState({});
  const [fetching, setFetching] = useState(true);
  const [filters, setFilters] = useState({ roomId: '', status: '', search: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/login');
  }, [user, loading, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      roomsApi.getAll().then(({ data }) => setRooms(data.rooms)).catch(console.error);
    }
  }, [isAdmin]);

  const fetchBookings = async () => {
    setFetching(true);
    try {
      const { data } = await bookingsApi.getAll({ ...filters, page, limit: 20 });
      setBookings(data.bookings);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchBookings();
  }, [isAdmin, filters, page]);

  useEffect(() => {
    if (router.query.new === '1') setShowModal(true);
  }, [router.query]);

  const handleCancelBooking = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingsApi.cancel(id);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const handleExport = async (format_type) => {
    try {
      const { data } = await import('../../lib/api').then(m => m.analyticsApi.export({
        format: format_type,
        ...filters,
      }));
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings.${format_type}`;
      a.click();
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <Head><title>Bookings — CoNetwork Admin</title></Head>
      <AppLayout>
        <div className="p-6 md:p-8">
          <div className="page-header">
            <div>
              <h1 className="page-title">Bookings</h1>
              <p className="page-subtitle">{pagination.total || 0} total bookings</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button className="btn-secondary" onClick={() => {}}>
                  Export ▾
                </button>
                {/* Simple export dropdown */}
              </div>
              <button
                onClick={() => { setSelectedBooking(null); setShowModal(true); }}
                className="btn-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                New Booking
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="card p-4 mb-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="relative col-span-2 md:col-span-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="form-input pl-9"
                />
              </div>
              <select value={filters.roomId} onChange={(e) => setFilters({...filters, roomId: e.target.value})} className="form-input">
                <option value="">All Rooms</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="form-input">
                <option value="">All Status</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="form-input text-slate-500" />
              <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="form-input text-slate-500" />
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-400">Export:</span>
            <button
              onClick={async () => {
                const { analyticsApi } = await import('../../lib/api');
                const res = await analyticsApi.export({ format: 'csv', ...filters });
                const url = URL.createObjectURL(new Blob([res.data]));
                Object.assign(document.createElement('a'), { href: url, download: 'bookings.csv' }).click();
              }}
              className="btn-ghost text-xs"
            >
              📄 CSV
            </button>
            <button
              onClick={async () => {
                const { analyticsApi } = await import('../../lib/api');
                const res = await analyticsApi.export({ format: 'xlsx', ...filters });
                const url = URL.createObjectURL(new Blob([res.data]));
                Object.assign(document.createElement('a'), { href: url, download: 'bookings.xlsx' }).click();
              }}
              className="btn-ghost text-xs"
            >
              📊 Excel
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Meeting</th>
                    <th>Client</th>
                    <th>Room</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fetching ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j}><div className="skeleton h-4 w-24 rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        No bookings found for the selected filters
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => {
                      const duration = Math.round((new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60));
                      const hrs = Math.floor(duration / 60);
                      const mins = duration % 60;
                      const durationLabel = hrs > 0
                        ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`
                        : `${mins}m`;
                      const s = STATUS_LABELS[b.status] || { label: b.status, cls: 'badge-gray' };

                      return (
                        <tr key={b.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.room.color }} />
                              <span className="font-medium text-slate-800">{b.title}</span>
                            </div>
                          </td>
                          <td className="text-slate-600">
                            <div>
                              <p className="font-medium text-sm">{b.client.user.name}</p>
                              <p className="text-xs text-slate-400">{b.client.user.email}</p>
                            </div>
                          </td>
                          <td className="text-slate-600 text-sm">{b.room.name}</td>
                          <td>
                            <p className="text-sm font-medium text-slate-700">
                              {format(new Date(b.startTime), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-slate-400">
                              {format(new Date(b.startTime), 'h:mm a')} – {format(new Date(b.endTime), 'h:mm a')}
                            </p>
                          </td>
                          <td className="text-slate-500 text-sm">{durationLabel}</td>
                          <td><span className={s.cls}>{s.label}</span></td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedBooking({
                                    id: b.id,
                                    title: b.title,
                                    startTime: b.startTime,
                                    endTime: b.endTime,
                                    roomId: b.roomId,
                                    roomName: b.room.name,
                                    clientName: b.client.user.name,
                                    notes: b.notes,
                                    status: b.status,
                                  });
                                  setShowModal(true);
                                }}
                                className="btn-ghost text-xs"
                              >
                                View
                              </button>
                              {b.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleCancelBooking(b.id)}
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

            {pagination.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total} bookings
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <BookingModal
            onClose={() => { setShowModal(false); setSelectedBooking(null); }}
            onSuccess={() => { setShowModal(false); setSelectedBooking(null); fetchBookings(); }}
            existingBooking={selectedBooking}
            rooms={rooms}
            isAdmin={true}
          />
        )}
      </AppLayout>
    </>
  );
}
