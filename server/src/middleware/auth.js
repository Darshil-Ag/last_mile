const jwt = require('jsonwebtoken');

/**
 * Verify Bearer JWT and attach decoded payload to req.user.
 * Payload shape: { userId, email, role }
 */
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Role guard — call after verifyJWT.
 * Usage: requireRole('ADMIN') or requireRole('ADMIN', 'AGENT')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access restricted to: ${roles.join(', ')}` });
  }
  next();
};

module.exports = { verifyJWT, requireRole };
