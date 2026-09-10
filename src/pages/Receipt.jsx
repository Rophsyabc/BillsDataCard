import { useState } from 'react';
import { api } from '../api/api';

export default function Receipt() {
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReceipt(null);
    const res = await api.getReceipt(ref);
    if (res.success) {
      setReceipt(res.data);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <h2>Transaction Receipt</h2>
      <p className="subtitle">Look up any transaction by reference number</p>

      <form onSubmit={handleSearch} className="form-card">
        <div className="form-group">
          <label>Transaction Reference</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="e.g. AIR1234567890"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 24px' }} disabled={loading || !ref}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      )}

      {receipt && (
        <div className="receipt-card">
          <div className="receipt-header">
            <h3>Transaction Receipt</h3>
            <span className={`status-badge status-${receipt.status}`}>{receipt.status}</span>
          </div>
          <div className="receipt-body">
            <div className="receipt-row">
              <span>Reference</span>
              <span className="receipt-value mono">{receipt.id}</span>
            </div>
            <div className="receipt-row">
              <span>Type</span>
              <span className="receipt-value">{receipt.type}</span>
            </div>
            <div className="receipt-row">
              <span>Service</span>
              <span className="receipt-value">{receipt.service}</span>
            </div>
            {receipt.phone && (
              <div className="receipt-row">
                <span>Phone</span>
                <span className="receipt-value">{receipt.phone}</span>
              </div>
            )}
            {receipt.meter && (
              <div className="receipt-row">
                <span>Meter Number</span>
                <span className="receipt-value">{receipt.meter}</span>
              </div>
            )}
            {receipt.token && (
              <div className="receipt-row">
                <span>Token</span>
                <span className="receipt-value mono">{receipt.token}</span>
              </div>
            )}
            {receipt.iuc && (
              <div className="receipt-row">
                <span>IUC Number</span>
                <span className="receipt-value">{receipt.iuc}</span>
              </div>
            )}
            {receipt.userId && (
              <div className="receipt-row">
                <span>User ID</span>
                <span className="receipt-value">{receipt.userId}</span>
              </div>
            )}
            <div className="receipt-row highlight">
              <span>Amount</span>
              <span className="receipt-value">₦{receipt.amount?.toLocaleString()}</span>
            </div>
            <div className="receipt-row">
              <span>Date</span>
              <span className="receipt-value">{receipt.date}</span>
            </div>
          </div>
          <div className="receipt-footer">
            <p>Thank you for using PayBills</p>
          </div>
        </div>
      )}
    </div>
  );
}
