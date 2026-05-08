import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { addMinutes } from 'date-fns';

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

// Format for datetime-local input
function formatForInput(date) {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Convert local datetime to UTC for backend
function formatForBackend(dateString) {
  return new Date(dateString).toISOString();
}

export default function BookRoom() {
  const { user, loading } = useAuth();

  const router = useRouter();

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [events, setEvents] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const [calRange, setCalRange] = useState(null);

  const [step, setStep] = useState(1);

  const [showSuccess, setShowSuccess] = useState(false);

  // Redirects
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }

    if (!loading && user?.role === 'ADMIN') {
      router.replace('/admin');
    }
  }, [user, loading]);

  // Fetch rooms
  useEffect(() => {
    if (!user) return;

    roomsApi
      .getAll({ status: 'ACTIVE' })
      .then(({ data }) => {
        setRooms(data.rooms);

        if (data.rooms.length > 0) {
          setSelectedRoom(data.rooms[0]);
        }
      })
      .catch(console.error);
  }, [user]);

  // Fetch calendar events
  const fetchEvents = async (info) => {
    if (!selectedRoom) return;

    try {
      const { data } = await bookingsApi.getCalendar({
        start: info.startStr,
        end: info.endStr,
        roomId: selectedRoom.id,
      });

      const normalizedEvents = data.events.map((event) => ({
        ...event,

        // Critical Fix
        start: new Date(event.start),
        end: new Date(event.end),
      }));

      setEvents(normalizedEvents);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (calRange && selectedRoom) {
      fetchEvents(calRange);
    }
  }, [selectedRoom, calRange]);

  // Handle drag selection
  const handleDateSelect = (info) => {

    // FullCalendar already provides correct dates
    const start = new Date(info.start);
    const end = new Date(info.end);

    console.log('SELECT START:', start);
    console.log('SELECT END:', end);

    setFormData({
      title: '',
      notes: '',

      // Proper input values
      startTime: formatForInput(start),
      endTime: formatForInput(end),
    });

    setStep(3);

    if (info.view?.calendar) {
      info.view.calendar.unselect();
    }
  };

  // Submit booking
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRoom) {
      return toast.error('Please select a room');
    }

    setSubmitting(true);

    try {

      const payload = {
        roomId: selectedRoom.id,

        title: formData.title,

        // Convert ONLY when sending
        startTime: formatForBackend(formData.startTime),
        endTime: formatForBackend(formData.endTime),

        notes: formData.notes,
      };

      console.log('BOOKING PAYLOAD:', payload);

      await bookingsApi.create(payload);

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2500);

      setStep(2);

      // Refresh events
      if (calRange) {
        fetchEvents(calRange);
      }

      setFormData({
        title: '',
        startTime: '',
        endTime: '',
        notes: '',
      });

    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.error || 'Booking failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Quick duration buttons
  const applyDuration = (minutes) => {

    if (!formData.startTime) return;

    const start = new Date(formData.startTime);

    const end = addMinutes(start, minutes);

    setFormData({
      ...formData,
      endTime: formatForInput(end),
    });
  };

  if (loading || !user) return null;

  return (
    <>
      <Head>
        <title>Book a Room — CoNetwork</title>
      </Head>

      <AppLayout>

        <div className="p-6 md:p-8">

          {/* Success Popup */}
          {showSuccess &&
            typeof window !== 'undefined' &&
            createPortal(
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.45)',
                }}
              >
                <div className="bg-white rounded-2xl p-8 shadow-2xl">

                  <h2 className="text-2xl font-bold text-green-600">
                    Booking Confirmed!
                  </h2>

                  <p className="text-slate-500 mt-2">
                    {selectedRoom?.name}
                  </p>

                </div>
              </div>,
              document.body
            )}

          {/* Page Header */}
          <div className="mb-6">

            <h1 className="text-3xl font-bold">
              Book a Meeting Room
            </h1>

            <p className="text-slate-500 mt-1">
              Select a room, pick a time, and confirm in seconds
            </p>

          </div>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* Rooms */}
            <div className="space-y-3">

              <h2 className="text-xs font-semibold uppercase text-slate-500">
                Available Rooms
              </h2>

              {rooms.map((room) => (

                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoom(room);
                    setStep(2);
                  }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedRoom?.id === room.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="font-semibold text-slate-800">
                        {room.name}
                      </p>

                      <p className="text-sm text-slate-400">
                        Up to {room.capacity} people
                      </p>

                    </div>

                    {selectedRoom?.id === room.id && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">
                        ✓
                      </div>
                    )}

                  </div>
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="lg:col-span-2">

              {selectedRoom ? (
                <div className="bg-white rounded-2xl p-4 shadow-sm">

                  <div className="flex items-center justify-between mb-3">

                    <div className="flex items-center gap-2">

                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: selectedRoom.color,
                        }}
                      />

                      <span className="font-semibold">
                        {selectedRoom.name}
                      </span>

                    </div>

                    <p className="text-xs text-slate-400">
                      Tap or drag a slot to book
                    </p>

                  </div>

                  <FullCalendarWrapper
                    events={events}

                    onDateSelect={handleDateSelect}

                    onEventClick={() => {}}

                    // IMPORTANT
                    timeZone="local"

                    // IMPORTANT
                    slotDuration="00:30:00"

                    // IMPORTANT
                    snapDuration="00:30:00"

                    onDatesSet={(info) => {

                      setCalRange((prev) => {

                        if (
                          prev?.startStr === info.startStr &&
                          prev?.endStr === info.endStr
                        ) {
                          return prev;
                        }

                        fetchEvents(info);

                        return info;
                      });
                    }}
                  />

                </div>
              ) : (
                <div className="bg-white rounded-2xl h-64 flex items-center justify-center">

                  <p className="text-slate-400">
                    Select a room to view availability
                  </p>

                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>

      {/* Booking Modal */}
      {step === 3 &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setStep(2);
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              background: 'rgba(0,0,0,0.45)',
            }}
          >

            <div className="bg-white rounded-2xl w-full max-w-md p-6">

              {/* Modal Header */}
              <div className="flex items-center justify-between mb-5">

                <div>

                  <h2 className="text-xl font-bold">
                    Confirm Booking
                  </h2>

                  <p className="text-sm text-slate-400">
                    {selectedRoom?.name}
                  </p>

                </div>

                <button
                  onClick={() => setStep(2)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>

              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Title */}
                <div>

                  <label className="block text-sm font-medium mb-1">
                    Meeting Title *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g Weekly Team Standup"
                  />

                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-3">

                  <div>

                    <label className="block text-sm font-medium mb-1">
                      Start
                    </label>

                    <input
                      type="datetime-local"
                      required
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          startTime: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium mb-1">
                      End
                    </label>

                    <input
                      type="datetime-local"
                      required
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          endTime: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />

                  </div>
                </div>

                {/* Quick Durations */}
                <div>

                  <p className="text-xs text-slate-400 mb-2">
                    Quick duration
                  </p>

                  <div className="flex gap-2 flex-wrap">

                    {DURATIONS.map((d) => (

                      <button
                        key={d.value}
                        type="button"
                        onClick={() => applyDuration(d.value)}
                        className="px-3 py-1 border rounded-lg text-sm hover:bg-slate-50"
                      >
                        {d.label}
                      </button>

                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>

                  <label className="block text-sm font-medium mb-1">
                    Notes
                  </label>

                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notes: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Any notes..."
                  />

                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 border rounded-lg py-2"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-emerald-500 text-white rounded-lg py-2"
                  >
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