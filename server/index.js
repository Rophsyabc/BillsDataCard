import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import * as reloadly from './services/reloadly.js';
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payment.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import { apiLimiter, paymentLimiter } from './middleware/rateLimit.js';
import db from './data/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ── Rate Limiting ──
app.use('/auth', apiLimiter);
app.use('/api/payment', paymentLimiter);

// ── Mount Routes ──
app.use('/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// ── In-memory data store ──
const networks = [
  { id: 'mtn', name: 'MTN' },
  { id: 'airtel', name: 'Airtel' },
  { id: 'glo', name: 'Glo' },
  { id: '9mobile', name: '9mobile' },
  { id: 'smile', name: 'Smile' },
];

// ── Health ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Wallet ──
app.get('/api/wallet', (req, res) => {
  const userId = req.query.userId || 'default';
  let wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(userId);
  if (!wallet) {
    db.prepare('INSERT INTO wallet (userId, balance) VALUES (?, 50000)').run(userId);
    wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(userId);
  }
  res.json({ success: true, data: wallet });
});

app.post('/api/wallet/fund', (req, res) => {
  const { amount, method, userId } = req.body;
  if (!amount || amount < 100) {
    return res.status(400).json({ success: false, message: 'Minimum funding is ₦100' });
  }
  const uid = userId || 'default';
  let wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  if (!wallet) {
    db.prepare('INSERT INTO wallet (userId, balance) VALUES (?, 0)').run(uid);
    wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  }
  const newBalance = wallet.balance + amount;
  db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, uid);
  const txnId = `FUND-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO transactions (id, userId, type, amount, method, status) VALUES (?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Wallet Funding', amount, method || 'Bank Transfer', 'success');
  res.json({ success: true, data: { transaction: { id: txnId, amount, method }, balance: newBalance } });
});

app.post('/api/wallet/transfer', (req, res) => {
  const { recipient, amount, note, userId } = req.body;
  if (!recipient || !amount) {
    return res.status(400).json({ success: false, message: 'Recipient and amount required' });
  }
  const uid = userId || 'default';
  const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  if (!wallet || amount > wallet.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  const newBalance = wallet.balance - amount;
  db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, uid);
  const txnId = `TRF-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO transactions (id, userId, type, service, amount, status) VALUES (?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Transfer', `Transfer to ${recipient}`, amount, 'success');
  res.json({ success: true, data: { transaction: { id: txnId, recipient, amount }, balance: newBalance } });
});

// ── Airtime ──
app.get('/api/airtime/networks', (_req, res) => {
  res.json({ success: true, data: networks });
});

app.post('/api/airtime/buy', (req, res) => {
  const { network, phone, amount, userId } = req.body;
  if (!network || !phone || !amount) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  const uid = userId || 'default';
  const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  if (!wallet || amount > wallet.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  const newBalance = wallet.balance - amount;
  db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, uid);
  const net = networks.find((n) => n.id === network);
  const txnId = `AIR-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO transactions (id, userId, type, service, phone, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Airtime', net?.name || network, phone, amount, 'success');
  res.json({ success: true, data: { transaction: { id: txnId, network, phone, amount, status: 'success' }, balance: newBalance } });
});

// ── Data ──
app.post('/api/data/buy', (req, res) => {
  const { network, phone, plan, userId } = req.body;
  if (!network || !phone || !plan) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  const uid = userId || 'default';
  const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  if (!wallet || plan.price > wallet.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  const newBalance = wallet.balance - plan.price;
  db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, uid);
  const net = networks.find((n) => n.id === network);
  const txnId = `DAT-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO transactions (id, userId, type, service, phone, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Data', `${net?.name} - ${plan.size || plan.name}`, phone, plan.price, 'success');
  res.json({ success: true, data: { transaction: { id: txnId, network, phone, plan: plan.name, amount: plan.price, status: 'success' }, balance: newBalance } });
});

// ── Electricity ──
app.post('/api/electricity/validate', (req, res) => {
  const { disco, meterNumber, meterType } = req.body;
  if (!disco || !meterNumber) {
    return res.status(400).json({ success: false, message: 'Disco and meter required' });
  }
  res.json({
    success: true,
    data: { name: 'John Doe', address: '123 Example Street, Lagos', meterNumber, meterType },
  });
});

app.post('/api/electricity/buy', (req, res) => {
  const { disco, meterNumber, meterType, amount, userId } = req.body;
  if (!disco || !meterNumber || !amount) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  const uid = userId || 'default';
  const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  if (!wallet || amount > wallet.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  const newBalance = wallet.balance - amount;
  db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, uid);
  const token = Math.floor(10000000000000000000 + Math.random() * 90000000000000000000).toString();
  const txnId = `ELEC-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO transactions (id, userId, type, service, meter, token, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Electricity', disco, meterNumber, token, amount, 'success');
  res.json({ success: true, data: { transaction: { id: txnId, disco, meterNumber, amount, token, status: 'success' }, token, balance: newBalance } });
});

// ── TV ──
app.post('/api/tv/subscribe', (req, res) => {
  const { provider, iuc, packageId, packageName, amount, userId } = req.body;
  if (!provider || !iuc || !packageId) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  const uid = userId || 'default';
  const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  if (!wallet || amount > wallet.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  const newBalance = wallet.balance - amount;
  db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, uid);
  const txnId = `TV-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO transactions (id, userId, type, service, iuc, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(txnId, uid, 'TV Subscription', `${provider} - ${packageName}`, iuc, amount, 'success');
  res.json({ success: true, data: { transaction: { id: txnId, provider, iuc, packageName, amount, status: 'success' }, balance: newBalance } });
});

// ── Gift Card ──
app.post('/api/giftcard/buy', (req, res) => {
  const { cardName, amount, email, totalCost, userId } = req.body;
  if (!cardName || !amount || !email) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  const uid = userId || 'default';
  const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  if (!wallet || totalCost > wallet.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  const newBalance = wallet.balance - totalCost;
  db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, uid);
  const txnId = `GC-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO transactions (id, userId, type, service, amount, status) VALUES (?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Gift Card', cardName, totalCost, 'success');
  res.json({ success: true, data: { transaction: { id: txnId, cardName, amount, email, totalCost, status: 'success' }, balance: newBalance } });
});

// ── Betting ──
app.post('/api/betting/fund', (req, res) => {
  const { platform, userId: betUserId, amount, userId } = req.body;
  if (!platform || !betUserId || !amount) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  const uid = userId || 'default';
  const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(uid);
  if (!wallet || amount > wallet.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  const newBalance = wallet.balance - amount;
  db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, uid);
  const txnId = `BET-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO transactions (id, userId, type, service, amount, status) VALUES (?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Betting', platform, amount, 'success');
  res.json({ success: true, data: { transaction: { id: txnId, platform, betUserId, amount, status: 'success' }, balance: newBalance } });
});

// ── Transactions ──
app.get('/api/transactions', (_req, res) => {
  const txns = db.prepare('SELECT * FROM transactions ORDER BY createdAt DESC LIMIT 50').all();
  res.json({ success: true, data: txns });
});

app.get('/api/transactions/:ref', (req, res) => {
  const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.ref);
  if (!txn) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: txn });
});

// ══════════════════════════════════════════════
// ── Reloadly API Proxy Routes ──
// ══════════════════════════════════════════════

// Reloadly config status
app.get('/api/reloadly/status', (_req, res) => {
  res.json({
    configured: reloadly.isConfigured(),
    environment: reloadly.getEnvironment(),
  });
});

// Countries
app.get('/api/reloadly/countries', async (_req, res) => {
  try {
    if (!reloadly.isConfigured()) {
      return res.json({ success: true, data: [], source: 'reloadly', note: 'Not configured' });
    }
    const data = await reloadly.getCountries();
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] getCountries error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

app.get('/api/reloadly/countries/:iso', async (req, res) => {
  try {
    const data = await reloadly.getCountryByISO(req.params.iso);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] getCountry error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

// Operators
app.get('/api/reloadly/operators', async (req, res) => {
  try {
    if (!reloadly.isConfigured()) {
      return res.json({ success: true, data: [], source: 'reloadly', note: 'Not configured' });
    }
    const data = await reloadly.getOperators(req.query);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] getOperators error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

app.get('/api/reloadly/operators/countries/:iso', async (req, res) => {
  try {
    if (!reloadly.isConfigured()) {
      return res.json({ success: true, data: [], source: 'reloadly', note: 'Not configured' });
    }
    const data = await reloadly.getOperatorsByCountry(req.params.iso);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] getOperatorsByCountry error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

app.get('/api/reloadly/operators/:id', async (req, res) => {
  try {
    const data = await reloadly.getOperatorById(req.params.id);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] getOperator error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

app.get('/api/reloadly/operators/detect/:phone/:countryCode', async (req, res) => {
  try {
    const data = await reloadly.autoDetectOperator(req.params.phone, req.params.countryCode);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] autoDetect error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

// Balance
app.get('/api/reloadly/balance', async (_req, res) => {
  try {
    if (!reloadly.isConfigured()) {
      return res.json({ success: false, message: 'Reloadly not configured' });
    }
    const data = await reloadly.getBalance();
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] getBalance error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

// Top-ups (synchronous)
app.post('/api/reloadly/topup', async (req, res) => {
  try {
    if (!reloadly.isConfigured()) {
      return res.status(503).json({ success: false, message: 'Reloadly not configured' });
    }

    const { operatorId, amount, phone, countryCode, customIdentifier, useLocalAmount } = req.body;
    if (!operatorId || !amount || !phone || !countryCode) {
      return res.status(400).json({ success: false, message: 'operatorId, amount, phone, countryCode required' });
    }

    if (amount > wallet.balance) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Generate custom identifier if not provided
    const ref = customIdentifier || `RLY-${uuidv4().slice(0, 8)}`;

    const result = await reloadly.makeTopup({
      operatorId,
      amount,
      phone,
      countryCode,
      customIdentifier: ref,
      useLocalAmount: useLocalAmount || false,
    });

    // Deduct from local wallet
    wallet.balance -= amount;

    // Store transaction locally
    const txn = addTxn({
      id: ref,
      type: 'Airtime',
      service: result.operatorName || `Operator ${operatorId}`,
      phone,
      amount,
      reloadlyTransactionId: result.transactionId,
      reloadlyStatus: result.status,
      deliveredAmount: result.deliveredAmount,
      deliveredCurrency: result.deliveredAmountCurrencyCode,
      discount: result.discount,
      fee: result.fee,
      status: result.status === 'SUCCESSFUL' ? 'success' : result.status === 'PENDING' ? 'pending' : 'failed',
      date: result.transactionDate || new Date().toISOString(),
      balanceAfter: wallet.balance,
    });

    res.json({ success: true, data: { transaction: txn, reloadly: result, balance: wallet.balance } });
  } catch (err) {
    console.error('[reloadly] topup error:', err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ success: false, message });
  }
});

// Top-ups (asynchronous)
app.post('/api/reloadly/topup-async', async (req, res) => {
  try {
    if (!reloadly.isConfigured()) {
      return res.status(503).json({ success: false, message: 'Reloadly not configured' });
    }

    const { operatorId, amount, phone, countryCode, customIdentifier, useLocalAmount } = req.body;
    if (!operatorId || !amount || !phone || !countryCode) {
      return res.status(400).json({ success: false, message: 'operatorId, amount, phone, countryCode required' });
    }

    if (amount > wallet.balance) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const ref = customIdentifier || `RLY-${uuidv4().slice(0, 8)}`;

    const result = await reloadly.makeAsyncTopup({
      operatorId,
      amount,
      phone,
      countryCode,
      customIdentifier: ref,
      useLocalAmount: useLocalAmount || false,
    });

    // Deduct from local wallet
    wallet.balance -= amount;

    // Store as pending
    const txn = addTxn({
      id: ref,
      type: 'Airtime',
      service: `Operator ${operatorId}`,
      phone,
      amount,
      reloadlyTransactionId: result.transactionId,
      reloadlyStatus: 'PENDING',
      status: 'pending',
      date: new Date().toISOString(),
      balanceAfter: wallet.balance,
    });

    res.json({ success: true, data: { transaction: txn, reloadly: result, balance: wallet.balance } });
  } catch (err) {
    console.error('[reloadly] topup-async error:', err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ success: false, message });
  }
});

// Top-up status
app.get('/api/reloadly/topup/status/:transactionId', async (req, res) => {
  try {
    const data = await reloadly.getTopupStatus(req.params.transactionId);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] topupStatus error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

// Reloadly transactions
app.get('/api/reloadly/transactions', async (req, res) => {
  try {
    const data = await reloadly.getTransactions(req.query);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] getTransactions error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

// FX Rates
app.get('/api/reloadly/fx-rate', async (req, res) => {
  try {
    const { operatorId, amount } = req.query;
    if (!operatorId || !amount) {
      return res.status(400).json({ success: false, message: 'operatorId and amount required' });
    }
    const data = await reloadly.getFXRate(operatorId, amount);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] fxRate error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

// Commissions
app.get('/api/reloadly/commissions', async (_req, res) => {
  try {
    const data = await reloadly.getCommissions();
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] commissions error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] running on http://0.0.0.0:${PORT}`);
});
