import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useApp } from '../context/AppContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useApp();

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .catch((e) => console.error('Failed to load admin stats:', e))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <AdminLayout><h2>Dashboard</h2><p>Loading...</p></AdminLayout>;
  if (!stats) return <AdminLayout><h2>Dashboard</h2><p>Failed to load stats</p></AdminLayout>;

  return (
    <AdminLayout>
      <h2>Dashboard</h2>
      <p className="subtitle">Platform overview and analytics</p>

      <div className="stat-cards" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6C63FF, #4F46E5)', color: '#fff' }}>
          <span className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Users</span>
          <span className="stat-amount" style={{ color: '#fff' }}>{stats.users.total}</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>+{stats.users.today} today</span>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff' }}>
          <span className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Revenue</span>
          <span className="stat-amount" style={{ color: '#fff' }}>₦{stats.revenue.total.toLocaleString()}</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>+₦{stats.revenue.today.toLocaleString()} today</span>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
          <span className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Profit</span>
          <span className="stat-amount" style={{ color: '#fff' }}>₦{stats.revenue.profit.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Transactions</span>
          <span className="stat-amount">{stats.transactions.total}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{stats.transactions.today} today</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Wallet Balance</span>
          <span className="stat-amount">₦{stats.walletBalance.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Success Rate</span>
          <span className="stat-amount">{stats.transactions.total ? Math.round((stats.transactions.success / stats.transactions.total) * 100) : 0}%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="form-card">
          <h3 style={{ marginBottom: 16 }}>Revenue by Type</h3>
          {stats.revenueByType.map((item) => (
            <div key={item.type} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.9rem' }}>
                <span>{item.type}</span>
                <span style={{ fontWeight: 600 }}>₦{item.total.toLocaleString()} ({item.count})</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(item.total / Math.max(...stats.revenueByType.map((t) => t.total))) * 100}%`, background: 'var(--primary-gradient)', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="form-card">
          <h3 style={{ marginBottom: 16 }}>Top Users</h3>
          {stats.topUsers.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < stats.topUsers.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{u.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.txnCount} transactions</div>
              </div>
              <div style={{ fontWeight: 600 }}>₦{u.totalSpent.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
