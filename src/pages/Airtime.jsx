import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { validatePhoneNetwork } from '../utils/phoneValidation';

export default function Airtime() {
  const { balance, refreshBalance } = useApp();
  const [networks, setNetworks] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    api.getNetworks().then((res) => setNetworks(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedNetwork) {
      api.getAirtimeAmounts(selectedNetwork).then((res) => setAmounts(res.data)).catch(() => {});
    }
  }, [selectedNetwork]);

  useEffect(() => {
    if (phone && selectedNetwork && selectedNetwork !== 'smile') {
      const validation = validatePhoneNetwork(phone, selectedNetwork);
      setPhoneError(validation.valid ? '' : validation.message);
    } else {
      setPhoneError('');
    }
  }, [phone, selectedNetwork]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (phoneError) {
      setResult({ success: false, message: phoneError });
      setLoading(false);
      return;
    }

    const finalAmount = customAmount || amount;
    if (parseInt(finalAmount) > balance) {
      setResult({ success: false, message: 'Insufficient wallet balance. Please fund your wallet.' });
      setLoading(false);
      return;
    }
    let res;
    if (selectedNetwork === 'smile') {
      res = await api.buySmileAirtime({ phone, amount: parseInt(finalAmount) });
    } else {
      res = await api.buyAirtime({ network: selectedNetwork, phone, amount: parseInt(finalAmount) });
    }
    setResult(res);
    if (res.success) refreshBalance();
    setLoading(false);
  };

  return (
    <div className="page">
      <h2>Buy Airtime</h2>
      <p className="subtitle">Purchase airtime for any network including Smile</p>

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
              <p><strong>Network:</strong> {result.data.network || 'Smile'}</p>
              <p><strong>Phone:</strong> {result.data.phone}</p>
              <p><strong>Amount:</strong> ₦{result.data.amount.toLocaleString()}</p>
            </div>
          )}
          <button className="btn-close" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label>Select Network</label>
          <div className="network-grid">
            {networks.map((net) => (
              <button
                key={net.id}
                type="button"
                className={`network-btn ${selectedNetwork === net.id ? 'selected' : ''}`}
                style={{ '--network-color': net.color }}
                onClick={() => setSelectedNetwork(net.id)}
              >
                <img src={net.logo} alt={net.name} className="network-logo-img" />
                <span>{net.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            placeholder={selectedNetwork === 'smile' ? 'Enter Smile number' : 'e.g. 08031234567'}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            maxLength={11}
            className={phoneError ? 'input-error' : ''}
          />
          {phoneError && <span className="field-error">{phoneError}</span>}
        </div>

        <div className="form-group">
          <label>Amount</label>
          <div className="amount-grid">
            {amounts.map((amt) => (
              <button
                key={amt}
                type="button"
                className={`amount-btn ${amount === amt && !customAmount ? 'selected' : ''}`}
                onClick={() => { setAmount(amt); setCustomAmount(''); }}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Or enter custom amount"
            value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); setAmount(''); }}
            min="50"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading || !selectedNetwork || !phone}>
          {loading ? 'Processing...' : 'Buy Airtime'}
        </button>
      </form>
    </div>
  );
}
