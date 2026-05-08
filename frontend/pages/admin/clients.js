import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layouts/AppLayout';
import { clientsApi } from '../../lib/api';
import toast from 'react-hot-toast';

function ClientModal({ client, onClose, onSuccess }) {
  const isEdit = !!client;
  const [form, setForm] = useState({
    name: client?.user?.name || '',
    email: client?.user?.email || '',
    password: '',
    companyName: client?.companyName || '',
    phone: client?.phone || '',
    status: client?.status || 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEdit) {
        await clientsApi.update(client.id, form);
        toast.success('Client updated');
      } else {
        await clientsApi.create(form);
        toast.success('Client account created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-md w-full">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-slate-900 text-lg">
            {isEdit ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="form-input" placeholder="Ahmed Khan" />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="form-input" placeholder="ahmed@company.com" />
            </div>
          </div>

          <div>
            <label className="form-label">{isEdit ? 'New Password' : 'Password *'} <span className="text-slate-400 font-normal text-xs">min 8 chars</span></label>
            <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required={!isEdit} className="form-input" placeholder="••••••••" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Company</label>
              <input type="text" value={form.companyName} onChange={(e) => setForm({...form, companyName: e.target.value})} className="form-input" placeholder="Acme Pvt Ltd" />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="form-input" placeholder="+92 300 0000000" />
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
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminClients() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({});
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/login');
  }, [user, loading, isAdmin]);

  const fetchClients = async () => {
    setFetching(true);
    try {
      const { data } = await clientsApi.getAll({ search, page, limit: 15 });
      setClients(data.clients);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load clients');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchClients();
  }, [isAdmin, search, page]);

  // Open new modal if URL has ?new=1
  useEffect(() => {
    if (router.query.new === '1') setShowModal(true);
  }, [router.query]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this client? This cannot be undone.')) return;
    try {
      await clientsApi.delete(id);
      toast.success('Client deleted');
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <Head><title>Clients — CoNetwork Admin</title></Head>
      <AppLayout>
        <div className="p-6 md:p-8">
          <div className="page-header">
            <div>
              <h1 className="page-title">Clients</h1>
              <p className="page-subtitle">{pagination.total || 0} registered members</p>
            </div>
            <button onClick={() => { setEditClient(null); setShowModal(true); }} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Add Client
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-5 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, company..."
              className="form-input pl-9"
            />
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fetching ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j}><div className="skeleton h-4 w-24 rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        {search ? 'No clients match your search' : 'No clients yet. Add your first client.'}
                      </td>
                    </tr>
                  ) : (
                    clients.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-slate-600">{c.user.name[0]}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{c.user.name}</p>
                              <p className="text-xs text-slate-400">{c.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-slate-600">{c.companyName || <span className="text-slate-300">—</span>}</td>
                        <td className="text-slate-600">{c.phone || <span className="text-slate-300">—</span>}</td>
                        <td className="text-slate-500 text-xs">{format(new Date(c.user.createdAt), 'MMM d, yyyy')}</td>
                        <td>
                          <span className={c.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}>
                            {c.status === 'ACTIVE' ? '● Active' : '● Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditClient(c); setShowModal(true); }}
                              className="btn-ghost text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="btn-ghost text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <ClientModal
            client={editClient}
            onClose={() => { setShowModal(false); setEditClient(null); }}
            onSuccess={() => { setShowModal(false); setEditClient(null); fetchClients(); }}
          />
        )}
      </AppLayout>
    </>
  );
}
