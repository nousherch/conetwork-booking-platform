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
  { label: '1 hr', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '3 hr', value: 180 },
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
  const [showModal, setShowModal] = useState(false);
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
      : addMinutes(snapped, 30);
    setFormData({
      title: '',
      notes: '',
      startTime: format(snapped, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(draggedEnd, "yyyy-MM-dd'T'HH:mm"),
    });
    setShowModal(true);
    if (info.view && info.view.calendar) {
      info.view.calendar.unselect();
    }
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
      setShowModal(false);
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

      <AppLayout>
        <div className="p-6 md:p-8">

          {/* Success overlay */}
          {showSuccess && typeof window !== 'undefined' && createPortal(
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
              <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 60px rgba(16,185,129,0.25)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="font-bold text-slate-900 text-lg">Booking Confirmed!</p>
                <p className="text-slate-400 text-sm">{selectedRoom?.name}</p>
              </div>
            </div>,
            document.body
          )}

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Book a Meeting Room</h1>
            <p className="text-slate-500 mt-1">Select a room, tap or drag a time slot to book</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Room list */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Rooms</h2>
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoom(r)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedRoom?.id === r.id
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">Up to {r.capacity} people</p>
                    </div>
                    {selectedRoom?.id === r.id && (
                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
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
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="lg:col-span-2">
              {selectedRoom ? (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedRoom.color }} />
                      <span className="font-semibold text-slate-800 text-sm">{selectedRoom.name}</span>
                    </div>
                    <p className="text-xs text-slate-400">Tap or drag a slot to book</p>
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
                <div className="bg-white rounded-2xl h-64 flex items-center justify-center border border-slate-100">
                  <p className="text-slate-400 text-sm">Select a room to view availability</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>

      {/* Booking Modal */}
      {showModal && typeof window !== 'undefined' && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md overflow-y-auto" style={{ maxHeight: '90vh', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Confirm Booking</h2>
                <p className="text-sm text-slate-400 mt-0.5">{selectedRoom?.name}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">Meeting Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Weekly Team Standup"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-slate-800 border border-slate-200 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Start</label>
                  <input type="datetime-local" value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">End</label>
                  <input type="datetime-local" value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1.5">Quick duration</p>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATIONS.map((d) => (
                    <button key={d.value} type="button"
                      onClick={() => {
                        if (!formData.startTime) return;
                        const end = addMinutes(new Date(formData.startTime), d.value);
                        setFormData({ ...formData, endTime: format(end, "yyyy-MM-dd'T'HH:mm") });
                      }}
                      className="px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                    >{d.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2} placeholder="Any notes..." className="w-full px-4 py-3 rounded-xl border border-slate-200 resize-none focus:outline-none focus:border-emerald-400" />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold">
                  Back
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {submitting ? 'Booking...' : 'Confirm Booking'}
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
