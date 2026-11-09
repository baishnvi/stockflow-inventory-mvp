const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const sign = (user) =>
  jwt.sign({ uid: user.id, oid: user.organization_id, email: user.email }, SECRET, { expiresIn: '7d' });

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const p = jwt.verify(token, SECRET);
    req.user = { id: p.uid, orgId: p.oid, email: p.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
module.exports = { sign, requireAuth };
