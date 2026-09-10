import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';

export default function Betting() {
  const { balance, refreshBalance } = useApp();
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const quickAmounts = [500, 1000, 2000, 3000, 5000, 10000, 20000];

  useEffect(() => {
    api.getBettingPlatforms().then((res) => setPlatforms(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await api.fundBetting({
      platform: selectedPlatform,
      userId,
      amount: parseInt(amount),
    });
    setResult(res);
    if (res.success) refreshBalance();
    setLoading(false);
  };

  const selectedPlatformData = platforms.find((p) => p.id === selectedPlatform);

  return (
    <div className="page">
      <h2>Betting Fund</h2>
      <p className="subtitle">Fund your betting accounts instantly</p>

      <div className="wallet-balance-card compact">
        <span className="wb-label">Wallet Balance</span>
        <span className="wb-amount">₦{balance.toLocaleString()}</span>
      </div>

      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
          <p>{result.message}</p>
          {result.data && (
            <div className="result-details">
              <p><strong>Reference:</strong> {result.data.reference}</p>
              <p><strong>Platform:</strong> {result.data.platform}</p>
              <p><strong>User ID:</strong> {result.data.userId}</p>
              <p><strong>Amount:</strong> ₦{result.data.amount.toLocaleString()}</p>
            </div>
          )}
          <button className="btn-close" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label>Select Betting Platform</label>
          <div className="provider-grid">
            {platforms.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`provider-btn ${selectedPlatform === p.id ? 'selected' : ''}`}
                style={{ '--provider-color': p.color }}
                onClick={() => setSelectedPlatform(p.id)}
              >
                <img src={p.logo} alt={p.name} className="provider-logo-img" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{selectedPlatformData?.name || 'Betting'} User ID</label>
          <input
            type="text"
            placeholder={`Enter your ${selectedPlatformData?.name || 'betting'} user ID`}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Amount (₦)</label>
          <div className="amount-grid">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                className={`amount-btn ${amount === String(amt) ? 'selected' : ''}`}
                onClick={() => setAmount(String(amt))}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Or enter custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="100"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading || !selectedPlatform || !userId || !amount}>
          {loading ? 'Processing...' : `Fund ${selectedPlatformData?.name || 'Account'}`}
        </button>
      </form>
    </div>
  );
}
