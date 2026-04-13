const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const adminRepository = require('../repositories/adminRepository');
const orderRepository = require('../repositories/orderRepository');

const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'];

// POST /api/admin/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  if (email !== process.env.ADMIN_EMAIL) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
};

// POST /api/admin/refresh — renouvelle le token si encore valide (évite la déconnexion en service)
const refreshToken = (req, res) => {
  // req.admin est injecté par authAdmin — si on arrive ici le token est valide
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
};

// GET /api/admin/orders?status=&search=&date_from=&date_to=&page=&limit=
const getOrders = async (req, res, next) => {
  try {
    const { status, search, date_from, date_to, page, limit } = req.query;
    const result = await adminRepository.findOrders({
      status: status || null,
      search: search || null,
      date_from: date_from || null,
      date_to: date_to || null,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/orders/:id
const getOrderById = async (req, res, next) => {
  try {
    const order = await adminRepository.findOrderById(parseInt(req.params.id));
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/orders/:id/status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs acceptées : ${VALID_STATUSES.join(', ')}` });
    }

    const orderId = parseInt(req.params.id);
    const order = await adminRepository.findOrderById(orderId);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    await orderRepository.updateStatus(orderId, {
      status,
      payment_status: order.payment_status,
    });

    res.json({ success: true, order_id: orderId, status });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/orders/:id/refund
const refundOrder = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await adminRepository.findOrderById(orderId);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    if (order.payment_status !== 'paid')
      return res.status(400).json({ error: 'Cette commande n\'a pas été payée — remboursement impossible' });

    if (order.status === 'cancelled')
      return res.status(400).json({ error: 'Commande déjà annulée' });

    if (!order.stripe_payment_intent_id)
      return res.status(400).json({ error: 'Aucun identifiant Stripe sur cette commande' });

    // Remboursement total via Stripe
    await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });

    // Mise à jour DB : annulée + remboursée
    await orderRepository.updateStatus(orderId, {
      status: 'cancelled',
      payment_status: 'refunded',
    });

    res.json({ success: true, order_id: orderId });
  } catch (err) {
    // Erreur Stripe (ex: déjà remboursé)
    if (err.type?.startsWith('Stripe')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const stats = await adminRepository.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refreshToken, getOrders, getOrderById, updateOrderStatus, refundOrder, getStats };
