import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import db from '../data/db.js';
import { generateToken, generateRefreshToken, verifyToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

function generateReferralCode() {
  return 'PB' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateVerificationToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ── Signup ──
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, referralCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = `USR-${uuidv4().slice(0, 8)}`;
    const userReferralCode = generateReferralCode();
    const verificationToken = generateVerificationToken();

    let referredBy = '';
    if (referralCode) {
      const referrer = db.prepare('SELECT id FROM users WHERE referralCode = ?').get(referralCode);
      if (referrer) referredBy = referrer.id;
    }

    db.prepare(`INSERT INTO users (id, name, email, phone, password, referralCode, referredBy) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(userId, name, email, phone || '', hashedPassword, userReferralCode, referredBy);
    db.prepare(`INSERT INTO wallet (userId, balance) VALUES (?, 0)`).run(userId);

    // Make first user admin
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 1) {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(userId);
    }

    const tokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO verification_tokens (token, userId, expiresAt) VALUES (?, ?, ?)`).run(verificationToken, userId, tokenExp);

    console.log(`[auth] Verification token for ${email}: ${verificationToken}`);

    const token = generateToken({ id: userId, email, name });
    const refreshToken = generateRefreshToken({ id: userId, email });

    const sessionId = `SES-${uuidv4().slice(0, 8)}`;
    db.prepare(`INSERT INTO sessions (id, userId, token, device, ip) VALUES (?, ?, ?, ?, ?)`).run(sessionId, userId, refreshToken, req.headers['user-agent'] || '', req.ip);

    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      data: {
        user: { id: userId, name, email, phone: phone || '', emailVerified: false, referralCode: userReferralCode, role: 'user', status: 'active' },
        token,
        refreshToken,
        verificationToken,
      },
    });
  } catch (err) {
    console.error('[auth] Signup error:', err.message);
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
});

// ── Login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.twoFactorEnabled) {
      const tempToken = generateToken({ id: user.id, email: user.email, pending2FA: true });
      return res.json({ success: true, data: { requires2FA: true, tempToken } });
    }

    const token = generateToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    const sessionId = `SES-${uuidv4().slice(0, 8)}`;
    db.prepare(`INSERT INTO sessions (id, userId, token, device, ip) VALUES (?, ?, ?, ?, ?)`).run(sessionId, user.id, refreshToken, req.headers['user-agent'] || '', req.ip);

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, emailVerified: !!user.emailVerified, photo: user.photo, referralCode: user.referralCode, twoFactorEnabled: !!user.twoFactorEnabled, role: user.role, status: user.status },
        token,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('[auth] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ── Verify 2FA ──
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ success: false, message: 'Token and code required' });
    }

    const decoded = verifyToken(tempToken);
    if (!decoded?.pending2FA) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA code' });
    }

    const tokenNew = generateToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    const sessionId = `SES-${uuidv4().slice(0, 8)}`;
    db.prepare(`INSERT INTO sessions (id, userId, token, device, ip) VALUES (?, ?, ?, ?, ?)`).run(sessionId, user.id, refreshToken, req.headers['user-agent'] || '', req.ip);

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, emailVerified: !!user.emailVerified, photo: user.photo, referralCode: user.referralCode, twoFactorEnabled: true, role: user.role, status: user.status },
        token: tokenNew,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('[auth] 2FA verify error:', err.message);
    res.status(500).json({ success: false, message: '2FA verification failed' });
  }
});

// ── Setup 2FA ──
router.post('/setup-2fa', authMiddleware, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const secret = speakeasy.generateSecret({ name: `PayBills (${user.email})` });
    const otpauthUrl = secret.otpauth_url;

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    db.prepare('UPDATE users SET twoFactorSecret = ? WHERE id = ?').run(secret.base32, user.id);

    res.json({ success: true, data: { secret: secret.base32, qrCode: qrCodeUrl } });
  } catch (err) {
    console.error('[auth] 2FA setup error:', err.message);
    res.status(500).json({ success: false, message: '2FA setup failed' });
  }
});

// ── Enable 2FA ──
router.post('/enable-2fa', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid code' });
    }

    db.prepare('UPDATE users SET twoFactorEnabled = 1 WHERE id = ?').run(user.id);
    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
});

// ── Disable 2FA ──
router.post('/disable-2fa', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid password' });

    db.prepare('UPDATE users SET twoFactorEnabled = 0, twoFactorSecret = "" WHERE id = ?').run(user.id);
    res.json({ success: true, message: '2FA disabled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
});

// ── Verify Email ──
router.post('/verify-email', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const record = db.prepare('SELECT * FROM verification_tokens WHERE token = ?').get(token);
    if (!record) return res.status(400).json({ success: false, message: 'Invalid token' });
    if (new Date(record.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'Token expired' });
    }

    db.prepare('UPDATE users SET emailVerified = 1 WHERE id = ?').run(record.userId);
    db.prepare('DELETE FROM verification_tokens WHERE token = ?').run(token);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(record.userId);
    res.json({ success: true, message: 'Email verified', data: { user: { id: user.id, name: user.name, email: user.email, emailVerified: true } } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ── Google OAuth ──
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId, photo } = req.body;
    if (!email || !googleId) return res.status(400).json({ success: false, message: 'Google data required' });

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      const userId = `USR-${uuidv4().slice(0, 8)}`;
      const referralCode = generateReferralCode();
      db.prepare(`INSERT INTO users (id, name, email, phone, password, photo, emailVerified, referralCode) VALUES (?, ?, ?, '', '', ?, 1, ?)`).run(userId, name || email.split('@')[0], email, photo || '', referralCode);
    db.prepare(`INSERT INTO wallet (userId, balance) VALUES (?, 50000)`).run(userId);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }

    const token = generateToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    const sessionId = `SES-${uuidv4().slice(0, 8)}`;
    db.prepare(`INSERT INTO sessions (id, userId, token, device, ip) VALUES (?, ?, ?, ?, ?)`).run(sessionId, user.id, refreshToken, req.headers['user-agent'] || '', req.ip);

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, emailVerified: !!user.emailVerified, photo: user.photo, referralCode: user.referralCode, role: user.role, status: user.status },
        token,
        refreshToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Google auth failed' });
  }
});

// ── Refresh Token ──
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const decoded = verifyToken(refreshToken);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const newToken = generateToken({ id: user.id, email: user.email, name: user.name });
    const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email });

    res.json({ success: true, data: { token: newToken, refreshToken: newRefreshToken } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ── Get Profile ──
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const wallet = db.prepare('SELECT * FROM wallet WHERE userId = ?').get(user.id);
    res.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, phone: user.phone, emailVerified: !!user.emailVerified, photo: user.photo, referralCode: user.referralCode, twoFactorEnabled: !!user.twoFactorEnabled, balance: wallet?.balance || 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

// ── Update Profile ──
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?').run(name, phone, req.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ── Change Password ──
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// ── Sessions ──
router.get('/sessions', authMiddleware, (req, res) => {
  try {
    const sessions = db.prepare('SELECT * FROM sessions WHERE userId = ? ORDER BY lastActive DESC').all(req.user.id);
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get sessions' });
  }
});

router.delete('/sessions/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM sessions WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
    res.json({ success: true, message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to revoke session' });
  }
});

router.delete('/sessions', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM sessions WHERE userId = ?').run(req.user.id);
    res.json({ success: true, message: 'All sessions revoked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to revoke sessions' });
  }
});

export default router;
