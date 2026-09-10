import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function AdminTransactions() {
  const [txns, setTxns] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('paybills_token');

  const fetchTxns = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`${API_BASE}/api/admin/transactions?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) { setTxns(data.data.transactions); setTotal(data.data.total); }
    setLoading(false);
  };

  useEffect(() => { fetchTxns(); }, [search, typeFilter, statusFilter]);

  const exportCSV = () => {
    const headers = ['ID', 'User', 'Type', 'Service', 'Amount', 'Status', 'Phone', 'Date'];
    const rows = txns.map((t) => [t.id, t.userName || t.userId, t.type, t.service, t.amount, t.status, t.phone || '', t.createdAt]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transactions-${Date.now()}.csv`; a.click();
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h2>Transactions</h2>
          <p className="subtitle">{total} total transactions</p>
        </div>
        <button className="btn-primary" onClick={exportCSV} style={{ whiteSpace: 'nowrap' }}>Export CSV</button>
      </div>

      <div className="form-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <option value="">All Types</option>
            <option value="Airtime">Airtime</option>
            <option value="Data">Data</option>
            <option value="Electricity">Electricity</option>
            <option value="TV Subscription">TV</option>
            <option value="Gift Card">Gift Card</option>
            <option value="Betting">Betting</option>
            <option value="Wallet Funding">Wallet</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="form-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 6px' }}>ID</th>
              <th style={{ padding: '10px 6px' }}>User</th>
              <th style={{ padding: '10px 6px' }}>Type</th>
              <th style={{ padding: '10px 6px' }}>Service</th>
              <th style={{ padding: '10px 6px' }}>Amount</th>
              <th style={{ padding: '10px 6px' }}>Status</th>
              <th style={{ padding: '10px 6px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center' }}>Loading...</td></tr>
            ) : txns.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center' }}>No transactions found</td></tr>
            ) : txns.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{t.id}</td>
                <td style={{ padding: '8px 6px' }}>{t.userName || t.userId}</td>
                <td style={{ padding: '8px 6px' }}><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)' }}>{t.type}</span></td>
                <td style={{ padding: '8px 6px' }}>{t.service}</td>
                <td style={{ padding: '8px 6px', fontWeight: 600 }}>₦{t.amount.toLocaleString()}</td>
                <td style={{ padding: '8px 6px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', background: t.status === 'success' ? 'rgba(16,185,129,0.1)' : t.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: t.status === 'success' ? '#10B981' : t.status === 'failed' ? '#EF4444' : '#F59E0B' }}>{t.status}</span>
                </td>
                <td style={{ padding: '8px 6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
