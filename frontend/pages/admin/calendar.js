import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { bookingsApi, roomsApi } from '../../lib/api';
import BookingModal from '../../components/modals/BookingModal';
import toast from 'react-hot-toast';

// Dynamically import FullCalendar to avoid SSR issues
const FullCalendarWrapper = dynamic(
  () => import('../../components/calendar/FullCalendarWrapper'),
  { ssr: false }
);

export default function AdminCalendar() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [calendarRange, setCalendarRange] = useState(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/login');
  }, [user, loading, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    roomsApi.getAll({ status: 'ACTIVE' })
      .then(({ data }) => setRooms(data.rooms))
      .catch(console.error);
  }, [isAdmin]);

const fetchEvents = async (info, roomId = selectedRoom) => {
    try {
      const params = {
        start: info.startStr,
        end: info.endStr,
        ...(roomId && { roomId }),
      };
      const { data } = await bookingsApi.getCalendar(params);
      setEvents(data.events);
    } catch (err) {
      toast.error('Failed to load calendar');
    }
  };

  const handleDateSelect = (selectInfo) => {
    setSelectedSlot({
      start: selectInfo.start,
      end: selectInfo.end,
    });
    setSelectedBooking(null);
    setShowModal(true);
    selectInfo.view.calendar.unselect();
  };

  const handleEventClick = (clickInfo) => {
    const props = clickInfo.event.extendedProps;
    setSelectedBooking({
      id: clickInfo.event.id,
      title: clickInfo.event.title.split(' — ')[0],
      startTime: clickInfo.event.start,
      endTime: clickInfo.event.end,
      roomId: props.roomId,
      roomName: props.roomName,
      clientName: props.clientName,
      notes: props.notes,
      status: props.status,
    });
    setSelectedSlot(null);
    setShowModal(true);
  };

  const handleBookingSuccess = () => {
    setShowModal(false);
    // Refresh events by triggering re-fetch
    if (calendarRange) fetchEvents(calendarRange);
  };

  if (loading || !user) return null;

  return (
    <>
      <Head><title>Calendar — CoNetwork Admin</title></Head>
      <AppLayout>
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="page-header mb-6">
            <div>
              <h1 className="page-title">Booking Calendar</h1>
              <p className="page-subtitle">View and manage all meeting room bookings</p>
            </div>
            <button
              onClick={() => { setSelectedSlot(null); setSelectedBooking(null); setShowModal(true); }}
              className="btn-primary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              New Booking
            </button>
          </div>

          {/* Room filter */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <button
              onClick={() => { setSelectedRoom(''); if (calendarRange) fetchEvents(calendarRange, ''); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selectedRoom === ''
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              All Rooms
            </button>
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => { setSelectedRoom(room.id); if (calendarRange) fetchEvents(calendarRange, room.id); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                  selectedRoom === room.id
                    ? 'text-white border-transparent'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
                style={selectedRoom === room.id ? { backgroundColor: room.color, borderColor: room.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: room.color }}
                />
                {room.name}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="card p-4 md:p-5">
            <FullCalendarWrapper
              events={events}
              onDateSelect={handleDateSelect}
              onEventClick={handleEventClick}
              onDatesSet={(info) => {
    setCalendarRange(prev => {
      if (prev?.startStr === info.startStr && prev?.endStr === info.endStr) return prev;
      fetchEvents(info);
      return info;
    });
  }}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {rooms.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: r.color }} />
                <span className="text-xs text-slate-500">{r.name}</span>
              </div>
            ))}
          </div>
        </div>

        {showModal && (
          <BookingModal
            onClose={() => setShowModal(false)}
            onSuccess={handleBookingSuccess}
            initialSlot={selectedSlot}
            existingBooking={selectedBooking}
            rooms={rooms}
            isAdmin={true}
          />
        )}
      </AppLayout>
    </>
  );
}
