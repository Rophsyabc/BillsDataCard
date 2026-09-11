import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useApp } from '../context/AppContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { token } = useApp();

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { setUsers(data.data.users); setTotal(data.data.total); }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [search, statusFilter, token]);

  const updateUser = async (id, updates) => {
    try {
      await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      setEditingUser(null);
      fetchUsers();
    } catch (e) {
      console.error('Failed to update user:', e);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await fetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (e) {
      console.error('Failed to delete user:', e);
    }
  };

  return (
    <AdminLayout>
      <h2>Users Management</h2>
      <p className="subtitle">{total} total users</p>

      <div className="form-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {editingUser && (
        <div className="form-card" style={{ marginBottom: 20, borderColor: 'var(--primary)' }}>
          <h3 style={{ marginBottom: 12 }}>Edit User: {editingUser.name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input placeholder="Name" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            <input placeholder="Email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            <input placeholder="Phone" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            <select value={editForm.role || 'user'} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select value={editForm.status || 'active'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => updateUser(editingUser.id, editForm)}>Save</button>
            <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="form-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px' }}>Name</th>
              <th style={{ padding: '10px 8px' }}>Email</th>
              <th style={{ padding: '10px 8px' }}>Phone</th>
              <th style={{ padding: '10px 8px' }}>Role</th>
              <th style={{ padding: '10px 8px' }}>Status</th>
              <th style={{ padding: '10px 8px' }}>Joined</th>
              <th style={{ padding: '10px 8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center' }}>No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 500 }}>{u.name}</td>
                <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '10px 8px' }}>{u.phone || '-'}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', background: u.role === 'admin' ? 'var(--primary-light)' : 'var(--bg)', color: u.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)' }}>{u.role}</span>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', background: u.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: u.status === 'active' ? '#10B981' : '#EF4444' }}>{u.status}</span>
                </td>
                <td style={{ padding: '10px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-sm" onClick={() => { setEditingUser(u); setEditForm(u); }}>Edit</button>
                    {u.status === 'active' ? (
                      <button className="btn-sm btn-danger" onClick={() => updateUser(u.id, { status: 'banned' })}>Ban</button>
                    ) : (
                      <button className="btn-sm btn-success" onClick={() => updateUser(u.id, { status: 'active' })}>Unban</button>
                    )}
                    <button className="btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
