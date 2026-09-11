import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../data/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get KYC status for current user
router.get('/status', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT kycStatus, kycType, phone, phoneVerified, emailVerified FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const latestJob = db.prepare('SELECT id, status, nameOnNin, createdAt, updatedAt FROM kyc_jobs WHERE userId = ? ORDER BY createdAt DESC LIMIT 1').get(req.user.id);

    res.json({
      success: true,
      data: {
        status: user.kycStatus || 'none',
        type: user.kycType || '',
        phoneVerified: !!user.phoneVerified,
        emailVerified: !!user.emailVerified,
        canRequestWithdrawal: user.kycStatus === 'verified',
        latestJob: latestJob || null,
      },
    });
  } catch (err) {
    console.error('[kyc] status error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get KYC status' });
  }
});

// Submit KYC: NIN slip + live photo + name on NIN
router.post('/submit', authMiddleware, (req, res) => {
  try {
    const { ninNumber, nameOnNin, ninSlipImage, livePhoto } = req.body;

    if (!ninNumber || !/^\d{11}$/.test(ninNumber)) {
      return res.status(400).json({ success: false, message: 'Valid 11-digit NIN is required' });
    }

    if (!nameOnNin || nameOnNin.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Name on NIN is required' });
    }

    if (!ninSlipImage) {
      return res.status(400).json({ success: false, message: 'NIN slip image is required' });
    }

    if (!livePhoto) {
      return res.status(400).json({ success: false, message: 'Live photo is required' });
    }

    const user = db.prepare('SELECT id, name, kycStatus FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.kycStatus === 'verified') return res.status(400).json({ success: false, message: 'KYC already verified' });

    // Check for existing pending submission
    const existing = db.prepare('SELECT id FROM kyc_jobs WHERE userId = ? AND status = ?').get(req.user.id, 'pending');
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending KYC submission' });
    }

    // Name match check
    const signupName = user.name.toLowerCase().trim();
    const submittedName = nameOnNin.toLowerCase().trim();
    const nameMatch = signupName === submittedName || signupName.includes(submittedName) || submittedName.includes(signupName);

    if (!nameMatch) {
      return res.status(400).json({
        success: false,
        message: `Name on NIN ("${nameOnNin}") does not match your signup name ("${user.name}"). Please contact support if this is an error.`,
      });
    }

    const jobId = `KYC-${uuidv4().slice(0, 8)}`;

    db.prepare('INSERT INTO kyc_jobs (id, userId, status, ninNumber, nameOnNin, ninSlipImage, livePhoto) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      jobId, req.user.id, 'pending', ninNumber, nameOnNin.trim(), ninSlipImage, livePhoto
    );

    db.prepare('UPDATE users SET kycStatus = ? WHERE id = ?').run('pending', req.user.id);

    res.json({
      success: true,
      message: 'KYC submitted for review. You will be notified once verified.',
      data: { jobId, status: 'pending' },
    });
  } catch (err) {
    console.error('[kyc] submit error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit KYC' });
  }
});

// Get job details (for user)
router.get('/job/:id', authMiddleware, (req, res) => {
  try {
    const job = db.prepare('SELECT id, status, nameOnNin, ninNumber, adminNote, createdAt, updatedAt FROM kyc_jobs WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (err) {
    console.error('[kyc] job error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get job' });
  }
});

// Verify phone via OTP
router.post('/verify-phone', authMiddleware, (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: 'Invalid OTP format' });

    db.prepare('UPDATE users SET phone = ?, phoneVerified = 1 WHERE id = ?').run(phone, req.user.id);
    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (err) {
    console.error('[kyc] verify-phone error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to verify phone' });
  }
});

// Send phone OTP
router.post('/send-phone-otp', authMiddleware, (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });
    if (!/^\d{11}$/.test(phone)) return res.status(400).json({ success: false, message: 'Invalid phone number format' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const tokenExp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM verification_tokens WHERE userId = ? AND token LIKE ?').run(req.user.id, 'phone_%');
    db.prepare('INSERT INTO verification_tokens (token, userId, expiresAt) VALUES (?, ?, ?)').run(`phone_${otp}`, req.user.id, tokenExp);

    console.log(`[kyc] Phone OTP for ${phone}: ${otp}`);
    res.json({ success: true, message: 'OTP sent to your phone', data: { phone } });
  } catch (err) {
    console.error('[kyc] send-phone-otp error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Admin: Get all KYC submissions
router.get('/admin/pending', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const { status } = req.query;
    let query = `
      SELECT kj.id, kj.userId, kj.status, kj.ninNumber, kj.nameOnNin, kj.ninSlipImage, kj.livePhoto, kj.adminNote, kj.createdAt, kj.updatedAt,
             u.name as userName, u.email as userEmail, u.phone as userPhone
      FROM kyc_jobs kj
      JOIN users u ON u.id = kj.userId
    `;
    const params = [];

    if (status) {
      query += ' WHERE kj.status = ?';
      params.push(status);
    } else {
      query += " WHERE kj.status IN ('pending', 'verified', 'rejected')";
    }

    query += ' ORDER BY kj.createdAt DESC LIMIT 50';
    const jobs = db.prepare(query).all(...params);

    res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('[kyc] admin pending error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get KYC submissions' });
  }
});

// Admin: Approve/Reject KYC
router.post('/admin/review', authMiddleware, (req, res) => {
  try {
    const adminUser = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!adminUser || adminUser.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const { jobId, action, note } = req.body;
    if (!jobId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'jobId and action (approve/reject) required' });
    }

    const job = db.prepare('SELECT * FROM kyc_jobs WHERE id = ?').get(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'KYC job not found' });

    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    db.prepare('UPDATE kyc_jobs SET status = ?, adminNote = ?, reviewedBy = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(
      newStatus, note || '', req.user.id, jobId
    );

    db.prepare('UPDATE users SET kycStatus = ?, kycType = ? WHERE id = ?').run(
      newStatus, 'NIN', job.userId
    );

    res.json({ success: true, message: `KYC ${action}d successfully`, data: { jobId, status: newStatus } });
  } catch (err) {
    console.error('[kyc] admin review error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to review KYC' });
  }
});

export default router;
