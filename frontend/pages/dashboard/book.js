import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { format, addMinutes } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { roomsApi, bookingsApi } from '../../lib/api';
import toast from 'react-hot-toast';

const FullCalendarWrapper = dynamic(
  () => import('../../components/calendar/FullCalendarWrapper'),
  { ssr: false }
);

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr',  value: 60 },
  { label: '1:30',  value: 90 },
  { label: '2 hr',  value: 120 },
  { label: '3 hr',  value: 180 },
];

function snapToHalf(date) {
  const d = new Date(date);
  const mins = d.getMinutes();
  if (mins < 30) d.setMinutes(0, 0, 0);
  else d.setMinutes(30, 0, 0);
  return d;
}

export default function BookRoom() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({ title: '', startTime: '', endTime: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [calRange, setCalRange] = useState(null);
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'ADMIN') router.replace('/admin');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    roomsApi.getAll({ status: 'ACTIVE' })
      .then(({ data }) => {
        setRooms(data.rooms);
        if (data.rooms.length > 0) setSelectedRoom(data.rooms[0]);
      })
      .catch(console.error);
  }, [user]);

  const fetchEvents = async (info) => {
    if (!selectedRoom) return;
    try {
      const { data } = await bookingsApi.getCalendar({
        start: info.startStr,
        end: info.endStr,
        roomId: selectedRoom.id,
      });
      setEvents(data.events);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (calRange && selectedRoom) fetchEvents(calRange);
  }, [selectedRoom, calRange]);

  const handleDateSelect = (info) => {
    const snapped = snapToHalf(info.start);
    const draggedEnd = info.end && info.end > info.start
      ? snapToHalf(info.end)
      : addMinutes(snapped, 60);
    setFormData({
      title: '',
      notes: '',
      startTime: format(snapped, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(draggedEnd, "yyyy-MM-dd'T'HH:mm"),
    });
    setStep(3);
    info.view.calendar.unselect();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoom) return toast.error('Please select a room');
    setSubmitting(true);
    try {
      await bookingsApi.create({
        roomId: selectedRoom.id,
        title: formData.title,
        startTime: formData.startTime,
        endTime: formData.endTime,
        notes: formData.notes,
      });
      setStep(2);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      if (calRange) fetchEvents(calRange);
      setFormData({ title: '', startTime: '', endTime: '', notes: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <Head><title>Book a Room — CoNetwork</title></Head>

      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes roomCardIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes successPop {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 50; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes successFadeOut {
          0%,70% { opacity: 1; }
          100%   { opacity: 0; transform: scale(0.95); }
        }
        .page-in { animation: pageIn 0.4s ease-out forwards; }
        .room-card-in {
          animation: roomCardIn 0.35s ease-out forwards;
          opacity: 0;
        }
        .room-btn { transition: all 0.18s ease; }
        .room-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .room-btn:active { transform: scale(0.97); }
        .room-btn.selected { box-shadow: 0 4px 16px rgba(16,185,129,0.2); }
        .success-overlay { animation: successFadeOut 2.5s ease-out forwards; }
        .success-icon { animation: successPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .check-path {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: checkDraw 0.4s ease-out 0.3s forwards;
        }
        .duration-btn { transition: all 0.15s ease; }
        .duration-btn:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(16,185,129,0.2); }
        .duration-btn:active { transform: scale(0.94); }
        .modal-enter {
          animation: modalSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .step-dot { transition: all 0.25s ease; }
        .step-line { transition: background 0.3s ease; }
      `}</style>

      <AppLayout>
        <div className="p-6 md:p-8 page-in">

          {/* Success overlay */}
          {showSuccess && typeof window !== 'undefined' && createPortal(
            <div className="success-overlay pointer-events-none"
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="success-icon bg-white rounded-2xl p-8 flex flex-col items-center gap-3"
                style={{ boxShadow: '0 20px 60px rgba(16,185,129,0.25)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path className="check-path" d="M5 13l4 4L19 7"
                      stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="font-display font-bold text-slate-900 text-lg">Booking Confirmed!</p>
                <p className="text-slate-400 text-sm">{selectedRoom?.name}</p>
              </div>
            </div>,
            document.body
          )}

          <div className="mb-6">
            <h1 className="page-title">Book a Meeting Room</h1>
            <p className="page-subtitle">Select a room, pick a time, and confirm in seconds</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[
              { n: 1, label: 'Select Room' },
              { n: 2, label: 'Pick Time' },
              { n: 3, label: 'Confirm' },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className={`step-dot flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  step >= s.n ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.n ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  ) : (
                    <span>{s.n}</span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < 2 && (
                  <div className={`step-line w-6 h-0.5 rounded ${step > s.n ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Room list */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Available Rooms
              </h2>
              {rooms.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedRoom(r); setStep(2); }}
                  className={`room-btn room-card-in w-full text-left p-4 rounded-xl border-2 ${
                    selectedRoom?.id === r.id
                      ? 'selected border-emerald-400 bg-emerald-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: r.color + '22', border: `1.5px solid ${r.color}55` }}>
                      <svg className="w-4 h-4" style={{ color: r.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{r.name}</p>
                      <p className="text-xs text-slate-400">Up to {r.capacity} people</p>
                    </div>
                    {selectedRoom?.id === r.id && (
                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  {r.equipment && r.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.equipment.slice(0, 3).map((eq) => (
                        <span key={eq} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{eq}</span>
                      ))}
                      {r.equipment.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-xs">+{r.equipment.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="lg:col-span-2">
              {selectedRoom ? (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedRoom.color }} />
                      <span className="font-semibold text-slate-800 text-sm">{selectedRoom.name}</span>
                    </div>
                    <p className="text-xs text-slate-400">Click or drag a slot to book</p>
                  </div>
                  <FullCalendarWrapper
                    events={events}
                    onDateSelect={handleDateSelect}
                    onEventClick={() => {}}
                    onDatesSet={(info) => {
                      setCalRange(prev => {
                        if (prev?.startStr === info.startStr && prev?.endStr === info.endStr) return prev;
                        fetchEvents(info);
                        return info;
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="card flex items-center justify-center h-64">
                  <p className="text-slate-400 text-sm">Select a room to view availability</p>
                </div>
              )}
            </div>
          </div>

          </div>
      </AppLayout>

      {/* Modal rendered outside layout via Portal — always centered */}
      {step === 3 && typeof window !== 'undefined' && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setStep(2); }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="modal-enter bg-white rounded-2xl w-full max-w-md overflow-y-auto"
            style={{ maxHeight: '90vh', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-slate-900 text-lg">Confirm Booking</h2>
                <p className="text-sm text-slate-400 mt-0.5">{selectedRoom?.name}</p>
              </div>
              <button onClick={() => setStep(2)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="form-label">Meeting Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Weekly Team Standup"
                  required
                  autoFocus
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Start</label>
                  <input type="datetime-local" value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required className="form-input text-sm" />
                </div>
                <div>
                  <label className="form-label">End</label>
                  <input type="datetime-local" value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required className="form-input text-sm" />
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1.5">Quick duration</p>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        if (!formData.startTime) return;
                        const end = addMinutes(new Date(formData.startTime), d.value);
                        setFormData({ ...formData, endTime: format(end, "yyyy-MM-dd'T'HH:mm") });
                      }}
                      className="duration-btn px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2} placeholder="Any notes..." className="form-input resize-none" />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 justify-center">
                  Back
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
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
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}