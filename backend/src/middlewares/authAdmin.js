const jwt = require('jsonwebtoken');

// Vérifie le token JWT dans le header Authorization
const authAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

module.exports = authAdmin;
