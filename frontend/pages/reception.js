import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function formatTime(dt) {
  return format(new Date(dt), 'h:mm a');
}

function RoomTimeline({ room, bookings, index }) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 0, 0);

  const slots = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const slotEnd = new Date(cursor.getTime() + 30 * 60 * 1000);
    const booking = bookings.find(
      (b) => new Date(b.startTime) < slotEnd && new Date(b.endTime) > cursor
    );
    const isPast = slotEnd <= now;
    const isNow = cursor <= now && now < slotEnd;
    slots.push({
      time: new Date(cursor),
      endTime: slotEnd,
      booking,
      isPast,
      isNow,
      status: isPast ? 'past' : booking ? 'booked' : 'available',
    });
    cursor = slotEnd;
  }

  const currentBooking = bookings.find(
    (b) => new Date(b.startTime) <= now && new Date(b.endTime) > now
  );
  const nextBooking = bookings
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

  let progressPct = 0;
  if (currentBooking) {
    const total = new Date(currentBooking.endTime) - new Date(currentBooking.startTime);
    const elapsed = now - new Date(currentBooking.startTime);
    progressPct = Math.min(100, Math.round((elapsed / total) * 100));
  }

  const isInUse = !!currentBooking;

  return (
    <div
      className="room-card bg-white rounded-2xl overflow-hidden"
      style={{
        border: '1px solid #e2e8f0',
        boxShadow: isInUse
          ? `0 4px 20px rgba(239,68,68,0.12), 0 1px 3px rgba(0,0,0,0.06)`
          : `0 4px 20px rgba(16,185,129,0.08), 0 1px 3px rgba(0,0,0,0.06)`,
        animation: `cardSlideUp 0.5s ease-out forwards`,
        animationDelay: `${index * 120}ms`,
        opacity: 0,
      }}
    >
      {/* Color top bar */}
      <div style={{ height: '4px', background: room.color }} />

      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-slate-900 text-lg">{room.name}</h2>
          <p className="text-sm text-slate-400">Capacity: {room.capacity} people</p>
        </div>
        <div
          className={`status-badge px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
            isInUse
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span className={`status-dot w-2 h-2 rounded-full ${isInUse ? 'bg-red-500' : 'bg-emerald-500'}`} />
          {isInUse ? 'In Use' : 'Available'}
        </div>
      </div>

      {/* Progress bar for current booking */}
      {isInUse && (
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Session progress</span>
            <span className="text-xs font-semibold text-red-600">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #f87171, #ef4444)',
              }}
            />
          </div>
        </div>
      )}

      {/* Current / Next */}
      <div className="px-6 py-3 bg-slate-50 border-y border-slate-100 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Now</p>
          {currentBooking ? (
            <div>
              <p className="font-semibold text-slate-800 text-sm truncate">{currentBooking.title}</p>
              <p className="text-xs text-slate-500">Until {formatTime(currentBooking.endTime)}</p>
            </div>
          ) : (
            <p className="text-sm text-emerald-600 font-semibold">Free</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Next</p>
          {nextBooking ? (
            <div>
              <p className="font-semibold text-slate-800 text-sm truncate">{nextBooking.title}</p>
              <p className="text-xs text-slate-500">{formatTime(nextBooking.startTime)} – {formatTime(nextBooking.endTime)}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No more bookings</p>
          )}
        </div>
      </div>

      {/* Time slots */}
      <div className="px-6 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Today&apos;s Schedule</p>
        <div className="space-y-1.5">
          {slots.map((slot, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                slot.isNow
                  ? 'text-white'
                  : slot.status === 'booked'
                  ? 'bg-red-50 border border-red-100'
                  : slot.status === 'past'
                  ? 'bg-slate-50 opacity-40'
                  : 'bg-emerald-50 border border-emerald-100'
              }`}
              style={slot.isNow ? { background: 'linear-gradient(135deg, #0f172a, #1e293b)' } : {}}
            >
              <span className={`font-mono text-xs font-medium w-16 flex-shrink-0 ${slot.isNow ? 'text-emerald-400' : 'text-slate-500'}`}>
                {format(slot.time, 'h:mm a').replace(' ', '')}
              </span>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                slot.isNow ? 'bg-emerald-400' :
                slot.status === 'booked' ? 'bg-red-400' :
                slot.status === 'past' ? 'bg-slate-300' : 'bg-emerald-400'
              }`} />
              <span className={`flex-1 font-medium truncate ${
                slot.isNow ? 'text-white' :
                slot.status === 'booked' ? 'text-red-700' :
                slot.status === 'past' ? 'text-slate-400' : 'text-emerald-700'
              }`}>
                {slot.booking ? slot.booking.title : slot.status === 'past' ? 'Past' : 'Available'}
              </span>
              {slot.isNow && (
                <span className="now-badge text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">
                  NOW
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReceptionBoard() {
  const [rooms, setRooms] = useState([]);
  const [bookingsMap, setBookingsMap] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    setLastUpdated(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchData = async () => {
    try {
      setError(null);

      // 1. Login to get token
      const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@conetwork.pk',
        password: 'Conetwork@123',
      });
      const token = loginRes.data.token;

      // 2. Fetch rooms (no status filter — let backend return all rooms)
      const [roomsRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
          // FIX: Removed `params: { status: 'ACTIVE' }` — this was filtering
          // out rooms whose DB status didn't exactly match 'ACTIVE' (e.g. 'active').
          // Remove this filter so all rooms appear on the board.
        }),
        axios.get(`${API_URL}/api/bookings/today`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // 3. FIX: Handle both response shapes:
      //    { rooms: [...] }  →  roomsRes.data.rooms
      //    [...]             →  roomsRes.data  (plain array)
      const fetchedRooms = Array.isArray(roomsRes.data)
        ? roomsRes.data
        : roomsRes.data.rooms ?? [];

      setRooms(fetchedRooms);

      // 4. Build bookings map keyed by roomId
      const map = {};
      const bookings = Array.isArray(bookingsRes.data)
        ? bookingsRes.data
        : bookingsRes.data.bookings ?? [];

      for (const b of bookings) {
        if (!map[b.roomId]) map[b.roomId] = [];
        map[b.roomId].push(b);
      }
      setBookingsMap(map);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Board fetch error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 300000); // refresh every 5 min
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <>
      <Head>
        <title>CoNetwork — Reception Board</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="refresh" content="120" />
      </Head>

      <style>{`
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes statusPulseGreen {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }
        @keyframes statusPulseRed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        @keyframes nowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes headerFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .room-card { transition: box-shadow 0.3s ease; }
        .room-card:hover { transform: translateY(-2px); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .status-dot { display: inline-block; }
        .bg-emerald-50 .status-dot { animation: statusPulseGreen 2s ease-in-out infinite; }
        .bg-red-50 .status-dot { animation: statusPulseRed 2s ease-in-out infinite; }
        .now-badge { animation: nowPulse 1.5s ease-in-out infinite; }
        .header-anim { animation: headerFadeIn 0.5s ease-out forwards; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9' }}>
        {/* Header */}
        <div
          className="header-anim sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="CoNetwork"
              className="h-8 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div>
              <p className="font-display font-bold text-white text-sm">CoNetwork</p>
              <p className="text-xs text-slate-400">Meeting Room Board</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-xl text-white tracking-tight">
              {mounted && now ? format(now, 'h:mm:ss a') : '--:--:-- --'}
            </p>
            <p className="text-xs text-slate-400">
              {mounted && now ? format(now, 'EEEE, MMMM d yyyy') : ''}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-6xl">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
                    <div className="h-6 w-40 bg-slate-200 rounded mb-3" />
                    <div className="h-4 w-full bg-slate-100 rounded mb-2" />
                    <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-20">
                <p className="text-red-500 font-semibold mb-2">Failed to load room data</p>
                <p className="text-slate-400 text-sm">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-20 text-slate-400">
                <p className="text-lg font-semibold mb-1">No meeting rooms configured</p>
                <p className="text-sm">Add rooms in the admin panel to see them here.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-5 max-w-6xl mx-auto">
              {rooms.map((room, i) => (
                <div key={room.id} style={{ width: '380px', minWidth: '320px', flex: '0 1 380px' }}>
                  <RoomTimeline
                    room={room}
                    bookings={bookingsMap[room.id] || []}
                    index={i}
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <p className="text-center text-xs text-slate-400 mt-6">
              {mounted && lastUpdated ? `Last updated ${format(lastUpdated, 'h:mm:ss a')}` : ''}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
