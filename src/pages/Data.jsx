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
  const { balance, user, refreshBalance } = useApp();
  const [networks, setNetworks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('hot_deals');
  const [phone, setPhone] = useState('');
  const [plansLoading, setPlansLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [selectedBundle, setSelectedBundle] = useState(null);
  const [buying, setBuying] = useState(false);
  const [sheetResult, setSheetResult] = useState(null);

  useEffect(() => {
    api.getNetworks().then((res) => setNetworks(res.data));
  }, []);

  useEffect(() => {
    if (selectedNetwork) {
      setPlansLoading(true);
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

  const handleSelectBundle = (plan) => {
    if (!phone) {
      setPhoneError('Please enter a phone number first');
      return;
    }
    if (phoneError) return;
    setSheetResult(null);
    setSelectedBundle(plan);
  };

  const handlePay = async () => {
    if (!selectedBundle || !phone || buying) return;
    setBuying(true);
    setSheetResult(null);

    const res = await api.buyData({ network: selectedNetwork, phone, plan: selectedBundle });
    setSheetResult(res);
    if (res.success) refreshBalance();
    setBuying(false);
  };

  const handleCloseSheet = () => {
    setSelectedBundle(null);
    setSheetResult(null);
    setBuying(false);
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
                onClick={() => { setSelectedCategory(cat.id); }}
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
                  className="data-plan-card"
                  onClick={() => handleSelectBundle(plan)}
                >
                  {plan.cashback && (
                    <span className="data-plan-cashback">+₦{plan.cashback}</span>
                  )}
                  <span className="data-plan-size">{plan.size}</span>
                  <span className="data-plan-price">₦{plan.price.toLocaleString()}</span>
                  <span className="data-plan-validity">{plan.validity}</span>
                  {plan.description && (
                    <span className="data-plan-desc">{plan.description}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selectedBundle && (
        <div className="data-sheet-overlay" onClick={handleCloseSheet}>
          <div className="data-sheet" onClick={(e) => e.stopPropagation()}>
            {!sheetResult ? (
              <>
                <div className="data-sheet-header">
                  <h3>Data Bundle</h3>
                  <button className="data-sheet-close" onClick={handleCloseSheet}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <div className="data-sheet-plan">
                  <span className="data-sheet-plan-size">{selectedBundle.size}</span>
                  <span className="data-sheet-plan-price">₦{selectedBundle.price.toLocaleString()}</span>
                  {selectedBundle.cashback > 0 && (
                    <span className="data-sheet-plan-cashback">+₦{selectedBundle.cashback} cashback</span>
                  )}
                  <span className="data-sheet-plan-validity">{selectedBundle.validity}</span>
                  {selectedBundle.description && (
                    <span className="data-sheet-plan-desc">{selectedBundle.description}</span>
                  )}
                </div>

                <div className="data-sheet-divider" />

                <div className="data-sheet-info">
                  <div className="data-sheet-info-row">
                    <span className="data-sheet-info-label">Network</span>
                    <span className="data-sheet-info-value">
                      {selectedNetworkObj && (
                        <img src={selectedNetworkObj.logo} alt="" className="data-sheet-network-logo" />
                      )}
                      {selectedNetworkObj?.name || selectedNetwork}
                    </span>
                  </div>
                  <div className="data-sheet-info-row">
                    <span className="data-sheet-info-label">Phone Number</span>
                    <span className="data-sheet-info-value">{phone}</span>
                  </div>
                </div>

                <div className="data-sheet-divider" />

                <div className="data-sheet-info">
                  <div className="data-sheet-info-row">
                    <span className="data-sheet-info-label">Total debit</span>
                    <span className="data-sheet-info-amount">₦{selectedBundle.price.toLocaleString()}</span>
                  </div>
                  {selectedBundle.cashback > 0 && (
                    <div className="data-sheet-info-row">
                      <span className="data-sheet-info-label">Cashback earned</span>
                      <span className="data-sheet-info-cashback">₦{selectedBundle.cashback}</span>
                    </div>
                  )}
                </div>

                <div className="data-sheet-divider" />

                <div className="data-sheet-wallet">
                  <span className="data-sheet-wallet-label">Paying from</span>
                  <span className="data-sheet-wallet-name">{user?.name || 'Wallet'}</span>
                  <span className="data-sheet-wallet-balance">Balance: ₦{balance.toLocaleString()}</span>
                </div>

                {balance < selectedBundle.price && (
                  <div className="data-sheet-insufficient">
                    <p>Insufficient balance</p>
                    <p className="data-sheet-insufficient-detail">
                      You need ₦{selectedBundle.price.toLocaleString()} but your wallet has ₦{balance.toLocaleString()}.
                    </p>
                    <button className="data-sheet-fund-btn" onClick={() => { handleCloseSheet(); navigate('/wallet'); }}>
                      Fund Wallet
                    </button>
                  </div>
                )}

                <button
                  className="data-sheet-pay-btn"
                  disabled={buying || balance < selectedBundle.price}
                  onClick={handlePay}
                >
                  {buying ? 'Processing...' : `Pay ₦${selectedBundle.price.toLocaleString()}`}
                </button>
              </>
            ) : (
              <>
                {sheetResult.success ? (
                  <div className="data-sheet-result">
                    <div className="data-sheet-result-icon success">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <h3>Data Bundle Purchased</h3>
                    <p className="data-sheet-result-plan">{selectedBundle.size} &middot; {selectedBundle.validity}</p>

                    <div className="data-sheet-result-info">
                      <div className="data-sheet-info-row">
                        <span className="data-sheet-info-label">Network</span>
                        <span className="data-sheet-info-value">
                          {selectedNetworkObj && (
                            <img src={selectedNetworkObj.logo} alt="" className="data-sheet-network-logo" />
                          )}
                          {selectedNetworkObj?.name || selectedNetwork}
                        </span>
                      </div>
                      <div className="data-sheet-info-row">
                        <span className="data-sheet-info-label">Phone</span>
                        <span className="data-sheet-info-value">{phone}</span>
                      </div>
                      <div className="data-sheet-info-row">
                        <span className="data-sheet-info-label">Amount paid</span>
                        <span className="data-sheet-info-amount">₦{selectedBundle.price.toLocaleString()}</span>
                      </div>
                      {selectedBundle.cashback > 0 && (
                        <div className="data-sheet-info-row">
                          <span className="data-sheet-info-label">Cashback</span>
                          <span className="data-sheet-info-cashback">₦{selectedBundle.cashback}</span>
                        </div>
                      )}
                      {sheetResult.data?.reference && (
                        <div className="data-sheet-info-row">
                          <span className="data-sheet-info-label">Reference</span>
                          <span className="data-sheet-info-value data-sheet-ref">{sheetResult.data.reference}</span>
                        </div>
                      )}
                    </div>

                    <div className="data-sheet-result-actions">
                      <button className="data-sheet-done-btn" onClick={handleCloseSheet}>Done</button>
                      <button className="data-sheet-txn-btn" onClick={() => { handleCloseSheet(); navigate('/history'); }}>
                        View Transaction
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="data-sheet-result">
                    <div className="data-sheet-result-icon error">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <h3>Purchase Failed</h3>
                    <p className="data-sheet-result-error-msg">{sheetResult.message || 'Something went wrong. Please try again.'}</p>

                    <div className="data-sheet-result-actions">
                      <button className="data-sheet-retry-btn" onClick={() => setSheetResult(null)}>Try Again</button>
                      <button className="data-sheet-done-btn" onClick={handleCloseSheet}>Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
