import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/api';

export default function TransactionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      const res = await api.getReceipt(id);
      if (res.success) {
        setTransaction(res.data);
      } else {
        setError(res.message);
      }
      setLoading(false);
    };
    fetchTransaction();
  }, [id]);

  const getTypeIcon = (type) => {
    const icons = {
      Airtime: '📱',
      Data: '📶',
      Electricity: '⚡',
      TV: '📺',
      'Gift Card': '🎁',
      Betting: '⚽',
      Wallet: '💰',
      Transfer: '💸',
    };
    return icons[type] || '📋';
  };

  const getStatusColor = (status) => {
    const colors = {
      success: '#10B981',
      pending: '#F59E0B',
      failed: '#EF4444',
    };
    return colors[status] || '#64748B';
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading transaction details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-primary" style={{ maxWidth: '200px' }}>
          Go Back
        </button>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="page">
        <div className="empty-state">Transaction not found</div>
      </div>
    );
  }

  return (
    <div className="page">
      <button onClick={() => navigate(-1)} className="back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        Back
      </button>

      <div className="txn-details-card">
        <div className="txn-details-header">
          <div className="txn-type-icon" style={{ background: getStatusColor(transaction.status) + '15' }}>
            {getTypeIcon(transaction.type)}
          </div>
          <div className="txn-header-info">
            <h2>{transaction.type} Purchase</h2>
            <p className="txn-service-name">{transaction.service}</p>
          </div>
          <div className="txn-status-badge" style={{ background: getStatusColor(transaction.status) + '15', color: getStatusColor(transaction.status) }}>
            {transaction.status === 'success' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
            {transaction.status === 'pending' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            )}
            {transaction.status === 'failed' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
            <span>{transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}</span>
          </div>
        </div>

        <div className="txn-amount-display">
          <span className="txn-amount-label">Amount</span>
          <span className="txn-amount-value">₦{transaction.amount?.toLocaleString()}</span>
        </div>

        <div className="txn-details-body">
          <div className="txn-detail-row">
            <span className="txn-detail-label">Transaction Reference</span>
            <span className="txn-detail-value mono">{transaction.id}</span>
          </div>
          <div className="txn-detail-row">
            <span className="txn-detail-label">Type</span>
            <span className="txn-detail-value">{transaction.type}</span>
          </div>
          <div className="txn-detail-row">
            <span className="txn-detail-label">Service</span>
            <span className="txn-detail-value">{transaction.service}</span>
          </div>
          {transaction.phone && (
            <div className="txn-detail-row">
              <span className="txn-detail-label">Phone Number</span>
              <span className="txn-detail-value">{transaction.phone}</span>
            </div>
          )}
          {transaction.meter && (
            <div className="txn-detail-row">
              <span className="txn-detail-label">Meter Number</span>
              <span className="txn-detail-value">{transaction.meter}</span>
            </div>
          )}
          {transaction.token && (
            <div className="txn-detail-row">
              <span className="txn-detail-label">Token</span>
              <span className="txn-detail-value mono token-display">{transaction.token}</span>
            </div>
          )}
          {transaction.iuc && (
            <div className="txn-detail-row">
              <span className="txn-detail-label">IUC Number</span>
              <span className="txn-detail-value">{transaction.iuc}</span>
            </div>
          )}
          {transaction.userId && (
            <div className="txn-detail-row">
              <span className="txn-detail-label">User ID</span>
              <span className="txn-detail-value">{transaction.userId}</span>
            </div>
          )}
          {transaction.note && (
            <div className="txn-detail-row">
              <span className="txn-detail-label">Note</span>
              <span className="txn-detail-value">{transaction.note}</span>
            </div>
          )}
          <div className="txn-detail-row">
            <span className="txn-detail-label">Date & Time</span>
            <span className="txn-detail-value">{transaction.date}</span>
          </div>
        </div>

        <div className="txn-details-footer">
          <Link to="/history" className="btn-secondary">
            View All Transactions
          </Link>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
