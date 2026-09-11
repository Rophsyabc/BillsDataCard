import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { validatePhoneNetwork } from '../utils/phoneValidation';

const categories = [
  { id: 'hot_deals', label: 'Hot Deals' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'always_on', label: 'Always On' },
  { id: 'mega', label: 'Mega Plan' },
  { id: 'social', label: 'Social Plan' },
  { id: 'night', label: 'Night Plan' },
  { id: 'router', label: 'Router Plan' },
  { id: 'youtube', label: 'YouTube' },
];

export default function Data() {
  const navigate = useNavigate();
  const { balance, refreshBalance } = useApp();
  const [networks, setNetworks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('hot_deals');
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
      }).catch(() => setPlansLoading(false));
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

  const selectedNetworkObj = networks.find((n) => n.id === selectedNetwork);

  const handleNetworkCycle = () => {
    if (networks.length === 0) return;
    const currentIdx = networks.findIndex((n) => n.id === selectedNetwork);
    const nextIdx = (currentIdx + 1) % networks.length;
    setSelectedNetwork(networks[nextIdx].id);
  };

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
    if (plan && plan.price > balance) {
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
      <div className="data-page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2>Buy Data</h2>
        <a href="/history" className="history-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </a>
      </div>

      {result && (
        <div className={`data-result-card ${result.success ? 'success' : 'error'}`}>
          <p>{result.message}</p>
          {result.data && (
            <div className="data-result-details">
              <p><strong>Reference:</strong> {result.data.reference}</p>
              <p><strong>Network:</strong> {result.data.network}</p>
              <p><strong>Plan:</strong> {result.data.plan}</p>
              <p><strong>Phone:</strong> {result.data.phone}</p>
              <p><strong>Amount:</strong> ₦{result.data.amount.toLocaleString()}</p>
            </div>
          )}
          <button className="data-dismiss-btn" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="data-phone-card">
          <div className="data-phone-inner">
            <button
              type="button"
              className="data-network-select"
              onClick={handleNetworkCycle}
            >
              {selectedNetworkObj ? (
                <>
                  <img src={selectedNetworkObj.logo} alt={selectedNetworkObj.name} />
                  <span>{selectedNetworkObj.name}</span>
                </>
              ) : (
                <span>Select Network</span>
              )}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            <div className="data-phone-input">
              <input
                type="tel"
                placeholder={selectedNetwork === 'smile' ? 'Enter Smile number' : 'e.g. 08031234567'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={11}
              />
              <span className="data-phone-char-count">{phone.length}/11</span>
            </div>

            <button type="button" className="data-contacts-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>
          </div>
          {phoneError && <p className="data-field-error">{phoneError}</p>}
        </div>

        <button type="button" className="data-recent-btn">
          <div className="recent-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span>Buy for recent beneficiaries</span>
          <span className="recent-arrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </span>
        </button>

        {selectedNetwork && (
          <>
            <p className="data-select-label">Select a data plan</p>

            <div className="data-category-scroll">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`data-category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedPlan(''); }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {plansLoading ? (
              <div className="data-plans-loading">Loading plans...</div>
            ) : filteredPlans.length === 0 ? (
              <div className="data-plans-empty">No plans available in this category</div>
            ) : (
              <div className="data-plans-grid">
                {filteredPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className={`data-plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.cashback && (
                      <span className="data-plan-cashback">₦{plan.cashback} cashback</span>
                    )}
                    <span className="data-plan-size">{plan.size}</span>
                    <span className="data-plan-price">₦{plan.price.toLocaleString()}</span>
                    <span className="data-plan-validity">{plan.validity} validity</span>
                    {plan.description && (
                      <span className="data-plan-desc">{plan.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <button
          type="submit"
          className="data-buy-btn"
          disabled={loading || !selectedNetwork || !selectedPlan || !phone}
        >
          {loading ? 'Processing...' : 'Buy Data'}
        </button>
      </form>
    </div>
  );
}
