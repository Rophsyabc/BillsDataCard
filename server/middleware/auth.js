import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

const TOKEN_REVOKED = new Set();

export function revokeToken(tokenId) {
  TOKEN_REVOKED.add(tokenId);
  if (TOKEN_REVOKED.size > 10000) {
    const arr = [...TOKEN_REVOKED];
    TOKEN_REVOKED.clear();
    arr.slice(-5000).forEach(t => TOKEN_REVOKED.add(t));
  }
}

export function isTokenRevoked(tokenId) {
  return TOKEN_REVOKED.has(tokenId);
}

export function generateToken(user) {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, jti },
    JWT_SECRET,
    { expiresIn: '1h', issuer: 'paybills', audience: 'paybills-api' }
  );
}

export function generateRefreshToken(user) {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { id: user.id, email: user.email, jti, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d', issuer: 'paybills', audience: 'paybills-api' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'paybills',
    audience: 'paybills-api',
  });
}

export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'paybills',
    audience: 'paybills-api',
  });
  if (TOKEN_REVOKED.has(decoded.jti)) {
    throw new Error('Refresh token revoked');
  }
  return decoded;
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    if (TOKEN_REVOKED.has(decoded.jti)) {
      return res.status(401).json({ success: false, message: 'Token revoked' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
