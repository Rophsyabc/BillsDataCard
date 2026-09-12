import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { useKyc } from '../context/KycContext';
import ProfileAvatar from '../components/ProfileAvatar';

const serviceLinks = [
  { path: '/wallet', label: 'Transfer', color: '#6366F1', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
  )},
  { path: '/airtime', label: 'Airtime', color: '#0EA5E9', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
  )},
  { path: '/data', label: 'Data', color: '#10B981', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
  )},
  { path: '/betting', label: 'Betting', color: '#EF4444', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
  )},
  { path: '/electricity', label: 'Electricity', color: '#F59E0B', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  )},
  { path: '/tv', label: 'TV Sub', color: '#8B5CF6', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
  )},
  { path: '/gift-cards', label: 'Gift Cards', color: '#EC4899', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
  )},
  { path: '/receipt', label: 'Receipt', color: '#64748B', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  )},
];

const txnTypeIcons = {
  airtime: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  data: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  electricity: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  tv: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>,
  betting: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
  default: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>,
};

function getTxnIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('airtime')) return txnTypeIcons.airtime;
  if (t.includes('data')) return txnTypeIcons.data;
  if (t.includes('electric')) return txnTypeIcons.electricity;
  if (t.includes('tv')) return txnTypeIcons.tv;
  if (t.includes('bet')) return txnTypeIcons.betting;
  if (t.includes('wallet') || t.includes('fund')) return txnTypeIcons.wallet;
  return txnTypeIcons.default;
}

function getTxnColor(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('airtime')) return '#0EA5E9';
  if (t.includes('data')) return '#10B981';
  if (t.includes('electric')) return '#F59E0B';
  if (t.includes('tv')) return '#8B5CF6';
  if (t.includes('bet')) return '#EF4444';
  if (t.includes('wallet') || t.includes('fund')) return '#6366F1';
  return '#64748B';
}

function formatTxnDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const { balance, user } = useApp();
  const { openKyc } = useKyc();

  useEffect(() => {
    api.getTransactions().then((res) => {
      setTransactions(res.data.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const userName = user?.name || 'User';
  const userPhone = user?.phone || user?.id || '';

  return (
    <div className="dashboard">
      <div className="dash-greeting">
        <ProfileAvatar size={48} onClick={openKyc} />
        <div className="greeting-text">
          <span className="greeting-label">{getGreeting()},</span>
          <span className="greeting-name">{userName}</span>
        </div>
        <span className="greeting-badge">{user?.role || 'User'}</span>
      </div>

      <div className="balance-card">
        <div className="balance-header">
          <div className="balance-user-info">
            <span className="balance-phone">{userPhone}</span>
            <span className="balance-name">{userName}</span>
          </div>
          <button className="balance-toggle" onClick={() => setBalanceVisible((v) => !v)}>
            {balanceVisible ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
          </button>
        </div>

        <div className="balance-amount-row">
          {balanceVisible ? (
            <>
              <span className="balance-naira">₦</span>
              <span className="balance-value">{balance.toLocaleString()}</span>
            </>
          ) : (
            <span className="balance-hidden">••••••••</span>
          )}
        </div>

        <div className="balance-updated">Last updated just now</div>

        <div className="balance-actions">
          <Link to="/wallet" className="btn-add-money">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Money
          </Link>
          <Link to="/history" className="btn-history">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            History
          </Link>
        </div>
      </div>

      <div className="services-section">
        <div className="section-header-row">
          <span className="section-title">Services</span>
          <span className="section-edit">Edit</span>
        </div>
        <div className="services-grid">
          {serviceLinks.map((service) => (
            <Link key={service.path} to={service.path} className="service-card">
              <div className="service-icon-circle" style={{ background: service.color + '20' }}>
                {service.icon}
              </div>
              <span className="service-label">{service.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="rewards-section">
        <div className="section-header-row">
          <span className="section-title">Rewards</span>
        </div>
        <div className="rewards-grid">
          <div className="reward-card">
            <div className="reward-icon" style={{ background: 'rgba(0,201,167,0.15)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00C9A7">
                <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
              </svg>
            </div>
            <div className="reward-info">
              <span className="reward-title">Cashback</span>
              <span className="reward-subtitle">Earn on every bill</span>
            </div>
          </div>
          <div className="reward-card">
            <div className="reward-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#10B981">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="reward-info">
              <span className="reward-title">Referrals</span>
              <span className="reward-subtitle">Invite & earn</span>
            </div>
          </div>
        </div>
      </div>

      <div className="recent-section">
        <div className="section-header-row">
          <span className="section-title">Recent Transactions</span>
          <Link to="/history" className="section-edit">View All</Link>
        </div>
        {loading ? (
          <div className="loading-state">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">No transactions yet</div>
        ) : (
          <div className="transactions-list">
            {transactions.map((txn) => (
              <Link key={txn.id} to={`/transaction/${txn.id}`} className="txn-item">
                <div className="txn-icon" style={{ background: getTxnColor(txn.type) + '20', color: getTxnColor(txn.type) }}>
                  {getTxnIcon(txn.type)}
                </div>
                <div className="txn-info">
                  <span className="txn-name">{txn.service || txn.type}</span>
                  <span className="txn-date">{formatTxnDate(txn.date)}</span>
                  {txn.status === 'pending' && <span className="txn-status-badge status-pending">Pending</span>}
                  {txn.status === 'failed' && <span className="txn-status-badge status-failed">Failed</span>}
                </div>
                <span className={`txn-amount ${txn.status === 'success' ? 'txn-success' : txn.status === 'pending' ? 'txn-pending' : 'txn-failed'}`}>
                  ₦{txn.amount?.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
