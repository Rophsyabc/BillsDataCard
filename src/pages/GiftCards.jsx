import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';

export default function GiftCards() {
  const { balance, refreshBalance } = useApp();
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getGiftCards().then((res) => setCards(res.data)).catch(() => {});
  }, []);

  const filteredCards = cards.filter((card) =>
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCardData = cards.find((c) => c.id === selectedCard);
  const totalCost = selectedCardData && amount ? parseInt(amount) * selectedCardData.rate : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (totalCost > balance) {
      setResult({ success: false, message: 'Insufficient wallet balance. Please fund your wallet.' });
      setLoading(false);
      return;
    }

    const res = await api.buyGiftCard({
      cardId: selectedCard,
      amount: parseInt(amount),
      email,
    });
    setResult(res);
    if (res.success) refreshBalance();
    setLoading(false);
  };

  return (
    <div className="page">
      <h2>Gift Cards</h2>
      <p className="subtitle">Purchase international gift cards at the best rates</p>

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
              <p><strong>Card:</strong> {result.data.card}</p>
              <p><strong>Amount:</strong> {result.data.amount} USD</p>
              <p><strong>Total Cost:</strong> ₦{result.data.totalCost.toLocaleString()}</p>
              <p><strong>Email:</strong> {result.data.email}</p>
            </div>
          )}
          <button className="btn-close" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      <div className="giftcard-search">
        <input
          type="text"
          placeholder="Search gift cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="giftcards-grid">
        {filteredCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`giftcard-item ${selectedCard === card.id ? 'selected' : ''}`}
            onClick={() => setSelectedCard(card.id)}
          >
            <img src={card.logo} alt={card.name} className="gc-logo-img" />
            <span className="gc-name">{card.name}</span>
            <span className="gc-rate">Rate: ₦{card.rate.toLocaleString()}/{card.currency}</span>
            <span className="gc-range">{card.currency} {card.minAmount} - {card.maxAmount}</span>
          </button>
        ))}
      </div>

      {selectedCard && (
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-group">
            <label>Card Amount ({selectedCardData?.currency})</label>
            <input
              type="number"
              placeholder={`Min: ${selectedCardData?.minAmount} - Max: ${selectedCardData?.maxAmount}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={selectedCardData?.minAmount}
              max={selectedCardData?.maxAmount}
              required
            />
          </div>

          <div className="form-group">
            <label>Delivery Email</label>
            <input
              type="email"
              placeholder="Email to receive gift card"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {amount && totalCost > 0 && (
            <div className="cost-summary">
              <div className="cost-row">
                <span>Card Value:</span>
                <span>{amount} {selectedCardData?.currency}</span>
              </div>
              <div className="cost-row">
                <span>Rate:</span>
                <span>₦{selectedCardData?.rate.toLocaleString()}/{selectedCardData?.currency}</span>
              </div>
              <div className="cost-row total">
                <span>Total Cost:</span>
                <span>₦{totalCost.toLocaleString()}</span>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || !selectedCard || !amount || !email}>
            {loading ? 'Processing...' : 'Buy Gift Card'}
          </button>
        </form>
      )}
    </div>
  );
}
