import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';

export default function TvSubscription() {
  const { balance, refreshBalance } = useApp();
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [iuc, setIuc] = useState('');
  const [loading, setLoading] = useState(false);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getTvProviders().then((res) => setProviders(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      setPkgLoading(true);
      setSelectedPackage('');
      api.getTvPackages(selectedProvider).then((res) => {
        setPackages(res.data);
        setPkgLoading(false);
      }).catch(() => setPkgLoading(false));
    } else {
      setPackages([]);
    }
  }, [selectedProvider]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const selectedPkg = packages.find((p) => p.id === selectedPackage);
    if (selectedPkg && selectedPkg.price > balance) {
      setResult({ success: false, message: 'Insufficient wallet balance. Please fund your wallet.' });
      setLoading(false);
      return;
    }

    const res = await api.buyTvSubscription({
      provider: selectedProvider,
      iuc,
      packageId: selectedPackage,
    });
    setResult(res);
    if (res.success) refreshBalance();
    setLoading(false);
  };

  const selectedProviderData = providers.find((p) => p.id === selectedProvider);

  return (
    <div className="page">
      <h2>TV Subscription</h2>
      <p className="subtitle">Subscribe to your TV cable provider</p>

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
              <p><strong>Provider:</strong> {result.data.provider}</p>
              <p><strong>Package:</strong> {result.data.package}</p>
              <p><strong>IUC Number:</strong> {result.data.iuc}</p>
              <p><strong>Amount:</strong> ₦{result.data.amount.toLocaleString()}</p>
            </div>
          )}
          <button className="btn-close" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label>Select Provider</label>
          <div className="provider-grid">
            {providers.map((prov) => (
              <button
                key={prov.id}
                type="button"
                className={`provider-btn ${selectedProvider === prov.id ? 'selected' : ''}`}
                style={{ '--provider-color': prov.color }}
                onClick={() => setSelectedProvider(prov.id)}
              >
                <img src={prov.logo} alt={prov.name} className="provider-logo-img" />
                <span>{prov.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{selectedProviderData?.name || 'TV'} IUC Number</label>
          <input
            type="text"
            placeholder={`Enter your ${selectedProviderData?.name || 'TV'} IUC number`}
            value={iuc}
            onChange={(e) => setIuc(e.target.value)}
            required
          />
        </div>

        {selectedProvider && (
          <div className="form-group">
            <label>Select Package</label>
            {pkgLoading ? (
              <div className="loading">Loading packages...</div>
            ) : (
              <div className="packages-grid">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    className={`package-card ${selectedPackage === pkg.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPackage(pkg.id)}
                  >
                    <span className="pkg-name">{pkg.name}</span>
                    <span className="pkg-price">₦{pkg.price.toLocaleString()}</span>
                    <span className="pkg-period">{pkg.period}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading || !selectedProvider || !selectedPackage || !iuc}>
          {loading ? 'Processing...' : 'Subscribe Now'}
        </button>
      </form>
    </div>
  );
}
