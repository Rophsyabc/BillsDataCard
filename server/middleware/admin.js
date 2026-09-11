import { authMiddleware } from './auth.js';
import db from '../data/db.js';

export function adminMiddleware(req, res, next) {
  authMiddleware(req, res, (err) => {
    if (err) return;

    const user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.status === 'banned' || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    req.user = user;
    next();
  });
}
