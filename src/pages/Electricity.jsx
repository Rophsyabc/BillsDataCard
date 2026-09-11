import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';

export default function Electricity() {
  const { balance, refreshBalance } = useApp();
  const [discos, setDiscos] = useState([]);
  const [selectedDisco, setSelectedDisco] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [meterInfo, setMeterInfo] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getElectricityDiscos().then((res) => setDiscos(res.data)).catch(() => {});
  }, []);

  const handleValidate = async () => {
    if (!selectedDisco || !meterNumber) return;
    setValidating(true);
    setMeterInfo(null);
    const res = await api.validateMeter({ disco: selectedDisco, meterNumber, meterType });
    if (res.success) {
      setMeterInfo(res.data);
    }
    setValidating(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (parseInt(amount) > balance) {
      setResult({ success: false, message: 'Insufficient wallet balance. Please fund your wallet.' });
      setLoading(false);
      return;
    }

    const res = await api.buyElectricity({
      disco: selectedDisco,
      meterNumber,
      meterType,
      amount: parseInt(amount),
    });
    setResult(res);
    if (res.success) refreshBalance();
    setLoading(false);
  };

  return (
    <div className="page">
      <h2>Pay Electricity Bill</h2>
      <p className="subtitle">Purchase electricity tokens for your meter</p>

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
              <p><strong>Disco:</strong> {result.data.disco}</p>
              <p><strong>Meter:</strong> {result.data.meterNumber}</p>
              <p><strong>Amount:</strong> ₦{result.data.amount.toLocaleString()}</p>
              <p className="token"><strong>Token:</strong> {result.data.token}</p>
            </div>
          )}
          <button className="btn-close" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label>Electricity Distribution Company</label>
          <select value={selectedDisco} onChange={(e) => { setSelectedDisco(e.target.value); setMeterInfo(null); }} required>
            <option value="">Select Disco</option>
            {discos.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Meter Number</label>
          <input
            type="text"
            placeholder="Enter meter number"
            value={meterNumber}
            onChange={(e) => { setMeterNumber(e.target.value); setMeterInfo(null); }}
            required
          />
        </div>

        <div className="form-group">
          <label>Meter Type</label>
          <div className="radio-group">
            <label className={`radio-label ${meterType === 'prepaid' ? 'selected' : ''}`}>
              <input type="radio" value="prepaid" checked={meterType === 'prepaid'} onChange={(e) => setMeterType(e.target.value)} />
              Prepaid
            </label>
            <label className={`radio-label ${meterType === 'postpaid' ? 'selected' : ''}`}>
              <input type="radio" value="postpaid" checked={meterType === 'postpaid'} onChange={(e) => setMeterType(e.target.value)} />
              Postpaid
            </label>
          </div>
        </div>

        {selectedDisco && meterNumber && !meterInfo && (
          <button type="button" className="btn-secondary" onClick={handleValidate} disabled={validating}>
            {validating ? 'Validating...' : 'Validate Meter'}
          </button>
        )}

        {meterInfo && (
          <div className="meter-info">
            <p><strong>Name:</strong> {meterInfo.name}</p>
            <p><strong>Address:</strong> {meterInfo.address}</p>
            <p><strong>Meter:</strong> {meterInfo.meterNumber}</p>
            <p className="info-note">Please confirm the details above are correct</p>
          </div>
        )}

        <div className="form-group">
          <label>Amount (₦)</label>
          <input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="500"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading || !selectedDisco || !meterNumber || !amount}>
          {loading ? 'Processing...' : 'Pay Electricity Bill'}
        </button>
      </form>
    </div>
  );
}
