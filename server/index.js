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
import { apiLimiter, paymentLimiter, authLimiter } from './middleware/rateLimit.js';
import { authMiddleware } from './middleware/auth.js';
import db from './data/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:4000',
  'https://billsdatacard.onrender.com',
];

if (isProduction && process.env.ALLOWED_ORIGIN) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGIN.split(','));
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (isProduction) {
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));

if (isProduction) {
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
} else {
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
}

app.use(express.static(path.join(__dirname, '..', 'dist')));

app.use('/auth', authLimiter);
app.use('/api/payment', paymentLimiter);
app.use('/api', apiLimiter);

app.use('/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

const networks = [
  { id: 'mtn', name: 'MTN' },
  { id: 'airtel', name: 'Airtel' },
  { id: 'glo', name: 'Glo' },
  { id: '9mobile', name: '9mobile' },
  { id: 'smile', name: 'Smile' },
];

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/wallet', authMiddleware, (req, res) => {
  const userId = req.user.id;
  let wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(userId);
  if (!wallet) {
    db.prepare('INSERT INTO wallet (userId, balance) VALUES (?, 0)').run(userId);
    wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(userId);
  }
  res.json({ success: true, data: wallet });
});

app.get('/api/networks', authMiddleware, (_req, res) => {
  res.json({ success: true, data: networks });
});

function deductFromWallet(userId, amount) {
  const deductTxn = db.transaction(() => {
    const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(userId);
    if (!wallet || wallet.balance < amount) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    const newBalance = wallet.balance - amount;
    db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, userId);
    return newBalance;
  });
  return deductTxn();
}

app.post('/api/airtime/buy', authMiddleware, (req, res) => {
  try {
    const { network, phone, amount } = req.body;
    if (!network || !phone || !amount) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    const net = networks.find((n) => n.id === network);
    if (!net) {
      return res.status(400).json({ success: false, message: 'Invalid network' });
    }

    const uid = req.user.id;
    let newBalance;
    try {
      newBalance = deductFromWallet(uid, numAmount);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const txnId = `AIR-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO transactions (id, userId, type, service, phone, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Airtime', net.name, phone, numAmount, 'success');
    res.json({ success: true, data: { transaction: { id: txnId, network, phone, amount: numAmount, status: 'success' }, balance: newBalance } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

app.post('/api/data/buy', authMiddleware, (req, res) => {
  try {
    const { network, phone, planId } = req.body;
    if (!network || !phone || !planId) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const net = networks.find((n) => n.id === network);
    if (!net) {
      return res.status(400).json({ success: false, message: 'Invalid network' });
    }

    const plan = db.prepare('SELECT * FROM data_plans WHERE id = ? AND active = 1').get(planId);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const uid = req.user.id;
    let newBalance;
    try {
      newBalance = deductFromWallet(uid, plan.price);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const txnId = `DAT-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO transactions (id, userId, type, service, phone, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Data', `${net.name} - ${plan.name}`, phone, plan.price, 'success');
    res.json({ success: true, data: { transaction: { id: txnId, network, phone, plan: plan.name, amount: plan.price, status: 'success' }, balance: newBalance } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

app.post('/api/electricity/validate', authMiddleware, (req, res) => {
  const { disco, meterNumber, meterType } = req.body;
  if (!disco || !meterNumber) {
    return res.status(400).json({ success: false, message: 'Disco and meter required' });
  }
  res.json({
    success: true,
    data: { name: 'John Doe', address: '123 Example Street, Lagos', meterNumber, meterType },
  });
});

app.post('/api/electricity/buy', authMiddleware, (req, res) => {
  try {
    const { disco, meterNumber, meterType, amount } = req.body;
    if (!disco || !meterNumber || !amount) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const uid = req.user.id;
    let newBalance;
    try {
      newBalance = deductFromWallet(uid, numAmount);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const txnId = `ELEC-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO transactions (id, userId, type, service, meter, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Electricity', disco, meterNumber, numAmount, 'success');
    res.json({ success: true, data: { transaction: { id: txnId, disco, meterNumber, amount: numAmount, status: 'success' }, balance: newBalance } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

app.post('/api/tv/subscribe', authMiddleware, (req, res) => {
  try {
    const { provider, iuc, packageId, packageName, amount } = req.body;
    if (!provider || !iuc || !packageId) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const uid = req.user.id;
    let newBalance;
    try {
      newBalance = deductFromWallet(uid, numAmount);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const txnId = `TV-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO transactions (id, userId, type, service, iuc, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(txnId, uid, 'TV Subscription', `${provider} - ${packageName || packageId}`, iuc, numAmount, 'success');
    res.json({ success: true, data: { transaction: { id: txnId, provider, iuc, packageName, amount: numAmount, status: 'success' }, balance: newBalance } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

app.post('/api/giftcard/buy', authMiddleware, (req, res) => {
  try {
    const { cardName, amount, email, totalCost } = req.body;
    if (!cardName || !amount || !email) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const numCost = parseFloat(totalCost);
    const numAmount = parseFloat(amount);
    if (isNaN(numCost) || numCost <= 0 || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const uid = req.user.id;
    let newBalance;
    try {
      newBalance = deductFromWallet(uid, numCost);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const txnId = `GC-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO transactions (id, userId, type, service, amount, status) VALUES (?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Gift Card', cardName, numCost, 'success');
    res.json({ success: true, data: { transaction: { id: txnId, cardName, amount: numAmount, email, totalCost: numCost, status: 'success' }, balance: newBalance } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

app.post('/api/betting/fund', authMiddleware, (req, res) => {
  try {
    const { platform, userId: betUserId, amount } = req.body;
    if (!platform || !betUserId || !amount) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const uid = req.user.id;
    let newBalance;
    try {
      newBalance = deductFromWallet(uid, numAmount);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const txnId = `BET-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO transactions (id, userId, type, service, amount, status) VALUES (?, ?, ?, ?, ?, ?)').run(txnId, uid, 'Betting', platform, numAmount, 'success');
    res.json({ success: true, data: { transaction: { id: txnId, platform, betUserId, amount: numAmount, status: 'success' }, balance: newBalance } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

app.get('/api/reloadly/status', (_req, res) => {
  res.json({
    configured: reloadly.isConfigured(),
    environment: reloadly.getEnvironment(),
  });
});

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

app.post('/api/reloadly/topup', authMiddleware, async (req, res) => {
  try {
    if (!reloadly.isConfigured()) {
      return res.status(503).json({ success: false, message: 'Reloadly not configured' });
    }

    const { operatorId, amount, phone, countryCode, customIdentifier, useLocalAmount } = req.body;
    if (!operatorId || !amount || !phone || !countryCode) {
      return res.status(400).json({ success: false, message: 'operatorId, amount, phone, countryCode required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const userId = req.user.id;

    let newBalance;
    try {
      newBalance = deductFromWallet(userId, numAmount);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const ref = customIdentifier || `RLY-${uuidv4().slice(0, 8)}`;

    const result = await reloadly.makeTopup({
      operatorId,
      amount: numAmount,
      phone,
      countryCode,
      customIdentifier: ref,
      useLocalAmount: useLocalAmount || false,
    });

    const status = result.status === 'SUCCESSFUL' ? 'success' : result.status === 'PENDING' ? 'pending' : 'failed';
    db.prepare('INSERT INTO transactions (id, userId, type, service, phone, amount, status, method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(ref, userId, 'Airtime', result.operatorName || `Operator ${operatorId}`, phone, numAmount, status, 'reloadly');

    if (status === 'failed') {
      const refundTxn = db.transaction(() => {
        const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(userId);
        const refundBalance = wallet.balance + numAmount;
        db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(refundBalance, userId);
      });
      refundTxn();
    }

    res.json({ success: true, data: { transaction: { id: ref, status }, reloadly: result, balance: status === 'failed' ? undefined : newBalance } });
  } catch (err) {
    console.error('[reloadly] topup error:', err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ success: false, message });
  }
});

app.post('/api/reloadly/topup-async', authMiddleware, async (req, res) => {
  try {
    if (!reloadly.isConfigured()) {
      return res.status(503).json({ success: false, message: 'Reloadly not configured' });
    }

    const { operatorId, amount, phone, countryCode, customIdentifier, useLocalAmount } = req.body;
    if (!operatorId || !amount || !phone || !countryCode) {
      return res.status(400).json({ success: false, message: 'operatorId, amount, phone, countryCode required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const userId = req.user.id;

    let newBalance;
    try {
      newBalance = deductFromWallet(userId, numAmount);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const ref = customIdentifier || `RLY-${uuidv4().slice(0, 8)}`;

    const result = await reloadly.makeAsyncTopup({
      operatorId,
      amount: numAmount,
      phone,
      countryCode,
      customIdentifier: ref,
      useLocalAmount: useLocalAmount || false,
    });

    db.prepare('INSERT INTO transactions (id, userId, type, service, phone, amount, status, method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(ref, userId, 'Airtime', `Operator ${operatorId}`, phone, numAmount, 'pending', 'reloadly');

    res.json({ success: true, data: { transaction: { id: ref, status: 'pending' }, reloadly: result, balance: newBalance } });
  } catch (err) {
    console.error('[reloadly] topup-async error:', err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ success: false, message });
  }
});

app.get('/api/reloadly/topup/status/:transactionId', async (req, res) => {
  try {
    const data = await reloadly.getTopupStatus(req.params.transactionId);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] topupStatus error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

app.get('/api/reloadly/transactions', authMiddleware, async (req, res) => {
  try {
    const data = await reloadly.getTransactions(req.query);
    res.json({ success: true, data, source: 'reloadly' });
  } catch (err) {
    console.error('[reloadly] getTransactions error:', err.message);
    res.status(err.response?.status || 500).json({ success: false, message: err.message });
  }
});

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
app.listen(PORT, isProduction ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`[server] running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
});
