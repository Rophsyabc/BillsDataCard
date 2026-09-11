import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Wallet() {
  const { balance, refreshBalance, user, token } = useApp();
  const [activeTab, setActiveTab] = useState('fund');
  const [fundAmount, setFundAmount] = useState('');
  const [fundMethod, setFundMethod] = useState('card');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000, 50000];

  const handleFund = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setBankDetails(null);

    const amount = parseInt(fundAmount);
    if (fundMethod === 'bank_transfer') {
      // Get bank transfer details
      try {
        const res = await fetch(`${API_BASE}/api/payment/bank-transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ amount, email: user?.email }),
        });
        const data = await res.json();
        if (data.success) {
          setBankDetails(data.data);
          setResult({ success: true, message: 'Bank transfer details generated. Transfer the exact amount.' });
        } else {
          setResult({ success: false, message: data.message || 'Failed to get bank details' });
        }
      } catch {
        setResult({ success: false, message: 'Network error' });
      }
    } else if (fundMethod === 'card' || fundMethod === 'ussd') {
      // Initialize Paystack payment
      try {
        const res = await fetch(`${API_BASE}/api/payment/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            amount,
            email: user?.email || 'user@paybills.com',
            method: fundMethod,
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.data.authorization_url) {
            // Redirect to Paystack
            window.location.href = data.data.authorization_url;
          } else {
            // Mock mode
            const fundRes = await api.fundWallet({ amount, method: fundMethod });
            setResult(fundRes);
            if (fundRes.success) refreshBalance();
          }
        } else {
          setResult({ success: false, message: data.message || 'Payment failed' });
        }
      } catch {
        // Fallback to mock
        const fundRes = await api.fundWallet({ amount, method: fundMethod });
        setResult(fundRes);
        if (fundRes.success) refreshBalance();
      }
    } else {
      const res = await api.fundWallet({ amount, method: fundMethod });
      setResult(res);
      if (res.success) refreshBalance();
    }
    setLoading(false);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (parseInt(transferAmount) > balance) {
      setResult({ success: false, message: 'Insufficient wallet balance.' });
      setLoading(false);
      return;
    }

    const res = await api.transferWallet({
      recipient: transferRecipient,
      amount: parseInt(transferAmount),
      note: transferNote,
    });
    setResult(res);
    if (res.success) refreshBalance();
    setLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="page">
      <h2>My Wallet</h2>
      <p className="subtitle">Manage your wallet balance</p>

      <div className="wallet-balance-card">
        <span className="wb-label">Available Balance</span>
        <span className="wb-amount">₦{balance.toLocaleString()}</span>
      </div>

      <div className="wallet-tabs">
        <button
          className={`wallet-tab ${activeTab === 'fund' ? 'active' : ''}`}
          onClick={() => { setActiveTab('fund'); setResult(null); setBankDetails(null); }}
        >
          Fund Wallet
        </button>
        <button
          className={`wallet-tab ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => { setActiveTab('transfer'); setResult(null); }}
        >
          Transfer
        </button>
      </div>

      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
          <p>{result.message}</p>
          {result.data?.reference && <p><strong>Reference:</strong> {result.data.reference}</p>}
          {result.data?.balance && <p><strong>New Balance:</strong> ₦{result.data.balance.toLocaleString()}</p>}
          <button className="btn-close" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      {activeTab === 'fund' && (
        <form onSubmit={handleFund} className="form-card">
          <div className="form-group">
            <label>Funding Method</label>
            <div className="payment-methods">
              <button
                type="button"
                className={`payment-method-btn ${fundMethod === 'card' ? 'selected' : ''}`}
                onClick={() => setFundMethod('card')}
              >
                <span className="pm-icon">💳</span>
                <span className="pm-label">Debit Card</span>
                <span className="pm-desc">Pay with Paystack</span>
              </button>
              <button
                type="button"
                className={`payment-method-btn ${fundMethod === 'bank_transfer' ? 'selected' : ''}`}
                onClick={() => setFundMethod('bank_transfer')}
              >
                <span className="pm-icon">🏦</span>
                <span className="pm-label">Bank Transfer</span>
                <span className="pm-desc">Transfer to bank account</span>
              </button>
              <button
                type="button"
                className={`payment-method-btn ${fundMethod === 'ussd' ? 'selected' : ''}`}
                onClick={() => setFundMethod('ussd')}
              >
                <span className="pm-icon">📱</span>
                <span className="pm-label">USSD</span>
                <span className="pm-desc">Pay via USSD code</span>
              </button>
            </div>
          </div>

          {fundMethod === 'bank_transfer' && bankDetails && (
            <div className="bank-transfer-details">
              <h4>Transfer to this account</h4>
              <div className="bank-info">
                <div className="bank-row">
                  <span>Bank:</span>
                  <strong>{bankDetails.bankName}</strong>
                </div>
                <div className="bank-row">
                  <span>Account Number:</span>
                  <strong className="account-number">{bankDetails.accountNumber}</strong>
                  <button type="button" className="btn-copy" onClick={() => copyToClipboard(bankDetails.accountNumber)}>
                    Copy
                  </button>
                </div>
                <div className="bank-row">
                  <span>Account Name:</span>
                  <strong>{bankDetails.accountName}</strong>
                </div>
                <div className="bank-row">
                  <span>Amount:</span>
                  <strong className="amount">₦{bankDetails.amount.toLocaleString()}</strong>
                </div>
                <div className="bank-row">
                  <span>Reference:</span>
                  <strong>{bankDetails.reference}</strong>
                </div>
              </div>
              <p className="bank-note">Transfer the exact amount. Your wallet will be credited automatically.</p>
            </div>
          )}

          <div className="form-group">
            <label>Amount</label>
            <div className="amount-grid">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`amount-btn ${fundAmount === String(amt) ? 'selected' : ''}`}
                  onClick={() => setFundAmount(String(amt))}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Or enter amount"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              min="100"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !fundAmount}>
            {loading ? 'Processing...' : fundMethod === 'bank_transfer' && bankDetails ? 'Generate New Details' : `Fund ₦${(parseInt(fundAmount) || 0).toLocaleString()}`}
          </button>
        </form>
      )}

      {activeTab === 'transfer' && (
        <form onSubmit={handleTransfer} className="form-card">
          <div className="form-group">
            <label>Recipient (Account/Email/Phone)</label>
            <input
              type="text"
              placeholder="Enter recipient details"
              value={transferRecipient}
              onChange={(e) => setTransferRecipient(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Amount (₦)</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              min="100"
              max={balance}
              required
            />
          </div>

          <div className="form-group">
            <label>Note (Optional)</label>
            <input
              type="text"
              placeholder="What's this for?"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !transferRecipient || !transferAmount}>
            {loading ? 'Processing...' : `Send ₦${(parseInt(transferAmount) || 0).toLocaleString()}`}
          </button>
        </form>
      )}
    </div>
  );
}
