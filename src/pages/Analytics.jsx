import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Analytics() {
  const { token } = useApp();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/analytics/summary?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch {}
    setLoading(false);
  };

  if (loading) return <div className="page"><h2>Analytics</h2><p className="subtitle">Loading...</p></div>;
  if (!data) return <div className="page"><h2>Analytics</h2><p className="subtitle">Failed to load</p></div>;

  const maxSpent = Math.max(...(data.byType.map(t => t.total) || [1]));

  return (
    <div className="page">
      <h2>Spending Analytics</h2>
      <p className="subtitle">Track your spending patterns</p>

      <div className="wallet-tabs" style={{ marginBottom: 24 }}>
        {[{ v: '7', l: '7 Days' }, { v: '30', l: '30 Days' }, { v: '90', l: '90 Days' }, { v: '365', l: '1 Year' }].map(p => (
          <button key={p.v} className={`wallet-tab ${period === p.v ? 'active' : ''}`} onClick={() => setPeriod(p.v)}>{p.l}</button>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="stat-card" style={{ background: 'var(--primary-gradient)', color: '#fff' }}>
          <span className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Spent</span>
          <span className="stat-amount" style={{ color: '#fff' }}>₦{data.totalSpent.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Transactions</span>
          <span className="stat-amount">{data.totalTransactions}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Wallet Balance</span>
          <span className="stat-amount" style={{ color: 'var(--success)' }}>₦{data.balance.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg/Transaction</span>
          <span className="stat-amount">₦{data.totalTransactions ? Math.round(data.totalSpent / data.totalTransactions).toLocaleString() : 0}</span>
        </div>
      </div>

      {data.byType.length > 0 && (
        <div className="form-card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Spending by Category</h3>
          {data.byType.map((item) => (
            <div key={item.type} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.9rem' }}>
                <span>{item.type}</span>
                <span style={{ fontWeight: 600 }}>₦{item.total.toLocaleString()} ({item.count})</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(item.total / maxSpent) * 100}%`, background: 'var(--primary-gradient)', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {data.byDay.length > 0 && (
        <div className="form-card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Daily Spending</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150, padding: '0 8px' }}>
            {data.byDay.map((day) => {
              const maxDay = Math.max(...data.byDay.map(d => d.total));
              const height = maxDay > 0 ? (day.total / maxDay) * 100 : 0;
              return (
                <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>₦{day.total >= 1000 ? `${(day.total / 1000).toFixed(0)}k` : day.total}</span>
                  <div style={{ width: '100%', height: `${height}%`, minHeight: 4, background: 'var(--primary-gradient)', borderRadius: 4, transition: 'height 0.5s' }} />
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{new Date(day.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.byService.length > 0 && (
        <div className="form-card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Top Services</h3>
          {data.byService.map((s, i) => (
            <div key={s.service} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < data.byService.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{s.service}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.count} transactions</div>
              </div>
              <div style={{ fontWeight: 600 }}>₦{s.total.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
