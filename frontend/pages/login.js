import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const ROOM_IMAGES = [
  '/images/room-1.jpg',
  '/images/room-2.jpg',
  '/images/room-3.jpg',
  '/images/room-4.jpg',
  '/images/room-5.jpg',
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [roomStatus, setRoomStatus] = useState([]);

  useEffect(() => {
    setMounted(true);

    const imgInterval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % ROOM_IMAGES.length);
    }, 5000);

    const fetchRooms = async () => {
      try {
        const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
          email: 'admin@conetwork.pk',
          password: 'admin123',
        });
        const token = loginRes.data.token;
        const [roomsRes, todayRes] = await Promise.all([
          axios.get(`${API_URL}/api/rooms`, { headers: { Authorization: `Bearer ${token}` }, params: { status: 'ACTIVE' } }),
          axios.get(`${API_URL}/api/bookings/today`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const now = new Date();
        const rooms = roomsRes.data.rooms.map((r) => {
          const currentBooking = todayRes.data.bookings.find(
            (b) => b.roomId === r.id && new Date(b.startTime) <= now && new Date(b.endTime) > now
          );
          const nextBooking = todayRes.data.bookings
            .filter((b) => b.roomId === r.id && new Date(b.startTime) > now)
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
          return { ...r, currentBooking, nextBooking };
        });
        setRoomStatus(rooms);
      } catch (err) {
        // silently fail
      }
    };
    fetchRooms();

    return () => clearInterval(imgInterval);
  }, []);

  if (!loading && user) {
    router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await login(form.email, form.password);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      router.replace(data.user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dt) => new Date(dt).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return (
    <>
      <Head>
        <title>Login — CoNetwork Rooms</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0px); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        @keyframes featureFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes statusPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50% { box-shadow: 0 0 0 4px rgba(16,185,129,0); }
        }
        @keyframes redPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
        .shake-anim { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
        .particle { position: absolute; background: #10b981; border-radius: 50%; animation: floatUp linear infinite; opacity: 0; }
        .left-panel { animation: fadeSlideLeft 0.6s ease-out forwards; }
        .right-panel { animation: fadeSlideRight 0.6s ease-out forwards; }
        .feature-1 { animation: featureFadeUp 0.5s ease-out 0.2s forwards; opacity: 0; }
        .feature-2 { animation: featureFadeUp 0.5s ease-out 0.35s forwards; opacity: 0; }
        .feature-3 { animation: featureFadeUp 0.5s ease-out 0.5s forwards; opacity: 0; }
        .tagline { animation: fadeSlideUp 0.5s ease-out 0.1s forwards; opacity: 0; }
        .form-enter { animation: fadeSlideUp 0.5s ease-out 0.15s forwards; opacity: 0; }
        .input-glow:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.15) !important;
          outline: none !important;
        }
        .btn-signin {
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 20px rgba(16,185,129,0.3);
        }
        .btn-signin:hover:not(:disabled) {
          box-shadow: 0 8px 30px rgba(16,185,129,0.5) !important;
          transform: translateY(-1px);
        }
        .btn-signin:active:not(:disabled) { transform: scale(0.97); }
        .glow-orb { animation: glowPulse 3s ease-in-out infinite; }
        .green-dot { animation: statusPulse 2s ease-in-out infinite; }
        .red-dot { animation: redPulse 2s ease-in-out infinite; }
        .step-card { transition: all 0.2s ease; }
        .step-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
      `}</style>

      <div className="min-h-screen flex" style={{ background: '#0f172a' }}>

        {/* ── LEFT PANEL ── */}
        <div className="left-panel hidden lg:flex lg:w-1/2 relative flex-col overflow-hidden">
          <div className="absolute inset-0">
            {ROOM_IMAGES.map((src, i) => (
              <img key={src} src={src} alt="CoNetwork"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                style={{ opacity: i === currentImage ? 1 : 0 }} />
            ))}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(135deg, rgba(2,8,23,0.9) 0%, rgba(15,23,42,0.85) 50%, rgba(2,8,23,0.8) 100%)'
            }} />
            <div className="glow-orb absolute -bottom-20 -left-20 w-80 h-80 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          </div>

          {mounted && Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="particle" style={{
              left: `${(i * 8.5) % 100}%`, bottom: '-10px',
              width: i % 3 === 0 ? '3px' : '2px', height: i % 3 === 0 ? '3px' : '2px',
              animationDuration: `${10 + (i * 1.2) % 7}s`,
              animationDelay: `${(i * 0.8) % 6}s`,
            }} />
          ))}

          <div className="relative z-10 flex flex-col h-full p-12">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="CoNetwork" className="h-10 w-auto object-contain"
                style={{ filter: 'brightness(0) invert(1)' }} />
              <span className="text-white font-bold text-xl"
                style={{ fontFamily: 'Mont, Montserrat, sans-serif' }}>CoNetwork</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="tagline">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" style={{ boxShadow: '0 0 6px #10b981' }} />
                  <span className="text-emerald-400 text-xs font-semibold tracking-wide">Meeting Room Booking</span>
                </div>
                <h1 className="text-4xl font-bold text-white leading-tight mb-3"
                  style={{ fontFamily: 'Mont, Montserrat, sans-serif', letterSpacing: '-0.5px' }}>
                  Your workspace,<br />
                  <span style={{ color: '#10b981' }}>your schedule.</span>
                </h1>
                <p className="text-slate-400 text-base leading-relaxed max-w-sm">
                  Book premium meeting rooms at CoNetwork in seconds. Real-time availability, instant confirmation.
                </p>
              </div>

              <div className="mt-10 space-y-4">
                {[
                  { icon: '📅', title: 'Book in seconds', desc: 'Reserve any room with just a few clicks', cls: 'feature-1' },
                  { icon: '🔴', title: 'Live availability', desc: 'See which rooms are free right now', cls: 'feature-2' },
                  { icon: '🏢', title: 'Premium spaces', desc: 'TAMC & Regency locations in Lahore', cls: 'feature-3' },
                ].map((f) => (
                  <div key={f.title} className={`${f.cls} flex items-center gap-4`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{f.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-10">
                {ROOM_IMAGES.map((_, i) => (
                  <button key={i} onClick={() => setCurrentImage(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === currentImage ? '24px' : '8px',
                      height: '8px',
                      background: i === currentImage ? '#10b981' : 'rgba(255,255,255,0.3)',
                    }} />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-8 pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {[{ value: '2', label: 'Locations' }, { value: '2', label: 'Meeting Rooms' }].map((s) => (
                <div key={s.label}>
                  <p className="text-white font-bold text-xl" style={{ fontFamily: 'Mont, Montserrat, sans-serif' }}>{s.value}</p>
                  <p className="text-slate-500 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto"
          style={{ background: '#ffffff', minHeight: '100vh' }}>
          <div className="w-full max-w-sm py-8">

            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <img src="/logo.png" alt="CoNetwork" className="h-12 w-auto object-contain mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Meeting Room Booking System</p>
            </div>

            <div className={`form-enter ${shake ? 'shake-anim' : ''}`}>

              
              {/* ── LIVE ROOM STATUS ── */}
              {roomStatus.length > 0 && (
                <div className="mb-7">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Live Room Status</p>
                  <div className="space-y-2">
                    {roomStatus.map((room) => {
                      const isInUse = !!room.currentBooking;
                      return (
                        <div key={room.id}
                          className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-100"
                          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isInUse ? 'red-dot bg-red-500' : 'green-dot bg-emerald-500'}`} />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{room.name}</p>
                              <p className="text-xs text-slate-400">
                                {isInUse
                                  ? `In use until ${formatTime(room.currentBooking.endTime)}`
                                  : room.nextBooking
                                    ? `Free until ${formatTime(room.nextBooking.startTime)}`
                                    : 'Available all day'}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isInUse ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {isInUse ? 'In Use' : 'Free'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── LOGIN FORM ── */}
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900 mb-0.5"
                  style={{ fontFamily: 'Mont, Montserrat, sans-serif' }}>
                  Welcome back
                </h2>
                <p className="text-slate-600 text-sm">Sign in to your CoNetwork account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Email address</label>
                  <input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com" required
                    className="input-glow w-full px-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 text-sm transition-all duration-200"
                    style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1' }} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••" required
                      className="input-glow w-full px-4 py-3 pr-12 rounded-xl text-slate-800 placeholder:text-slate-400 text-sm transition-all duration-200"
                      style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1' }} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPass ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={submitting}
                  className="btn-signin w-full py-3.5 text-white font-semibold rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign in →'}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-center gap-6">
                  {[{ icon: '🏢', text: 'TAMC' }, { icon: '📍', text: 'Regency' }, { icon: '🇵🇰', text: 'Lahore' }].map((item) => (
                    <div key={item.text} className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <span>{item.icon}</span><span>{item.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-slate-400 text-xs mt-3">
                  © {new Date().getFullYear()} CoNetwork
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
