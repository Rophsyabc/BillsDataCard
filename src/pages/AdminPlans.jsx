import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useApp } from '../context/AppContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const networks = ['mtn', 'airtel', 'glo', '9mobile', 'smile'];
const categories = ['daily', 'weekly', 'monthly', 'unlimited'];

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [networkFilter, setNetworkFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const { token } = useApp();

  const fetchPlans = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (networkFilter) params.set('network', networkFilter);
    try {
      const res = await fetch(`${API_BASE}/api/admin/plans?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setPlans(data.data);
    } catch (e) {
      console.error('Failed to fetch plans:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, [networkFilter, token]);

  const savePlan = async (id, updates) => {
    try {
      await fetch(`${API_BASE}/api/admin/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      setEditing(null);
      fetchPlans();
    } catch (e) {
      console.error('Failed to save plan:', e);
    }
  };

  const addPlan = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setForm({});
      fetchPlans();
    } catch (e) {
      console.error('Failed to add plan:', e);
    }
  };

  const deletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return;
    try {
      await fetch(`${API_BASE}/api/admin/plans/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchPlans();
    } catch (e) {
      console.error('Failed to delete plan:', e);
    }
  };

  return (
    <AdminLayout>
      <h2>Data Plans Management</h2>
      <p className="subtitle">Manage data plan prices and availability</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={networkFilter} onChange={(e) => setNetworkFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
          <option value="">All Networks</option>
          {networks.map((n) => <option key={n} value={n}>{n.toUpperCase()}</option>)}
        </select>
      </div>

      <div className="form-card" style={{ marginBottom: 20, borderColor: 'var(--primary)' }}>
        <h3 style={{ marginBottom: 12 }}>Add New Plan</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          <select value={form.network || ''} onChange={(e) => setForm({ ...form, network: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <option value="">Network</option>
            {networks.map((n) => <option key={n} value={n}>{n.toUpperCase()}</option>)}
          </select>
          <input placeholder="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input placeholder="Size (e.g. 1GB)" value={form.size || ''} onChange={(e) => setForm({ ...form, size: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input type="number" placeholder="Sell Price" value={form.price || ''} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input type="number" placeholder="Cost Price" value={form.cost_price || ''} onChange={(e) => setForm({ ...form, cost_price: parseInt(e.target.value) })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input placeholder="Validity" value={form.validity || ''} onChange={(e) => setForm({ ...form, validity: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <select value={form.category || 'monthly'} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={addPlan} style={{ marginTop: 12 }} disabled={!form.network || !form.name || !form.price}>Add Plan</button>
      </div>

      <div className="form-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Network</th>
              <th style={{ padding: '8px 6px' }}>Name</th>
              <th style={{ padding: '8px 6px' }}>Size</th>
              <th style={{ padding: '8px 6px' }}>Sell Price</th>
              <th style={{ padding: '8px 6px' }}>Cost Price</th>
              <th style={{ padding: '8px 6px' }}>Profit</th>
              <th style={{ padding: '8px 6px' }}>Category</th>
              <th style={{ padding: '8px 6px' }}>Active</th>
              <th style={{ padding: '8px 6px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ padding: 20, textAlign: 'center' }}>Loading...</td></tr>
            ) : plans.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 6px', fontWeight: 600 }}>{p.network.toUpperCase()}</td>
                <td style={{ padding: '8px 6px' }}>{p.name}</td>
                <td style={{ padding: '8px 6px' }}>{p.size}</td>
                <td style={{ padding: '8px 6px', fontWeight: 600 }}>₦{p.price.toLocaleString()}</td>
                <td style={{ padding: '8px 6px' }}>₦{p.cost_price.toLocaleString()}</td>
                <td style={{ padding: '8px 6px', color: '#10B981', fontWeight: 600 }}>₦{(p.price - p.cost_price).toLocaleString()}</td>
                <td style={{ padding: '8px 6px' }}><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', background: 'var(--primary-light)', color: 'var(--primary)' }}>{p.category}</span></td>
                <td style={{ padding: '8px 6px' }}>
                  <button className={`btn-sm ${p.active ? 'btn-success' : 'btn-danger'}`} onClick={() => savePlan(p.id, { active: !p.active })}>{p.active ? 'On' : 'Off'}</button>
                </td>
                <td style={{ padding: '8px 6px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-sm" onClick={() => { setEditing(p.id); setForm(p); }}>Edit</button>
                    <button className="btn-sm btn-danger" onClick={() => deletePlan(p.id)}>Del</button>
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
