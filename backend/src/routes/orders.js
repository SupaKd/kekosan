const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const orderController = require('../controllers/orderController');
const validateOrder = require('../middlewares/validateOrder');

// Limite : 10 commandes par IP sur 15 minutes (anti-spam)
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de commandes envoyées. Réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/orders/active-promos — liste les codes promo actifs (public, pour la bannière)
router.get('/active-promos', orderController.getActivePromos);

// POST /api/orders/apply-promo — vérifie un code promo avant soumission (public)
router.post('/apply-promo', orderController.applyPromo);

// POST /api/orders — création de commande
router.post('/', orderLimiter, validateOrder, orderController.createOrder);

// GET /api/orders/:token — suivi de commande
router.get('/:token', orderController.getOrderByToken);

module.exports = router;
