import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { analyticsApi } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';

const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminAnalytics() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/login');
  }, [user, loading, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setFetching(true);
    analyticsApi.getReports({ period })
      .then(({ data: d }) => setData(d))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [isAdmin, period]);

  const handleExport = async (fmt) => {
    try {
      const { analyticsApi: api } = await import('../../lib/api');
      const res = await api.export({ format: fmt });
      const url = URL.createObjectURL(new Blob([res.data]));
      Object.assign(document.createElement('a'), { href: url, download: `report.${fmt}` }).click();
    } catch {
      alert('Export failed');
    }
  };

  if (loading || !user) return null;

  const peakHoursData = (data?.peakHours || []).filter(h => h.bookings > 0);

  return (
    <>
      <Head><title>Analytics — CoNetwork Admin</title></Head>
      <AppLayout>
        <div className="p-6 md:p-8">
          <div className="page-header mb-6">
            <div>
              <h1 className="page-title">Analytics</h1>
              <p className="page-subtitle">Usage trends and performance metrics</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Period selector */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                {['week', 'month', 'quarter', 'year'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                      period === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p === 'week' ? '7D' : p === 'month' ? '30D' : p === 'quarter' ? '3M' : '1Y'}
                  </button>
                ))}
              </div>

              <button onClick={() => handleExport('xlsx')} className="btn-secondary text-xs">
                📊 Export Excel
              </button>
              <button onClick={() => handleExport('csv')} className="btn-secondary text-xs">
                📄 Export CSV
              </button>
            </div>
          </div>

          {/* Summary stat */}
          {!fetching && data && (
            <div className="stat-card mb-6 inline-flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Bookings This Period</p>
                <p className="font-display text-2xl font-bold text-slate-900">{data.totalBookings}</p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Daily trend */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Booking Trend</h2>
              </div>
              <div className="p-5">
                {fetching ? (
                  <div className="skeleton h-52 rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data?.dailyTrends || []}>
                      <defs>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                        tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} fill="url(#colorBookings)" name="Bookings" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Peak hours */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Peak Booking Hours</h2>
              </div>
              <div className="p-5">
                {fetching ? (
                  <div className="skeleton h-52 rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={peakHoursData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top rooms */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Most Used Rooms</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {fetching ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-5 py-4 flex items-center gap-3">
                      <div className="skeleton w-8 h-8 rounded-lg" />
                      <div className="flex-1">
                        <div className="skeleton h-4 w-32 rounded mb-1" />
                        <div className="skeleton h-3 w-20 rounded" />
                      </div>
                    </div>
                  ))
                ) : (data?.topRooms || []).length === 0 ? (
                  <div className="px-5 py-8 text-center text-slate-400 text-sm">No data for this period</div>
                ) : (
                  (data?.topRooms || []).map((r, i) => (
                    <div key={i} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-slate-600">#{i + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.count} bookings</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800 text-sm">{r.hours}h</p>
                        <p className="text-xs text-slate-400">total</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top clients */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Top Meeting Room Users</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {fetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="skeleton w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <div className="skeleton h-4 w-28 rounded mb-1" />
                        <div className="skeleton h-3 w-16 rounded" />
                      </div>
                    </div>
                  ))
                ) : (data?.topClients || []).length === 0 ? (
                  <div className="px-5 py-8 text-center text-slate-400 text-sm">No data for this period</div>
                ) : (
                  (data?.topClients || []).map((c, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-700">{c.name[0]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.count} booking{c.count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800 text-sm">{c.hours}h</p>
                      </div>
                      {i < 3 && (
                        <span className={`badge ml-1 ${i === 0 ? 'badge-yellow' : i === 1 ? 'badge-gray' : 'badge-blue'}`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}
