import { useState, useEffect } from 'react';
import { format, addMinutes, isBefore } from 'date-fns';
import { bookingsApi, clientsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '1h 30m', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '2h 30m', value: 150 },
  { label: '3 hr', value: 180 },
  { label: '4 hr', value: 240 },
];

function snapToHalfHour(date) {
  const d = new Date(date);
  const mins = d.getMinutes();
  if (mins < 30) d.setMinutes(0, 0, 0);
  else d.setMinutes(30, 0, 0);
  return d;
}

export default function BookingModal({ onClose, onSuccess, initialSlot, existingBooking, rooms, isAdmin }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    roomId: rooms[0]?.id || '',
    startTime: '',
    endTime: '',
    notes: '',
    clientId: '',
  });
  const [clients, setClients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [mode, setMode] = useState('create');

  useEffect(() => {
    if (existingBooking) {
      setMode('view');
      setForm({
        title: existingBooking.title || '',
        roomId: existingBooking.roomId || rooms[0]?.id || '',
        startTime: existingBooking.startTime ? format(new Date(existingBooking.startTime), "yyyy-MM-dd'T'HH:mm") : '',
        endTime: existingBooking.endTime ? format(new Date(existingBooking.endTime), "yyyy-MM-dd'T'HH:mm") : '',
        notes: existingBooking.notes || '',
        clientId: '',
      });
    } else if (initialSlot) {
      const snapped = snapToHalfHour(initialSlot.start);
      const end = initialSlot.end
        ? snapToHalfHour(initialSlot.end)
        : addMinutes(snapped, 60);
      setForm((prev) => ({
        ...prev,
        startTime: format(snapped, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(end, "yyyy-MM-dd'T'HH:mm"),
      }));
    }
  }, [existingBooking, initialSlot]);

  useEffect(() => {
    if (isAdmin) {
      clientsApi.getAll({ status: 'ACTIVE', limit: 100 })
        .then(({ data }) => setClients(data.clients))
        .catch(console.error);
    }
  }, [isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bookingsApi.create({
        ...form,
        ...(isAdmin && form.clientId ? { clientId: form.clientId } : {}),
      });
      toast.success('Booking confirmed!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!existingBooking?.id) return;
    setCancelling(true);
    try {
      await bookingsApi.cancel(existingBooking.id);
      toast.success('Booking cancelled');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const isView = mode === 'view';
  const isPast = existingBooking?.startTime && isBefore(new Date(existingBooking.startTime), new Date());

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* FIX: full-width on mobile, max-w-lg on desktop; max-height + scroll so modal never clips off screen */}
      <div
        className="modal-panel w-full"
        style={{ maxWidth: '32rem', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-display font-bold text-slate-900 text-base sm:text-lg">
              {isView ? 'Booking Details' : 'New Booking'}
            </h2>
            {isView && existingBooking?.roomName && (
              <p className="text-sm text-slate-400 mt-0.5">{existingBooking.roomName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Client select (admin only, create mode) */}
          {isAdmin && !isView && (
            <div>
              <label className="form-label">Client *</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required
                className="form-input"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user.name} {c.companyName ? `— ${c.companyName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View mode: client name */}
          {isView && existingBooking?.clientName && (
            <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-slate-600">{existingBooking.clientName[0]}</span>
              </div>
              <span className="text-sm font-medium text-slate-700">{existingBooking.clientName}</span>
            </div>
          )}

          <div>
            <label className="form-label">Meeting Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Weekly Team Standup"
              required
              readOnly={isView}
              className={`form-input ${isView ? 'bg-slate-50 cursor-default' : ''}`}
            />
          </div>

          <div>
            <label className="form-label">Meeting Room *</label>
            <select
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              required
              disabled={isView}
              className={`form-input ${isView ? 'bg-slate-50 cursor-default' : ''}`}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name} (cap. {r.capacity})</option>
              ))}
            </select>
          </div>

          {/* FIX: stack on mobile (grid-cols-1), side-by-side on sm+ (sm:grid-cols-2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Start Time *</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
                readOnly={isView}
                className={`form-input text-sm ${isView ? 'bg-slate-50 cursor-default' : ''}`}
              />
            </div>
            <div>
              <label className="form-label">End Time *</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
                readOnly={isView}
                className={`form-input text-sm ${isView ? 'bg-slate-50 cursor-default' : ''}`}
              />
            </div>
          </div>

          {/* Quick duration picker */}
          {!isView && (
            <div>
              <label className="form-label text-slate-400 text-xs">Quick duration</label>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      if (!form.startTime) return;
                      const end = addMinutes(new Date(form.startTime), d.value);
                      setForm({ ...form, endTime: format(end, "yyyy-MM-dd'T'HH:mm") });
                    }}
                    className="px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="form-label">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Any additional notes..."
              readOnly={isView}
              className={`form-input resize-none ${isView ? 'bg-slate-50 cursor-default' : ''}`}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              {isView ? 'Close' : 'Cancel'}
            </button>
            <div className="flex items-center gap-2">
              {isView && !isPast && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="btn-danger"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              )}
              {!isView && (
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Booking...
                    </span>
                  ) : 'Confirm Booking'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
