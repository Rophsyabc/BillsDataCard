import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../data/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;
const PAYSTACK_BASE = 'https://api.paystack.co';

async function paystackRequest(path, options = {}) {
  if (!PAYSTACK_SECRET) {
    throw new Error('Paystack not configured');
  }
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res.json();
}

function creditWallet(userId, reference, amountInNaira, service, method) {
  const existingTxn = db.prepare('SELECT id FROM transactions WHERE id = ?').get(reference);
  if (existingTxn) return false;

  const creditWalletTxn = db.transaction(() => {
    let wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(userId);
    if (!wallet) {
      db.prepare('INSERT INTO wallet (userId, balance) VALUES (?, ?)').run(userId, 0);
      wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(userId);
    }
    const newBalance = wallet.balance + amountInNaira;
    db.prepare('UPDATE wallet SET balance = ? WHERE userId = ?').run(newBalance, userId);
    db.prepare('INSERT INTO transactions (id, userId, type, service, amount, method, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(reference, userId, 'Wallet Funding', service, amountInNaira, method, 'success');
  });
  creditWalletTxn();
  return true;
}

router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const { amount, email, method, metadata } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ success: false, message: 'Amount and email are required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (!PAYSTACK_SECRET) {
      return res.status(503).json({ success: false, message: 'Paystack not configured' });
    }

    const callbackUrl = `${req.headers.origin || 'http://localhost:4000'}/wallet?reference={reference}`;

    const result = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(numAmount * 100),
        email,
        callback_url: callbackUrl,
        metadata: {
          custom_fields: [
            { display_name: 'Method', variable_name: 'method', value: method || 'card' },
            { display_name: 'UserId', variable_name: 'userId', value: req.user.id },
            ...(metadata || []),
          ],
        },
      }),
    });

    if (result.status) {
      res.json({
        success: true,
        data: {
          reference: result.data.reference,
          authorization_url: result.data.authorization_url,
          access_code: result.data.access_code,
          amount: numAmount,
          email,
        },
      });
    } else {
      res.status(400).json({ success: false, message: result.message || 'Failed to initialize payment' });
    }
  } catch (err) {
    console.error('[paystack] Initialize error:', err.message);
    res.status(500).json({ success: false, message: 'Payment initialization failed' });
  }
});

router.get('/verify/:reference', authMiddleware, async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const result = await paystackRequest(`/transaction/verify/${reference}`);

    if (!result.status) {
      return res.status(400).json({ success: false, message: result.message || 'Verification failed' });
    }

    if (result.data?.status !== 'success') {
      return res.json({ success: false, data: { status: result.data?.status || 'failed' }, message: 'Transaction not successful' });
    }

    const amountInNaira = result.data.amount / 100;
    const userId = req.user.id;

    const credited = creditWallet(userId, reference, amountInNaira, 'Paystack Card Payment', 'card');

    res.json({
      success: true,
      data: {
        reference: result.data.reference,
        status: result.data.status,
        amount: amountInNaira,
        paid_at: result.data.paid_at,
        channel: result.data.channel,
        metadata: result.data.metadata,
      },
    });
  } catch (err) {
    console.error('[paystack] Verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const rawBody = req.body;

    if (PAYSTACK_WEBHOOK_SECRET) {
      const hash = crypto
        .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
        .update(JSON.stringify(rawBody))
        .digest('hex');
      if (hash !== req.headers['x-paystack-signature']) {
        console.warn('[paystack] Webhook signature mismatch');
        return res.sendStatus(400);
      }
    } else {
      console.warn('[paystack] No webhook secret configured — rejecting webhook');
      return res.sendStatus(500);
    }

    const event = rawBody;

    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata } = event.data;
      const amountInNaira = amount / 100;

      let userId = null;
      if (metadata?.custom_fields) {
        const userIdField = metadata.custom_fields.find(f => f.variable_name === 'userId');
        if (userIdField && userIdField.value && userIdField.value !== 'default') {
          userId = userIdField.value;
        }
      }

      if (!userId) {
        console.error(`[paystack] Webhook: No valid userId in metadata for ${reference}`);
        return res.sendStatus(200);
      }

      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
      if (!userExists) {
        console.error(`[paystack] Webhook: User ${userId} not found for ${reference}`);
        return res.sendStatus(200);
      }

      creditWallet(userId, reference, amountInNaira, 'Paystack Payment', 'card');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[paystack] Webhook error:', err.message);
    res.sendStatus(500);
  }
});

router.post('/bank-transfer', authMiddleware, async (req, res) => {
  const { amount, email } = req.body;

  if (!amount || !email) {
    return res.status(400).json({ success: false, message: 'Amount and email are required' });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  const reference = `BTR-${uuidv4().slice(0, 12)}`;
  const userId = req.user.id;
  db.prepare('INSERT INTO transactions (id, userId, type, service, amount, method, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(reference, userId, 'Wallet Funding', 'Bank Transfer', numAmount, 'bank_transfer', 'pending');

  res.json({
    success: true,
    data: {
      reference,
      bankName: 'PayBills Microfinance Bank',
      accountNumber: '1234567890',
      accountName: 'PayBills Limited',
      amount: numAmount,
      email,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  });
});

export default router;
