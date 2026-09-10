import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';

const serviceLinks = [
  { path: '/wallet', label: 'Fund Wallet', icon: '💰', color: '#7C3AED' },
  { path: '/airtime', label: 'Airtime', icon: '📱', color: '#4F46E5' },
  { path: '/data', label: 'Data', icon: '📶', color: '#0EA5E9' },
  { path: '/electricity', label: 'Electricity', icon: '⚡', color: '#F59E0B' },
  { path: '/tv', label: 'TV Subscription', icon: '📺', color: '#10B981' },
  { path: '/gift-cards', label: 'Gift Cards', icon: '🎁', color: '#EC4899' },
  { path: '/betting', label: 'Betting Fund', icon: '⚽', color: '#EF4444' },
  { path: '/receipt', label: 'Receipt', icon: '🧾', color: '#6366F1' },
];

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { balance } = useApp();

  useEffect(() => {
    api.getTransactions().then((res) => {
      setTransactions(res.data.slice(0, 5));
      setLoading(false);
    });
  }, []);

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-info">
            <span className="stat-label">Wallet Balance</span>
            <span className="stat-value">₦{balance.toLocaleString()}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-info">
            <span className="stat-label">Total Transactions</span>
            <span className="stat-value">{transactions.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-info">
            <span className="stat-label">Successful</span>
            <span className="stat-value">{transactions.filter((t) => t.status === 'success').length}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏳</span>
          <div className="stat-info">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{transactions.filter((t) => t.status === 'pending').length}</span>
          </div>
        </div>
      </div>

      <div className="services-grid">
        {serviceLinks.map((service) => (
          <Link key={service.path} to={service.path} className="service-card" style={{ borderTopColor: service.color }}>
            <span className="service-icon" style={{ background: service.color + '20', color: service.color }}>
              {service.icon}
            </span>
            <span className="service-label">{service.label}</span>
          </Link>
        ))}
      </div>

      <div className="recent-section">
        <div className="section-header">
          <h3>Recent Transactions</h3>
          <Link to="/history" className="view-all">View All →</Link>
        </div>
        {loading ? (
          <div className="loading">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">No transactions yet</div>
        ) : (
          <div className="transactions-table">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="ref">
                      <Link to={`/transaction/${txn.id}`} className="txn-link">{txn.id}</Link>
                    </td>
                    <td>
                      <span className="type-badge">{txn.type}</span>
                    </td>
                    <td>{txn.service}</td>
                    <td className="amount">₦{txn.amount.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${txn.status}`}>{txn.status}</span>
                    </td>
                    <td className="date">{txn.date?.replace('T', ' ').slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
