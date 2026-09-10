import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';

// Helper to call Paystack API
async function paystackRequest(path, options = {}) {
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

// ── Initialize Transaction ──
router.post('/initialize', async (req, res) => {
  try {
    const { amount, email, method, metadata } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ success: false, message: 'Amount and email are required' });
    }

    if (!PAYSTACK_SECRET) {
      // Mock mode - simulate Paystack response
      const reference = `PSK-${uuidv4().slice(0, 12)}`;
      return res.json({
        success: true,
        data: {
          reference,
          authorization_url: null,
          amount,
          email,
          method,
          status: 'mock',
          message: 'Paystack not configured - using mock mode',
        },
      });
    }

    const callbackUrl = `${req.headers.origin || 'http://localhost:4000'}/wallet?reference={reference}`;

    const result = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: amount * 100, // Paystack uses kobo
        email,
        callback_url: callbackUrl,
        metadata: {
          custom_fields: [
            { display_name: 'Method', variable_name: 'method', value: method || 'card' },
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
          amount,
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

// ── Verify Transaction ──
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    if (!PAYSTACK_SECRET) {
      // Mock mode
      return res.json({
        success: true,
        data: {
          reference,
          status: 'success',
          amount: 1000,
          paid_at: new Date().toISOString(),
          channel: 'card',
        },
      });
    }

    const result = await paystackRequest(`/transaction/verify/${reference}`);

    if (result.status && result.data?.status === 'success') {
      res.json({
        success: true,
        data: {
          reference: result.data.reference,
          status: result.data.status,
          amount: result.data.amount / 100,
          paid_at: result.data.paid_at,
          channel: result.data.channel,
          metadata: result.data.metadata,
        },
      });
    } else {
      res.json({
        success: false,
        data: { status: result.data?.status || 'failed' },
        message: result.message || 'Transaction verification failed',
      });
    }
  } catch (err) {
    console.error('[paystack] Verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ── Webhook ──
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    // Verify webhook signature in production
    // const hash = crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');

    if (event.event === 'charge.success') {
      const { reference, amount, customer: _customer, metadata: _metadata } = event.data;
      console.log(`[paystack] Webhook: ${reference} - ${amount / 100} NGN`);
      // In production: credit user wallet here
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[paystack] Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ── Bank Transfer Details ──
router.post('/bank-transfer', (req, res) => {
  const { amount, email } = req.body;

  if (!amount || !email) {
    return res.status(400).json({ success: false, message: 'Amount and email are required' });
  }

  // Simulated bank transfer details
  const reference = `BTR-${uuidv4().slice(0, 12)}`;
  res.json({
    success: true,
    data: {
      reference,
      bankName: 'PayBills Microfinance Bank',
      accountNumber: '1234567890',
      accountName: 'PayBills Limited',
      amount,
      email,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    },
  });
});

export default router;
