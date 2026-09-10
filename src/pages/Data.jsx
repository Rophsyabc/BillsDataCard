import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { validatePhoneNetwork } from '../utils/phoneValidation';

const categories = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'unlimited', label: 'Unlimited' },
];

export default function Data() {
  const { balance, refreshBalance } = useApp();
  const [networks, setNetworks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('monthly');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    api.getNetworks().then((res) => setNetworks(res.data));
  }, []);

  useEffect(() => {
    if (selectedNetwork) {
      setPlansLoading(true);
      setSelectedPlan('');
      api.getDataPlans(selectedNetwork).then((res) => {
        setPlans(res.data);
        setPlansLoading(false);
      });
    } else {
      setPlans([]);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    if (phone && selectedNetwork) {
      const validation = validatePhoneNetwork(phone, selectedNetwork);
      setPhoneError(validation.valid ? '' : validation.message);
    } else {
      setPhoneError('');
    }
  }, [phone, selectedNetwork]);

  const filteredPlans = plans.filter((p) => p.category === selectedCategory);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (phoneError) {
      setResult({ success: false, message: phoneError });
      setLoading(false);
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlan);
    if (plan.price > balance) {
      setResult({ success: false, message: 'Insufficient wallet balance. Please fund your wallet.' });
      setLoading(false);
      return;
    }
    const res = await api.buyData({ network: selectedNetwork, phone, plan });
    setResult(res);
    if (res.success) refreshBalance();
    setLoading(false);
  };

  return (
    <div className="page">
      <h2>Buy Data</h2>
      <p className="subtitle">Purchase data bundles for any network including Smile</p>

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
              <p><strong>Network:</strong> {result.data.network}</p>
              <p><strong>Plan:</strong> {result.data.plan}</p>
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

        {selectedNetwork && (
          <div className="form-group">
            <label>Select Plan</label>
            <div className="wallet-tabs" style={{ marginBottom: 16 }}>
              {categories.map((cat) => {
                const count = plans.filter((p) => p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`wallet-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => { setSelectedCategory(cat.id); setSelectedPlan(''); }}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
            {plansLoading ? (
              <div className="loading">Loading plans...</div>
            ) : filteredPlans.length === 0 ? (
              <div className="empty-state">No {selectedCategory} plans available</div>
            ) : (
              <div className="plans-grid">
                {filteredPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <span className="plan-size">{plan.size}</span>
                    <span className="plan-validity">{plan.validity}</span>
                    <span className="plan-price">₦{plan.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading || !selectedNetwork || !selectedPlan || !phone}>
          {loading ? 'Processing...' : 'Buy Data'}
        </button>
      </form>
    </div>
  );
}
