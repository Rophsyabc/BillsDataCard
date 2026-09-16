import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../data/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function parsePagination(query) {
  let limit = parseInt(query.limit, 10);
  let offset = parseInt(query.offset, 10);
  if (isNaN(limit) || limit < 1) limit = 50;
  if (isNaN(offset) || offset < 0) offset = 0;
  if (limit > 100) limit = 100;
  return { limit, offset };
}

router.get('/', authMiddleware, (req, res) => {
  try {
    const { type, status, search, from, to } = req.query;
    const { limit, offset } = parsePagination(req.query);
    let query = 'SELECT * FROM transactions WHERE userId = ?';
    const params = [req.user.id];

    if (type) { query += ' AND type = ?'; params.push(type); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) { query += ' AND (service LIKE ? OR phone LIKE ? OR id LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (from) { query += ' AND createdAt >= ?'; params.push(from); }
    if (to) { query += ' AND createdAt <= ?'; params.push(to); }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countQuery).get(...params);

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = db.prepare(query).all(...params);

    res.json({ success: true, data: { transactions, total, limit, offset } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
});

router.get('/analytics/summary', authMiddleware, (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period, 10);
    if (isNaN(days) || days < 0 || days > 3650) {
      return res.status(400).json({ success: false, message: 'Period must be 0-3650 days' });
    }

    let sinceCondition = '';
    const params = [req.user.id];
    if (days > 0) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      sinceCondition = ' AND createdAt >= ?';
      params.push(since);
    }

    const totalSpent = db.prepare(`SELECT SUM(amount) as total FROM transactions WHERE userId = ?${sinceCondition} AND status = 'success'`).get(...params);
    const totalTxns = db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE userId = ?${sinceCondition}`).get(...params);
    const byType = db.prepare(`SELECT type, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE userId = ?${sinceCondition} AND status = 'success' GROUP BY type ORDER BY total DESC`).all(...params);
    const byDay = db.prepare(`SELECT DATE(createdAt) as date, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE userId = ?${sinceCondition} AND status = 'success' GROUP BY DATE(createdAt) ORDER BY date`).all(...params);
    const byService = db.prepare(`SELECT service, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE userId = ?${sinceCondition} AND status = 'success' GROUP BY service ORDER BY total DESC LIMIT 10`).all(...params);

    const wallet = db.prepare('SELECT balance FROM wallet WHERE userId = ?').get(req.user.id);

    res.json({
      success: true,
      data: {
        balance: wallet?.balance || 0,
        totalSpent: totalSpent?.total || 0,
        totalTransactions: totalTxns?.count || 0,
        byType,
        byDay,
        byService,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get analytics' });
  }
});

router.get('/reminders', authMiddleware, (req, res) => {
  try {
    const reminders = db.prepare('SELECT * FROM bill_reminders WHERE userId = ? AND active = 1 ORDER BY nextDue').all(req.user.id);
    res.json({ success: true, data: reminders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.post('/reminders', authMiddleware, (req, res) => {
  try {
    const { type, service, amount, phone, meter, iuc, nextDue, frequency } = req.body;
    if (!type || !service || !amount || !nextDue) {
      return res.status(400).json({ success: false, message: 'type, service, amount, and nextDue are required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    const id = `REM-${uuidv4().slice(0, 8)}`;
    db.prepare('INSERT INTO bill_reminders (id, userId, type, service, amount, phone, meter, iuc, nextDue, frequency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, req.user.id, type, service, numAmount, phone || '', meter || '', iuc || '', nextDue, frequency || 'monthly');
    const reminder = db.prepare('SELECT * FROM bill_reminders WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.delete('/reminders/:id', authMiddleware, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM bill_reminders WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.get('/rewards/summary', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    const cashbackResult = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE userId = ? AND type = 'Cashback' AND status = 'success'").get(userId);
    const referralResult = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE userId = ? AND type = 'Referral' AND status = 'success'").get(userId);

    const referralCode = db.prepare('SELECT referralCode FROM users WHERE id = ?').get(userId);
    const referralCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE referredBy = ?').get(userId);

    const recentCashback = db.prepare("SELECT id, service, amount, createdAt FROM transactions WHERE userId = ? AND type = 'Cashback' AND status = 'success' ORDER BY createdAt DESC LIMIT 5").all(userId);
    const recentReferralEarnings = db.prepare("SELECT id, service, amount, createdAt FROM transactions WHERE userId = ? AND type = 'Referral' AND status = 'success' ORDER BY createdAt DESC LIMIT 5").all(userId);

    res.json({
      success: true,
      data: {
        totalCashback: cashbackResult?.total || 0,
        referralEarnings: referralResult?.total || 0,
        referralCode: referralCode?.referralCode || null,
        referralCount: referralCount?.count || 0,
        recentCashback,
        recentReferralEarnings,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get rewards summary' });
  }
});

router.get('/referrals', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT referralCode FROM users WHERE id = ?').get(req.user.id);
    const referrals = db.prepare('SELECT id, name, email, createdAt FROM users WHERE referredBy = ?').all(req.user.id);
    const rewards = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE userId = ? AND type = 'Referral'").get(req.user.id);
    res.json({ success: true, data: { code: user.referralCode, count: referrals.length, referrals, reward: rewards?.total || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.get('/:ref', authMiddleware, (req, res) => {
  try {
    const txn = db.prepare('SELECT * FROM transactions WHERE id = ? AND userId = ?').get(req.params.ref, req.user.id);
    if (!txn) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

export default router;
