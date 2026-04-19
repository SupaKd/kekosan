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

// GET /api/admin/schedule — public (lu par le frontend pour afficher les créneaux)
router.get('/schedule', c.getSchedule);

// GET /api/admin/maintenance-message — public (lu par le frontend quand le service est fermé)
router.get('/maintenance-message', c.getMaintenanceMessage);

// GET /api/admin/slot-settings — public (intervalle et délai minimum)
router.get('/slot-settings', c.getSlotSettings);

// GET /api/admin/delivery-settings — public (lu par le frontend pour frais livraison et min commande)
router.get('/delivery-settings', c.getDeliverySettings);

// GET /api/admin/open-days — public (jours de livraison actifs)
router.get('/open-days', c.getOpenDays);

// GET /api/admin/closed-days — public (lu par le frontend pour bloquer les créneaux)
router.get('/closed-days', c.getClosedDays);

// GET /api/admin/slot-availability — public (créneaux saturés, lu par le checkout)
router.get('/slot-availability', c.getSlotAvailability);

// GET /api/admin/max-orders-per-slot — public
router.get('/max-orders-per-slot', c.getMaxOrdersPerSlot);

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
router.get('/orders/export.csv', adminController.exportOrdersCsv);
router.get('/orders/:id', adminController.getOrderById);
router.patch('/orders/:id/status', adminController.updateOrderStatus);
router.post('/orders/:id/refund', adminController.refundOrder);

// ── Service ouvert/fermé ────────────────────────────────────────────────────
router.patch('/service', c.setServiceStatus);

// ── Horaires d'ouverture ────────────────────────────────────────────────────
router.put('/schedule', c.setSchedule);

// ── Message de maintenance ──────────────────────────────────────────────────
router.put('/maintenance-message', c.setMaintenanceMessage);

// ── Paramètres créneaux ─────────────────────────────────────────────────────
router.put('/slot-settings', c.setSlotSettings);

// ── Paramètres livraison ────────────────────────────────────────────────────
router.put('/delivery-settings', c.setDeliverySettings);

// ── Jours d'ouverture ───────────────────────────────────────────────────────
router.put('/open-days', c.setOpenDays);

// ── Jours de fermeture ──────────────────────────────────────────────────────
router.put('/closed-days', c.setClosedDays);

// ── Limite commandes par créneau ─────────────────────────────────────────────
router.put('/max-orders-per-slot', c.setMaxOrdersPerSlot);

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
