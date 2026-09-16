import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Rewards() {
  const { token } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/rewards/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) {
      console.error('Failed to fetch rewards:', err);
    }
    setLoading(false);
  };

  const copyReferralCode = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <h2>Rewards</h2>
        <p className="subtitle">Loading your rewards...</p>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <h2>Rewards</h2>
        <p className="subtitle">Failed to load rewards data</p>
        <div className="empty-state">
          <p>Unable to load rewards. Please try again.</p>
          <button className="btn-primary" style={{ maxWidth: 200, marginTop: 16 }} onClick={fetchRewards}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Rewards</h2>
      <p className="subtitle">Track your cashback and referral earnings</p>

      <div className="analytics-grid">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff' }}>
          <span className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Cashback</span>
          <span className="stat-amount" style={{ color: '#fff' }}>₦{(data.totalCashback || 0).toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Referral Earnings</span>
          <span className="stat-amount" style={{ color: '#10B981' }}>₦{(data.referralEarnings || 0).toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Referrals</span>
          <span className="stat-amount">{data.referralCount || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Earned</span>
          <span className="stat-amount" style={{ color: 'var(--primary)' }}>₦{((data.totalCashback || 0) + (data.referralEarnings || 0)).toLocaleString()}</span>
        </div>
      </div>

      <div className="form-card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Referral Program</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
          Invite friends and earn rewards when they make their first purchase.
        </p>
        {data.referralCode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              flex: 1,
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              fontWeight: 700,
              letterSpacing: 1,
              color: 'var(--primary)',
            }}>
              {data.referralCode}
            </div>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '12px 20px', marginBottom: 0 }}
              onClick={copyReferralCode}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
        <Link to="/profile" className="btn-secondary" style={{ textAlign: 'center' }}>
          View Referral Details
        </Link>
      </div>

      {data.recentCashback && data.recentCashback.length > 0 && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Recent Cashback</h3>
          {data.recentCashback.map((txn) => (
            <div key={txn.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{txn.service}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(txn.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <span style={{ fontWeight: 700, color: '#10B981' }}>+₦{txn.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {data.recentReferralEarnings && data.recentReferralEarnings.length > 0 && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Referral Earnings</h3>
          {data.recentReferralEarnings.map((txn) => (
            <div key={txn.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Referral Reward</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(txn.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <span style={{ fontWeight: 700, color: '#10B981' }}>+₦{txn.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {(!data.recentCashback || data.recentCashback.length === 0) && (!data.recentReferralEarnings || data.recentReferralEarnings.length === 0) && (
        <div className="form-card">
          <h3 style={{ marginBottom: 12 }}>How to Earn</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#10B981', fontWeight: 700 }}>1</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Buy Bills</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Earn cashback on every airtime, data, electricity, and TV subscription purchase.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)', fontWeight: 700 }}>2</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Refer Friends</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Share your referral code and earn when friends make their first purchase.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
