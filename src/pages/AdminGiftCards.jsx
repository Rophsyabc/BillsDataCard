import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useApp } from '../context/AppContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function AdminGiftCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const { token } = useApp();

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/giftcards`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCards(data.data);
    } catch (e) {
      console.error('Failed to fetch gift cards:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCards(); }, [token]);

  const saveCard = async (id, updates) => {
    try {
      await fetch(`${API_BASE}/api/admin/giftcards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      setEditing(null);
      fetchCards();
    } catch (e) {
      console.error('Failed to save gift card:', e);
    }
  };

  const addCard = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/giftcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setForm({});
      fetchCards();
    } catch (e) {
      console.error('Failed to add gift card:', e);
    }
  };

  const deleteCard = async (id) => {
    if (!confirm('Delete this card?')) return;
    try {
      await fetch(`${API_BASE}/api/admin/giftcards/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchCards();
    } catch (e) {
      console.error('Failed to delete gift card:', e);
    }
  };

  return (
    <AdminLayout>
      <h2>Gift Cards Management</h2>
      <p className="subtitle">{cards.length} total cards</p>

      <div className="form-card" style={{ marginBottom: 20, borderColor: 'var(--primary)' }}>
        <h3 style={{ marginBottom: 12 }}>Add New Gift Card</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          <input placeholder="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <select value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
            <option value="CAD">CAD</option>
          </select>
          <input type="number" placeholder="Min Amount" value={form.minAmount || ''} onChange={(e) => setForm({ ...form, minAmount: parseInt(e.target.value) })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input type="number" placeholder="Max Amount" value={form.maxAmount || ''} onChange={(e) => setForm({ ...form, maxAmount: parseInt(e.target.value) })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input type="number" placeholder="Sell Rate (₦/$)" value={form.rate || ''} onChange={(e) => setForm({ ...form, rate: parseInt(e.target.value) })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input type="number" placeholder="Cost Rate (₦/$)" value={form.cost_rate || ''} onChange={(e) => setForm({ ...form, cost_rate: parseInt(e.target.value) })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input placeholder="Logo URL" value={form.logo || ''} onChange={(e) => setForm({ ...form, logo: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
        </div>
        <button className="btn-primary" onClick={addCard} style={{ marginTop: 12 }} disabled={!form.name || !form.rate}>Add Card</button>
      </div>

      <div className="form-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Name</th>
              <th style={{ padding: '8px 6px' }}>Currency</th>
              <th style={{ padding: '8px 6px' }}>Range</th>
              <th style={{ padding: '8px 6px' }}>Sell Rate</th>
              <th style={{ padding: '8px 6px' }}>Cost Rate</th>
              <th style={{ padding: '8px 6px' }}>Profit/$</th>
              <th style={{ padding: '8px 6px' }}>Active</th>
              <th style={{ padding: '8px 6px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: 20, textAlign: 'center' }}>Loading...</td></tr>
            ) : cards.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 6px', fontWeight: 500 }}>{c.name}</td>
                <td style={{ padding: '8px 6px' }}>{c.currency}</td>
                <td style={{ padding: '8px 6px' }}>{c.minAmount} - {c.maxAmount}</td>
                <td style={{ padding: '8px 6px', fontWeight: 600 }}>₦{c.rate.toLocaleString()}</td>
                <td style={{ padding: '8px 6px' }}>₦{c.cost_rate.toLocaleString()}</td>
                <td style={{ padding: '8px 6px', color: '#10B981', fontWeight: 600 }}>₦{(c.rate - c.cost_rate).toLocaleString()}</td>
                <td style={{ padding: '8px 6px' }}>
                  <button className={`btn-sm ${c.active ? 'btn-success' : 'btn-danger'}`} onClick={() => saveCard(c.id, { active: !c.active })}>{c.active ? 'On' : 'Off'}</button>
                </td>
                <td style={{ padding: '8px 6px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-sm" onClick={() => { setEditing(c.id); setForm(c); }}>Edit</button>
                    <button className="btn-sm btn-danger" onClick={() => deleteCard(c.id)}>Del</button>
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
