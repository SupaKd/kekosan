const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const adminController = require('../controllers/adminController');
const c = require('../controllers/adminCatalogController');
const authAdmin = require('../middlewares/authAdmin');
const { uploadProductImage, uploadFormulaImage } = require('../middlewares/uploadImage');

// Limite : 10 tentatives de login par IP sur 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/admin/login — public
router.post('/login', loginLimiter, adminController.login);

// GET /api/admin/service — public (lu par le frontend pour bloquer le checkout)
router.get('/service', c.getServiceStatus);

// Toutes les routes suivantes nécessitent un JWT valide
router.use(authAdmin);

// POST /api/admin/refresh — renouvelle le token (sliding window, évite la déco en service)
router.post('/refresh', adminController.refreshToken);

// ── Codes promo ──────────────────────────────────────────────────────────────
router.get('/promo-codes', c.getPromoCodes);
router.post('/promo-codes', c.createPromoCode);
router.put('/promo-codes/:id', c.updatePromoCode);
router.delete('/promo-codes/:id', c.deletePromoCode);

// ── Stats dashboard ──────────────────────────────────────────────────────────
router.get('/stats', adminController.getStats);

// ── Commandes ────────────────────────────────────────────────────────────────
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderById);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// ── Service ouvert/fermé ────────────────────────────────────────────────────
router.patch('/service', c.setServiceStatus);

// ── Catégories ──────────────────────────────────────────────────────────────
router.get('/categories', c.getCategories);
router.post('/categories', c.createCategory);
router.put('/categories/:id', c.updateCategory);
router.delete('/categories/:id', c.deleteCategory);

// ── Produits ────────────────────────────────────────────────────────────────
router.get('/products', c.getProducts);
router.post('/products', c.createProduct);
router.put('/products/:id', c.updateProduct);
router.delete('/products/:id', c.deleteProduct);
router.patch('/products/:id/available', c.toggleProduct);

// ── Image produit ────────────────────────────────────────────────────────────
router.post('/products/:id/image', uploadProductImage, c.uploadProductImage);
router.delete('/products/:id/image', c.deleteProductImage);

// ── Options ─────────────────────────────────────────────────────────────────
router.post('/products/:id/options', c.createOption);
router.put('/products/:id/options/:optionId', c.updateOption);
router.delete('/products/:id/options/:optionId', c.deleteOption);

// ── Formules ────────────────────────────────────────────────────────────────
router.get('/formulas', c.getFormulas);
router.post('/formulas', c.createFormula);
router.put('/formulas/:id', c.updateFormula);
router.delete('/formulas/:id', c.deleteFormula);
router.patch('/formulas/:id/available', c.toggleFormula);

// ── Image formule ────────────────────────────────────────────────────────────
router.post('/formulas/:id/image', uploadFormulaImage, c.uploadFormulaImage);
router.delete('/formulas/:id/image', c.deleteFormulaImage);

module.exports = router;
