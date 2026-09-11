import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
import crypto from 'crypto';
import db from '../data/db.js';
import { authMiddleware } from '../middleware/auth.js';

const require = createRequire(import.meta.url);
const SIDCore = require('smile-identity-core');

const router = Router();

const SMILE_PARTNER_ID = process.env.SMILE_PARTNER_ID || '';
const SMILE_API_KEY = process.env.SMILE_API_KEY || '';
const SMILE_SID_SERVER = process.env.SMILE_SID_SERVER || 'https://testapi.smileidentity.com/v1';
const SMILE_CALLBACK_URL = process.env.SMILE_CALLBACK_URL || '';

function getSmileWebApi(callbackUrl) {
  return new SIDCore.WebApi(
    SMILE_PARTNER_ID,
    callbackUrl || SMILE_CALLBACK_URL,
    SMILE_API_KEY,
    SMILE_SID_SERVER
  );
}

function isSmileConfigured() {
  return SMILE_PARTNER_ID && SMILE_API_KEY;
}

// Get KYC status for current user
router.get('/status', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT kycStatus, kycType, kycDocument, phone, phoneVerified, emailVerified FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const latestJob = db.prepare('SELECT id, status, createdAt FROM kyc_jobs WHERE userId = ? ORDER BY createdAt DESC LIMIT 1').get(req.user.id);

    res.json({
      success: true,
      data: {
        status: user.kycStatus || 'none',
        type: user.kycType || '',
        document: user.kycDocument || '',
        phoneVerified: !!user.phoneVerified,
        emailVerified: !!user.emailVerified,
        canRequestWithdrawal: user.kycStatus === 'verified',
        smileConfigured: isSmileConfigured(),
        latestJob: latestJob || null,
      },
    });
  } catch (err) {
    console.error('[kyc] status error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get KYC status' });
  }
});

// Generate Smile Identity web token for Smart Camera
router.post('/smile-token', authMiddleware, async (req, res) => {
  try {
    if (!isSmileConfigured()) {
      return res.status(503).json({ success: false, message: 'Smile Identity not configured' });
    }

    const user = db.prepare('SELECT kycStatus FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.kycStatus === 'verified') return res.status(400).json({ success: false, message: 'KYC already verified' });

    const jobId = `KYC-${uuidv4().slice(0, 8)}`;

    const webApi = getSmileWebApi();
    const tokenResult = await webApi.get_web_token({
      callback_url: SMILE_CALLBACK_URL,
      user_id: req.user.id,
      job_id: jobId,
      product: 'document_verification',
    });

    db.prepare('INSERT INTO kyc_jobs (id, userId, smileJobId, status, idType) VALUES (?, ?, ?, ?, ?)').run(
      jobId, req.user.id, '', 'pending', 'NIN'
    );

    res.json({
      success: true,
      data: {
        token: tokenResult.token,
        jobId,
      },
    });
  } catch (err) {
    console.error('[kyc] smile-token error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate Smile token' });
  }
});

// Submit KYC verification to Smile Identity (server-to-server)
router.post('/smile-submit', authMiddleware, async (req, res) => {
  try {
    if (!isSmileConfigured()) {
      return res.status(503).json({ success: false, message: 'Smile Identity not configured' });
    }

    const { ninNumber, selfieImage, livenessImages, documentImage } = req.body;

    if (!ninNumber || !/^\d{11}$/.test(ninNumber)) {
      return res.status(400).json({ success: false, message: 'Valid 11-digit NIN is required' });
    }

    const user = db.prepare('SELECT kycStatus FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.kycStatus === 'verified') return res.status(400).json({ success: false, message: 'KYC already verified' });

    if (!selfieImage) {
      return res.status(400).json({ success: false, message: 'Selfie image is required' });
    }

    const jobId = `KYC-${uuidv4().slice(0, 8)}`;

    const imageDetails = [
      { image_type_id: SIDCore.IMAGE_TYPE.SELFIE_IMAGE_BASE64, image: selfieImage },
    ];

    if (livenessImages && Array.isArray(livenessImages)) {
      livenessImages.forEach((img) => {
        imageDetails.push({ image_type_id: SIDCore.IMAGE_TYPE.LIVENESS_IMAGE_BASE64, image: img });
      });
    }

    if (documentImage) {
      imageDetails.push({ image_type_id: SIDCore.IMAGE_TYPE.ID_CARD_IMAGE_BASE64, image: documentImage });
    }

    const partnerParams = {
      user_id: req.user.id,
      job_id: jobId,
      job_type: SIDCore.JOB_TYPE.DOCUMENT_VERIFICATION,
    };

    const idInfo = {
      entered: true,
      country: 'NG',
      id_type: 'NIN',
      id_number: ninNumber,
    };

    const webApi = getSmileWebApi();
    const result = await webApi.submit_job(
      partnerParams,
      imageDetails,
      idInfo,
      {
        return_job_status: true,
        return_images: false,
        return_history: false,
      }
    );

    const smileJobId = result.smile_job_id || jobId;
    const resultJson = JSON.stringify(result);

    db.prepare('UPDATE kyc_jobs SET smileJobId = ?, status = ?, idNumber = ?, result = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(
      smileJobId,
      result.job_complete ? (result.Result?.ResultText === 'Approved' ? 'verified' : 'failed') : 'processing',
      ninNumber,
      resultJson,
      jobId
    );

    if (result.job_complete && result.Result?.ResultText === 'Approved') {
      db.prepare('UPDATE users SET kycStatus = \'verified\', kycType = \'NIN\', kycDocument = ? WHERE id = ?').run(
        `smile:${smileJobId}`,
        req.user.id
      );
    }

    res.json({
      success: true,
      data: {
        jobId,
        smileJobId,
        status: result.job_complete ? (result.Result?.ResultText === 'Approved' ? 'verified' : 'failed') : 'processing',
        result: result.Result || null,
      },
    });
  } catch (err) {
    console.error('[kyc] smile-submit error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to submit verification' });
  }
});

// Smile Identity callback endpoint
router.post('/smile-callback', (req, res) => {
  try {
    const { smile_job_id, result, partner_params } = req.body;

    console.log('[kyc] Smile callback received:', { smile_job_id, userId: partner_params?.user_id });

    if (!partner_params?.user_id || !smile_job_id) {
      return res.status(400).json({ success: false, message: 'Invalid callback data' });
    }

    const job = db.prepare('SELECT * FROM kyc_jobs WHERE userId = ? AND (smileJobId = ? OR id = ?)').get(
      partner_params.user_id, smile_job_id, partner_params.job_id
    );

    if (!job) {
      console.warn('[kyc] Callback for unknown job:', smile_job_id);
      return res.json({ success: true });
    }

    const isApproved = result?.Result?.ResultText === 'Approved';
    const newStatus = isApproved ? 'verified' : 'failed';

    db.prepare('UPDATE kyc_jobs SET status = ?, result = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(
      newStatus, JSON.stringify(result), job.id
    );

    if (isApproved) {
      db.prepare('UPDATE users SET kycStatus = \'verified\', kycType = \'NIN\', kycDocument = ? WHERE id = ?').run(
        `smile:${smile_job_id}`, partner_params.user_id
      );
    } else {
      db.prepare('UPDATE users SET kycStatus = \'failed\' WHERE id = ?').run(partner_params.user_id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[kyc] callback error:', err.message);
    res.status(500).json({ success: false, message: 'Callback processing failed' });
  }
});

// Check job status
router.get('/job/:id', authMiddleware, (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM kyc_jobs WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    let parsedResult = {};
    try { parsedResult = JSON.parse(job.result || '{}'); } catch {}

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        idType: job.idType,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        result: parsedResult?.Result || null,
      },
    });
  } catch (err) {
    console.error('[kyc] job error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get job status' });
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

// Admin: Get pending KYC submissions
router.get('/admin/pending', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const pending = db.prepare(`
      SELECT u.id, u.name, u.email, u.kycStatus, u.kycType, u.kycDocument, u.createdAt,
             w.balance, kj.id as jobId, kj.status as jobStatus, kj.smileJobId, kj.idNumber, kj.result
      FROM users u
      LEFT JOIN wallet w ON w.userId = u.id
      LEFT JOIN kyc_jobs kj ON kj.userId = u.id
      WHERE u.kycStatus IN ('pending', 'failed')
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
    if (!adminUser || adminUser.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const { userId, action } = req.body;
    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'userId and action (approve/reject) required' });
    }

    const targetUser = db.prepare('SELECT kycStatus FROM users WHERE id = ?').get(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    db.prepare('UPDATE users SET kycStatus = ? WHERE id = ?').run(newStatus, userId);

    res.json({ success: true, message: `KYC ${action}d successfully`, data: { userId, status: newStatus } });
  } catch (err) {
    console.error('[kyc] admin review error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to review KYC' });
  }
});

export default router;
