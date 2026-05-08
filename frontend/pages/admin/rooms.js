import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { roomsApi } from '../../lib/api';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

const EQUIPMENT_OPTIONS = [
  'Projector', 'TV Screen', 'Whiteboard', 'Video Conferencing',
  'HDMI', 'Webcam', 'Dual Monitors', 'Sound System', 'Phone',
];

function RoomModal({ room, onClose, onSuccess }) {
  const isEdit = !!room;
  const [form, setForm] = useState({
    name: room?.name || '',
    capacity: room?.capacity || 4,
    equipment: room?.equipment || [],
    description: room?.description || '',
    color: room?.color || '#10b981',
    status: room?.status || 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);

  const toggleEquipment = (item) => {
    setForm((f) => ({
      ...f,
      equipment: f.equipment.includes(item)
        ? f.equipment.filter((e) => e !== item)
        : [...f.equipment, item],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEdit) {
        await roomsApi.update(room.id, form);
        toast.success('Room updated');
      } else {
        await roomsApi.create(form);
        toast.success('Room created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-lg w-full">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-slate-900 text-lg">{isEdit ? 'Edit Room' : 'Add Meeting Room'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Room Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="form-input" placeholder="Boardroom Alpha" />
            </div>
            <div>
              <label className="form-label">Capacity *</label>
              <input type="number" value={form.capacity} onChange={(e) => setForm({...form, capacity: e.target.value})} required min={1} max={50} className="form-input" />
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} className="form-input resize-none" placeholder="Room description..." />
          </div>

          <div>
            <label className="form-label">Equipment</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleEquipment(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.equipment.includes(item)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {form.equipment.includes(item) ? '✓ ' : ''}{item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Calendar Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({...form, color: c})}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? '#0f172a' : 'transparent',
                    transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="form-label">Status</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="form-input">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminRooms() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/login');
  }, [user, loading, isAdmin]);

  const fetchRooms = async () => {
    try {
      const { data } = await roomsApi.getAll();
      setRooms(data.rooms);
    } catch (err) {
      toast.error('Failed to load rooms');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchRooms();
  }, [isAdmin]);

  useEffect(() => {
    if (router.query.new === '1') setShowModal(true);
  }, [router.query]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this room?')) return;
    try {
      await roomsApi.delete(id);
      toast.success('Room deleted');
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <Head><title>Rooms — CoNetwork Admin</title></Head>
      <AppLayout>
        <div className="p-6 md:p-8">
          <div className="page-header">
            <div>
              <h1 className="page-title">Meeting Rooms</h1>
              <p className="page-subtitle">{rooms.length} room{rooms.length !== 1 ? 's' : ''} configured</p>
            </div>
            <button onClick={() => { setEditRoom(null); setShowModal(true); }} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Add Room
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fetching ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-5">
                  <div className="skeleton h-6 w-40 rounded mb-3" />
                  <div className="skeleton h-4 w-full rounded mb-2" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                </div>
              ))
            ) : rooms.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-slate-400">
                No meeting rooms yet. Add your first room.
              </div>
            ) : (
              rooms.map((r) => (
                <div key={r.id} className="card hover:shadow-card-hover transition-shadow duration-200">
                  <div className="p-5">
                    {/* Header with color */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: r.color + '20', border: `1px solid ${r.color}40` }}
                        >
                          <svg className="w-5 h-5" style={{ color: r.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">{r.name}</h3>
                          <p className="text-xs text-slate-400">Up to {r.capacity} people</p>
                        </div>
                      </div>
                      <span className={r.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}>
                        {r.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {r.description && (
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{r.description}</p>
                    )}

                    {r.equipment.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {r.equipment.map((eq) => (
                          <span key={eq} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs">
                            {eq}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => { setEditRoom(r); setShowModal(true); }}
                        className="btn-secondary text-xs flex-1 justify-center py-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="btn-ghost text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showModal && (
          <RoomModal
            room={editRoom}
            onClose={() => { setShowModal(false); setEditRoom(null); }}
            onSuccess={() => { setShowModal(false); setEditRoom(null); fetchRooms(); }}
          />
        )}
      </AppLayout>
    </>
  );
}
