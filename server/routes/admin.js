import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../data/db.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = Router();
router.use(adminMiddleware);

const VALID_STATUSES = ['success', 'failed', 'pending', 'cancelled', 'refunded'];
const VALID_ROLES = ['user', 'admin'];
const VALID_USER_STATUSES = ['active', 'banned', 'suspended'];

function parsePagination(query) {
  let limit = parseInt(query.limit, 10);
  let offset = parseInt(query.offset, 10);
  if (isNaN(limit) || limit < 1) limit = 50;
  if (isNaN(offset) || offset < 0) offset = 0;
  if (limit > 200) limit = 200;
  return { limit, offset };
}

router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get().count;
    const bannedUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'banned'").get().count;
    const todayUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(createdAt) = date('now')").get().count;

    const totalRevenue = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE status = 'success'").get().total || 0;
    const todayRevenue = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE status = 'success' AND date(createdAt) = date('now')").get().total || 0;
    const totalProfit = db.prepare("SELECT SUM(profit) as total FROM transactions WHERE status = 'success'").get().total || 0;
    const todayProfit = db.prepare("SELECT SUM(profit) as total FROM transactions WHERE status = 'success' AND date(createdAt) = date('now')").get().total || 0;

    const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
    const todayTransactions = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE date(createdAt) = date('now')").get().count;
    const successTransactions = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = 'success'").get().count;
    const failedTransactions = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = 'failed'").get().count;

    const totalWalletBalance = db.prepare('SELECT SUM(balance) as total FROM wallet').get().total || 0;

    const revenueByType = db.prepare("SELECT type, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE status = 'success' GROUP BY type ORDER BY total DESC").all();
    const revenueByDay = db.prepare("SELECT DATE(createdAt) as date, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE status = 'success' AND createdAt >= datetime('now', '-30 days') GROUP BY DATE(createdAt) ORDER BY date").all();
    const topUsers = db.prepare("SELECT u.id, u.name, u.email, SUM(t.amount) as totalSpent, COUNT(t.id) as txnCount FROM users u JOIN transactions t ON u.id = t.userId WHERE t.status = 'success' GROUP BY u.id ORDER BY totalSpent DESC LIMIT 10").all();

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers, banned: bannedUsers, today: todayUsers },
        revenue: { total: totalRevenue, today: todayRevenue, profit: totalProfit, todayProfit },
        transactions: { total: totalTransactions, today: todayTransactions, success: successTransactions, failed: failedTransactions },
        walletBalance: totalWalletBalance,
        revenueByType,
        revenueByDay,
        topUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
});

router.get('/users', (req, res) => {
  try {
    const { search, status, role } = req.query;
    const { limit, offset } = parsePagination(req.query);
    let query = 'SELECT id, name, email, phone, role, status, emailVerified, referralCode, createdAt FROM users WHERE 1=1';
    const params = [];

    if (search) { query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (role) { query += ' AND role = ?'; params.push(role); }

    const countQuery = query.replace('SELECT id, name, email, phone, role, status, emailVerified, referralCode, createdAt', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countQuery).get(...params);

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const users = db.prepare(query).all(...params);

    res.json({ success: true, data: { users, total, limit, offset } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
});

router.get('/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, phone, role, status, emailVerified, referralCode, createdAt FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const wallet = db.prepare('SELECT balance FROM wallet WHERE userId = ?').get(req.params.id);
    const txnCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE userId = ?').get(req.params.id).count;
    const totalSpent = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE userId = ? AND status = 'success'").get(req.params.id).total || 0;
    const recentTxns = db.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 10').all(req.params.id);

    res.json({ success: true, data: { ...user, balance: wallet?.balance || 0, txnCount, totalSpent, recentTxns } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const { name, email, phone, role, status } = req.body;
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (status && !VALID_USER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    const updateFields = [];
    const updateParams = [];
    if (name) { updateFields.push('name = ?'); updateParams.push(name); }
    if (email) { updateFields.push('email = ?'); updateParams.push(email); }
    if (phone !== undefined) { updateFields.push('phone = ?'); updateParams.push(phone); }
    if (role) { updateFields.push('role = ?'); updateParams.push(role); }
    if (status) { updateFields.push('status = ?'); updateParams.push(status); }

    if (updateFields.length > 0) {
      updateParams.push(req.params.id);
      db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);
    }

    const updated = db.prepare('SELECT id, name, email, phone, role, status, emailVerified, referralCode, createdAt FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete admin users' });
    }

    const deleteUser = db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE userId = ?').run(req.params.id);
      db.prepare('DELETE FROM bill_reminders WHERE userId = ?').run(req.params.id);
      db.prepare('DELETE FROM password_reset_tokens WHERE userId = ?').run(req.params.id);
      db.prepare('DELETE FROM verification_tokens WHERE userId = ?').run(req.params.id);
      db.prepare('DELETE FROM wallet WHERE userId = ?').run(req.params.id);
      db.prepare('DELETE FROM transactions WHERE userId = ?').run(req.params.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    });
    deleteUser();

    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

router.get('/transactions', (req, res) => {
  try {
    const { type, status, search, from, to } = req.query;
    const { limit, offset } = parsePagination(req.query);
    let query = 'SELECT t.*, u.name as userName, u.email as userEmail FROM transactions t LEFT JOIN users u ON t.userId = u.id WHERE 1=1';
    const params = [];

    if (type) { query += ' AND t.type = ?'; params.push(type); }
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (search) { query += ' AND (t.service LIKE ? OR t.phone LIKE ? OR t.id LIKE ? OR u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    if (from) { query += ' AND t.createdAt >= ?'; params.push(from); }
    if (to) { query += ' AND t.createdAt <= ?'; params.push(to); }

    const countQuery = query.replace('SELECT t.*, u.name as userName, u.email as userEmail', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countQuery).get(...params);

    query += ' ORDER BY t.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const transactions = db.prepare(query).all(...params);

    res.json({ success: true, data: { transactions, total, limit, offset } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
});

router.put('/transactions/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const txn = db.prepare('SELECT id, userId, amount, status as currentStatus FROM transactions WHERE id = ?').get(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const updateStatus = db.transaction(() => {
      db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, req.params.id);

      if (status === 'refunded' && txn.currentStatus === 'success') {
        let wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(txn.userId);
        if (!wallet) {
          db.prepare('INSERT INTO wallet (userId, balance) VALUES (?, ?)').run(txn.userId, 0);
          wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(txn.userId);
        }
        const newBalance = wallet.balance + txn.amount;
        db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, txn.userId);
      }
    });
    updateStatus();

    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.get('/plans', (req, res) => {
  try {
    const { network, category, active } = req.query;
    let query = 'SELECT * FROM data_plans WHERE 1=1';
    const params = [];
    if (network) { query += ' AND network = ?'; params.push(network); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (active !== undefined) { query += ' AND active = ?'; params.push(parseInt(active)); }
    query += ' ORDER BY network, category, price';
    const plans = db.prepare(query).all(...params);
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.post('/plans', (req, res) => {
  try {
    const { network, name, size, price, cost_price, validity, category } = req.body;
    if (!network || !name || !size || !price || !validity) {
      return res.status(400).json({ success: false, message: 'network, name, size, price, and validity are required' });
    }
    const numPrice = parseFloat(price);
    const numCost = parseFloat(cost_price) || 0;
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid price' });
    }
    const id = `plan-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO data_plans (id, network, name, size, price, cost_price, validity, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, network, name, size, numPrice, numCost, validity, category || 'monthly');
    const plan = db.prepare('SELECT * FROM data_plans WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.put('/plans/:id', (req, res) => {
  try {
    const { name, size, price, cost_price, validity, category, active } = req.body;
    const plan = db.prepare('SELECT id FROM data_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    if (price !== undefined) {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid price' });
      }
    }

    const updateFields = [];
    const updateParams = [];
    if (name) { updateFields.push('name = ?'); updateParams.push(name); }
    if (size) { updateFields.push('size = ?'); updateParams.push(size); }
    if (price !== undefined) { updateFields.push('price = ?'); updateParams.push(parseFloat(price)); }
    if (cost_price !== undefined) { updateFields.push('cost_price = ?'); updateParams.push(parseFloat(cost_price)); }
    if (validity) { updateFields.push('validity = ?'); updateParams.push(validity); }
    if (category) { updateFields.push('category = ?'); updateParams.push(category); }
    if (active !== undefined) { updateFields.push('active = ?'); updateParams.push(active ? 1 : 0); }

    if (updateFields.length > 0) {
      updateParams.push(req.params.id);
      db.prepare(`UPDATE data_plans SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);
    }

    const updated = db.prepare('SELECT * FROM data_plans WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.delete('/plans/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM data_plans WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.get('/giftcards', (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM gift_cards WHERE 1=1';
    const params = [];
    if (active !== undefined) { query += ' AND active = ?'; params.push(parseInt(active)); }
    query += ' ORDER BY name';
    const cards = db.prepare(query).all(...params);
    res.json({ success: true, data: cards });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.post('/giftcards', (req, res) => {
  try {
    const { name, currency, minAmount, maxAmount, rate, cost_rate, logo } = req.body;
    if (!name || !currency || !rate) {
      return res.status(400).json({ success: false, message: 'name, currency, and rate are required' });
    }
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid rate' });
    }
    const id = `gc-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO gift_cards (id, name, currency, minAmount, maxAmount, rate, cost_rate, logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, currency, parseFloat(minAmount) || 10, parseFloat(maxAmount) || 500, numRate, parseFloat(cost_rate) || 0, logo || '');
    const card = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: card });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.put('/giftcards/:id', (req, res) => {
  try {
    const { name, currency, minAmount, maxAmount, rate, cost_rate, logo, active } = req.body;
    const card = db.prepare('SELECT id FROM gift_cards WHERE id = ?').get(req.params.id);
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });

    const updateFields = [];
    const updateParams = [];
    if (name) { updateFields.push('name = ?'); updateParams.push(name); }
    if (currency) { updateFields.push('currency = ?'); updateParams.push(currency); }
    if (minAmount !== undefined) { updateFields.push('minAmount = ?'); updateParams.push(parseFloat(minAmount)); }
    if (maxAmount !== undefined) { updateFields.push('maxAmount = ?'); updateParams.push(parseFloat(maxAmount)); }
    if (rate !== undefined) { updateFields.push('rate = ?'); updateParams.push(parseFloat(rate)); }
    if (cost_rate !== undefined) { updateFields.push('cost_rate = ?'); updateParams.push(parseFloat(cost_rate)); }
    if (logo !== undefined) { updateFields.push('logo = ?'); updateParams.push(logo); }
    if (active !== undefined) { updateFields.push('active = ?'); updateParams.push(active ? 1 : 0); }

    if (updateFields.length > 0) {
      updateParams.push(req.params.id);
      db.prepare(`UPDATE gift_cards SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);
    }

    const updated = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.delete('/giftcards/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM gift_cards WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Card deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.get('/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM admin_settings').all();
    const obj = {};
    settings.forEach((s) => { obj[s.key] = s.value; });
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.put('/settings', (req, res) => {
  try {
    const settings = req.body;
    const protectedKeys = ['paystack_secret_key'];
    const upsert = db.prepare('INSERT INTO admin_settings (key, value, updatedAt) VALUES (?, ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt');

    const updateSettings = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        if (protectedKeys.includes(key)) continue;
        upsert.run(key, String(value));
      }
    });
    updateSettings();

    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.get('/announcements', (req, res) => {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.post('/announcements', (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }
    const id = `ann-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO announcements (id, title, message, type) VALUES (?, ?, ?, ?)').run(id, title, message, type || 'info');
    const ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: ann });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.delete('/announcements/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

export default router;
