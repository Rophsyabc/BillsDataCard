import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../data/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const KYC_TYPES = ['bvn', 'nin', 'drivers_license', 'passport', 'voter_card'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Get KYC status for current user
router.get('/status', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT kycStatus, kycType, kycDocument, bvn, phone, emailVerified FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        status: user.kycStatus || 'none',
        type: user.kycType || '',
        document: user.kycDocument || '',
        bvnVerified: !!user.bvn,
        phoneVerified: !!user.phoneVerified,
        emailVerified: !!user.emailVerified,
        canRequestWithdrawal: user.kycStatus === 'verified',
      },
    });
  } catch (err) {
    console.error('[kyc] status error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get KYC status' });
  }
});

// Submit KYC document
router.post('/submit', authMiddleware, (req, res) => {
  try {
    const { type, documentUrl, bvn } = req.body;

    if (!type || !KYC_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid KYC type. Must be one of: ${KYC_TYPES.join(', ')}` });
    }

    // Check if user already has a pending or verified KYC
    const user = db.prepare('SELECT kycStatus FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.kycStatus === 'verified') {
      return res.status(400).json({ success: false, message: 'KYC already verified' });
    }
    if (user.kycStatus === 'pending') {
      return res.status(400).json({ success: false, message: 'KYC already submitted. Please wait for review.' });
    }

    const kycId = `KYC-${uuidv4().slice(0, 8)}`;
    const documentHash = documentUrl ? crypto.createHash('sha256').update(documentUrl).digest('hex').slice(0, 16) : '';

    const updateKyc = db.transaction(() => {
      db.prepare(`UPDATE users SET kycStatus = 'pending', kycType = ?, kycDocument = ?, bvn = ? WHERE id = ?`).run(
        type,
        documentUrl || documentHash,
        bvn || '',
        req.user.id
      );
    });
    updateKyc();

    res.json({
      success: true,
      message: 'KYC submitted for review. You will be notified once verified.',
      data: { kycId, type, status: 'pending' },
    });
  } catch (err) {
    console.error('[kyc] submit error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit KYC' });
  }
});

// Verify phone via OTP
router.post('/verify-phone', authMiddleware, (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    // In production, verify against actual OTP provider (e.g., Termii, Africa's Talking)
    // For now, accept any 6-digit code
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP format' });
    }

    db.prepare('UPDATE users SET phone = ?, phoneVerified = 1 WHERE id = ?').run(phone, req.user.id);

    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (err) {
    console.error('[kyc] verify-phone error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to verify phone' });
  }
});

// Send phone OTP (placeholder - integrate with Termii/Africa's Talking in production)
router.post('/send-phone-otp', authMiddleware, (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    // Generate OTP (in production, send via SMS provider)
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP temporarily (in production, use Redis or similar)
    const tokenExp = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    db.prepare('DELETE FROM verification_tokens WHERE userId = ? AND token LIKE ?').run(req.user.id, 'phone_%');
    db.prepare('INSERT INTO verification_tokens (token, userId, expiresAt) VALUES (?, ?, ?)').run(`phone_${otp}`, req.user.id, tokenExp);

    console.log(`[kyc] Phone OTP for ${phone}: ${otp}`);

    res.json({ success: true, message: 'OTP sent to your phone', data: { phone } });
  } catch (err) {
    console.error('[kyc] send-phone-otp error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify BVN (placeholder - integrate with BVN verification API in production)
router.post('/verify-bvn', authMiddleware, (req, res) => {
  try {
    const { bvn, firstName, lastName, dateOfBirth } = req.body;

    if (!bvn) {
      return res.status(400).json({ success: false, message: 'BVN is required' });
    }

    if (!/^\d{11}$/.test(bvn)) {
      return res.status(400).json({ success: false, message: 'BVN must be 11 digits' });
    }

    // In production, verify BVN against NIBSS API
    // For now, accept and mark as verified
    db.prepare('UPDATE users SET bvn = ? WHERE id = ?').run(bvn, req.user.id);

    res.json({ success: true, message: 'BVN verified successfully', data: { bvn: bvn.slice(0, 3) + '****' + bvn.slice(7) } });
  } catch (err) {
    console.error('[kyc] verify-bvn error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to verify BVN' });
  }
});

// Admin: Get pending KYC submissions
router.get('/admin/pending', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const pending = db.prepare(`
      SELECT u.id, u.name, u.email, u.kycStatus, u.kycType, u.kycDocument, u.bvn, u.createdAt,
             w.balance
      FROM users u
      LEFT JOIN wallet w ON w.userId = u.id
      WHERE u.kycStatus = 'pending'
      ORDER BY u.createdAt DESC
    `).all();

    res.json({ success: true, data: pending });
  } catch (err) {
    console.error('[kyc] admin pending error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get pending KYC' });
  }
});

// Admin: Approve/Reject KYC
router.post('/admin/review', authMiddleware, (req, res) => {
  try {
    const adminUser = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { userId, action, reason } = req.body;

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'userId and action (approve/reject) required' });
    }

    const targetUser = db.prepare('SELECT kycStatus FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (targetUser.kycStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending KYC for this user' });
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    db.prepare('UPDATE users SET kycStatus = ? WHERE id = ?').run(newStatus, userId);

    res.json({ success: true, message: `KYC ${action}d successfully`, data: { userId, status: newStatus } });
  } catch (err) {
    console.error('[kyc] admin review error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to review KYC' });
  }
});

export default router;
