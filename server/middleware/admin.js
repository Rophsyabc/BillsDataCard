import { authMiddleware } from './auth.js';
import db, { adminEmails } from '../data/db.js';

export function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Auto-promote if configured admin
    if (adminEmails.includes(user.email.toLowerCase()) && user.role !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
      user.role = 'admin';
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    if (!user.role || user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    req.user = user;
    next();
  });
}

