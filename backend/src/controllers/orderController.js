const orderService = require('../services/orderService');
const orderRepository = require('../repositories/orderRepository');
const { validatePromo } = require('../services/orderService');
const promoRepository = require('../repositories/promoRepository');

// POST /api/orders — crée une commande et retourne le client_secret Stripe
const createOrder = async (req, res, next) => {
  try {
    const result = await orderService.createOrder(req.body);
    res.status(201).json(result);
  } catch (err) {
    // Erreurs métier levées avec { status, message }
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
};

// GET /api/orders/:token — suivi de commande par tracking token (avec items et formules)
const getOrderByToken = async (req, res, next) => {
  try {
    const order = await orderRepository.findByTrackingToken(req.params.token);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }
    const fullOrder = await orderRepository.findFullOrderById(order.id);
    res.json(fullOrder);
  } catch (err) {
    next(err);
  }
};

// POST /api/orders/apply-promo — vérifie un code promo et retourne la remise
const applyPromo = async (req, res, next) => {
  try {
    const { promo_code, subtotal } = req.body;
    if (!promo_code || !subtotal || subtotal <= 0) {
      return res.status(400).json({ error: 'Code promo et montant requis' });
    }
    const result = await validatePromo(promo_code, parseFloat(subtotal));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// GET /api/orders/active-promos — codes promo publics actifs pour la bannière (code + type + valeur uniquement)
// Les codes préfixés par "PRV_" sont privés et ne sont jamais exposés ici
const getActivePromos = async (req, res, next) => {
  try {
    const all = await promoRepository.findAll();
    const now = new Date();
    const active = all.filter(p =>
      p.active &&
      !p.code.startsWith('PRV_') &&
      (!p.starts_at || new Date(p.starts_at) <= now) &&
      (!p.expires_at || new Date(p.expires_at) >= now)
    ).map(p => ({ code: p.code, type: p.type, value: p.value }));
    res.json(active);
  } catch (err) { next(err); }
};

module.exports = { createOrder, getOrderByToken, applyPromo, getActivePromos };
