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

// datetime-local → input format
function formatForInput(date) {
  const d = new Date(date);

  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// LOCAL → UTC (IMPORTANT FIX)
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

  // auth redirect
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'ADMIN') router.replace('/admin');
  }, [user, loading]);

  // fetch rooms
  useEffect(() => {
    if (!user) return;

    roomsApi
      .getAll({ status: 'ACTIVE' })
      .then(({ data }) => {
        setRooms(data.rooms);
        if (data.rooms.length > 0) setSelectedRoom(data.rooms[0]);
      })
      .catch(console.error);
  }, [user]);

  // fetch events (FIXED: no new Date conversion)
  const fetchEvents = async (info) => {
    if (!selectedRoom) return;

    try {
      const { data } = await bookingsApi.getCalendar({
        start: info.startStr,
        end: info.endStr,
        roomId: selectedRoom.id,
      });

      const normalized = data.events.map((event) => ({
        ...event,
        start: event.start,
        end: event.end,
      }));

      setEvents(normalized);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (calRange && selectedRoom) {
      fetchEvents(calRange);
    }
  }, [selectedRoom, calRange]);

  // select slot
  const handleDateSelect = (info) => {
    const start = new Date(info.start);
    const end = new Date(info.end);

    setFormData({
      title: '',
      notes: '',
      startTime: formatForInput(start),
      endTime: formatForInput(end),
    });

    setStep(3);

    if (info.view?.calendar) {
      info.view.calendar.unselect();
    }
  };

  // submit booking
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRoom) return toast.error('Please select a room');

    setSubmitting(true);

    try {
      const payload = {
        roomId: selectedRoom.id,
        title: formData.title,
        startTime: formatForBackend(formData.startTime),
        endTime: formatForBackend(formData.endTime),
        notes: formData.notes,
      };

      await bookingsApi.create(payload);

      setShowSuccess(true);

      setTimeout(() => setShowSuccess(false), 2500);

      setStep(2);

      if (calRange) fetchEvents(calRange);

      setFormData({
        title: '',
        startTime: '',
        endTime: '',
        notes: '',
      });

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // duration helper
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

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Book a Meeting Room</h1>
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
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{room.name}</p>
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

                  <FullCalendarWrapper
                    events={events}
                    onDateSelect={handleDateSelect}
                    onEventClick={() => {}}
                    slotDuration="00:30:00"
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

      {/* SUCCESS MODAL */}
      {showSuccess &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-2xl shadow-xl">
              <h2 className="text-xl font-bold text-green-600">
                Booking Confirmed!
              </h2>
              <p className="text-slate-500 mt-1">
                {selectedRoom?.name}
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}