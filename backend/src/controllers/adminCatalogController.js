const settingsRepository = require('../repositories/settingsRepository');
const productAdminRepository = require('../repositories/productAdminRepository');
const formulaAdminRepository = require('../repositories/formulaAdminRepository');
const categoryRepository = require('../repositories/categoryRepository');
const promoRepository = require('../repositories/promoRepository');
const { deleteOldImage } = require('../middlewares/uploadImage');
// Note: uploadFormulaImage est utilisé comme middleware dans les routes

// ── Catégories ───────────────────────────────────────────────────────────────

const getCategories = async (req, res, next) => {
  try {
    res.json(await categoryRepository.findAll());
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const { slug, label, sort_order } = req.body;
    if (!slug?.trim()) return res.status(400).json({ error: 'Slug requis' });
    if (!label?.trim()) return res.status(400).json({ error: 'Label requis' });
    if (!/^[a-z0-9_-]+$/.test(slug.trim())) return res.status(400).json({ error: 'Slug invalide (lettres minuscules, chiffres, tirets uniquement)' });
    const id = await categoryRepository.create({ slug: slug.trim(), label: label.trim(), sort_order: parseInt(sort_order) || 0 });
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ce slug existe déjà' });
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { label, sort_order } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: 'Label requis' });

    const id = parseInt(req.params.id);
    // Récupère le slug existant — il ne peut pas être changé
    const categories = await categoryRepository.findAll();
    const existing = categories.find(c => c.id === id);
    if (!existing) return res.status(404).json({ error: 'Catégorie introuvable' });

    await categoryRepository.update(id, { slug: existing.slug, label: label.trim(), sort_order: parseInt(sort_order) || 0 });
    res.json({ success: true });
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const categories = await categoryRepository.findAll();
    const cat = categories.find(c => c.id === id);
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });

    const productCount = await categoryRepository.countProductsBySlug(cat.slug);
    if (productCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer : ${productCount} produit(s) utilisent cette catégorie. Réassignez-les d'abord.`,
      });
    }

    await categoryRepository.remove(id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Service ouvert/fermé ────────────────────────────────────────────────────

const getServiceStatus = async (req, res, next) => {
  try {
    const value = await settingsRepository.get('service_open');
    res.json({ service_open: value === 'true' });
  } catch (err) { next(err); }
};

const setServiceStatus = async (req, res, next) => {
  try {
    const { open } = req.body;
    if (typeof open !== 'boolean') return res.status(400).json({ error: 'Champ open (boolean) requis' });
    await settingsRepository.set('service_open', String(open));
    res.json({ service_open: open });
  } catch (err) { next(err); }
};

// ── Horaires d'ouverture ────────────────────────────────────────────────────

const getSchedule = async (req, res, next) => {
  try {
    const opening = await settingsRepository.get('opening_hour');
    const closing = await settingsRepository.get('closing_hour');
    res.json({
      opening_hour: parseInt(opening ?? '11'),
      closing_hour: parseInt(closing ?? '15'),
    });
  } catch (err) { next(err); }
};

const setSchedule = async (req, res, next) => {
  try {
    const { opening_hour, closing_hour } = req.body;
    if (!Number.isInteger(opening_hour) || opening_hour < 0 || opening_hour > 23)
      return res.status(400).json({ error: 'opening_hour invalide (0-23)' });
    if (!Number.isInteger(closing_hour) || closing_hour < 0 || closing_hour > 24)
      return res.status(400).json({ error: 'closing_hour invalide (0-24)' });
    if (closing_hour <= opening_hour)
      return res.status(400).json({ error: 'closing_hour doit être après opening_hour' });
    await settingsRepository.set('opening_hour', String(opening_hour));
    await settingsRepository.set('closing_hour', String(closing_hour));
    res.json({ opening_hour, closing_hour });
  } catch (err) { next(err); }
};

// ── Produits ────────────────────────────────────────────────────────────────

const getProducts = async (req, res, next) => {
  try {
    res.json(await productAdminRepository.findAll());
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const { category, name, description, price, available, sort_order, formula_quantity } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    if (isNaN(parseFloat(price))) return res.status(400).json({ error: 'Prix invalide' });
    const categories = await categoryRepository.findAll();
    if (!categories.find(c => c.slug === category)) return res.status(400).json({ error: 'Catégorie invalide' });
    const id = await productAdminRepository.create({ category, name: name.trim(), description, price: parseFloat(price), available: available !== false ? 1 : 0, sort_order: sort_order || 0, formula_quantity: formula_quantity || null });
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const { category, name, description, price, available, sort_order, formula_quantity } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    if (isNaN(parseFloat(price))) return res.status(400).json({ error: 'Prix invalide' });
    const categories = await categoryRepository.findAll();
    if (!categories.find(c => c.slug === category)) return res.status(400).json({ error: 'Catégorie invalide' });
    await productAdminRepository.update(parseInt(req.params.id), { category, name: name.trim(), description, price: parseFloat(price), available: available ? 1 : 0, sort_order: sort_order || 0, formula_quantity: formula_quantity || null });
    res.json({ success: true });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productAdminRepository.remove(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
};

const toggleProduct = async (req, res, next) => {
  try {
    const { available } = req.body;
    if (typeof available !== 'boolean') return res.status(400).json({ error: 'Champ available (boolean) requis' });
    await productAdminRepository.setAvailable(parseInt(req.params.id), available);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Options ─────────────────────────────────────────────────────────────────

const createOption = async (req, res, next) => {
  try {
    const { name, price_delta, available } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    const id = await productAdminRepository.createOption(parseInt(req.params.id), { name: name.trim(), price_delta: parseFloat(price_delta) || 0, available: available !== false ? 1 : 0 });
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

const updateOption = async (req, res, next) => {
  try {
    const { name, price_delta, available } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    await productAdminRepository.updateOption(parseInt(req.params.optionId), { name: name.trim(), price_delta: parseFloat(price_delta) || 0, available });
    res.json({ success: true });
  } catch (err) { next(err); }
};

const deleteOption = async (req, res, next) => {
  try {
    await productAdminRepository.removeOption(parseInt(req.params.optionId));
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Image produit ────────────────────────────────────────────────────────────

const uploadProductImage = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    // Supprimer l'ancienne image si elle existe
    const oldUrl = await productAdminRepository.getImageUrl(id);
    deleteOldImage(oldUrl);

    const imageUrl = `/uploads/${req.uploadedFilename}`;
    await productAdminRepository.setImageUrl(id, imageUrl);
    res.json({ image_url: imageUrl });
  } catch (err) { next(err); }
};

const deleteProductImage = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const oldUrl = await productAdminRepository.getImageUrl(id);
    deleteOldImage(oldUrl);
    await productAdminRepository.setImageUrl(id, null);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Formules ────────────────────────────────────────────────────────────────

const getFormulas = async (req, res, next) => {
  try {
    res.json(await formulaAdminRepository.findAll());
  } catch (err) { next(err); }
};

const createFormula = async (req, res, next) => {
  try {
    const { name, description, price, available, sort_order, slots } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    if (isNaN(parseFloat(price))) return res.status(400).json({ error: 'Prix invalide' });
    if (!Array.isArray(slots) || slots.length === 0) return res.status(400).json({ error: 'Au moins un slot requis' });
    const id = await formulaAdminRepository.create({ name: name.trim(), description, price: parseFloat(price), available: available !== false ? 1 : 0, sort_order: parseInt(sort_order) || 0, slots });
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

const updateFormula = async (req, res, next) => {
  try {
    const { name, description, price, available, sort_order, slots } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    if (isNaN(parseFloat(price))) return res.status(400).json({ error: 'Prix invalide' });
    if (!Array.isArray(slots) || slots.length === 0) return res.status(400).json({ error: 'Au moins un slot requis' });
    await formulaAdminRepository.update(parseInt(req.params.id), { name: name.trim(), description, price: parseFloat(price), available, sort_order: parseInt(sort_order) || 0, slots });
    res.json({ success: true });
  } catch (err) { next(err); }
};

const deleteFormula = async (req, res, next) => {
  try {
    await formulaAdminRepository.remove(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
};

const toggleFormula = async (req, res, next) => {
  try {
    const { available } = req.body;
    if (typeof available !== 'boolean') return res.status(400).json({ error: 'Champ available (boolean) requis' });
    await formulaAdminRepository.setAvailable(parseInt(req.params.id), available);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Image formule ────────────────────────────────────────────────────────────

const uploadFormulaImage = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const oldUrl = await formulaAdminRepository.getImageUrl(id);
    deleteOldImage(oldUrl);

    const imageUrl = `/uploads/${req.uploadedFilename}`;
    await formulaAdminRepository.setImageUrl(id, imageUrl);
    res.json({ image_url: imageUrl });
  } catch (err) { next(err); }
};

const deleteFormulaImage = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const oldUrl = await formulaAdminRepository.getImageUrl(id);
    deleteOldImage(oldUrl);
    await formulaAdminRepository.setImageUrl(id, null);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Paramètres créneaux ───────────────────────────────────────────────────────

const getSlotSettings = async (req, res, next) => {
  try {
    const interval = await settingsRepository.get('slot_interval');
    const delay    = await settingsRepository.get('min_delivery_delay');
    res.json({
      slot_interval:      parseInt(interval ?? '30'),
      min_delivery_delay: parseInt(delay    ?? '30'),
    });
  } catch (err) { next(err); }
};

const setSlotSettings = async (req, res, next) => {
  try {
    const { slot_interval, min_delivery_delay } = req.body;
    if (!Number.isInteger(slot_interval) || slot_interval < 5 || slot_interval > 60)
      return res.status(400).json({ error: 'slot_interval invalide (5–60 min)' });
    if (!Number.isInteger(min_delivery_delay) || min_delivery_delay < 0 || min_delivery_delay > 120)
      return res.status(400).json({ error: 'min_delivery_delay invalide (0–120 min)' });
    await settingsRepository.set('slot_interval',      String(slot_interval));
    await settingsRepository.set('min_delivery_delay', String(min_delivery_delay));
    res.json({ slot_interval, min_delivery_delay });
  } catch (err) { next(err); }
};

// ── Message de maintenance ────────────────────────────────────────────────────

const getMaintenanceMessage = async (req, res, next) => {
  try {
    const msg = await settingsRepository.get('maintenance_message');
    res.json({ maintenance_message: msg ?? 'Le service est momentanément fermé. Revenez bientôt !' });
  } catch (err) { next(err); }
};

const setMaintenanceMessage = async (req, res, next) => {
  try {
    const { maintenance_message } = req.body;
    if (typeof maintenance_message !== 'string' || !maintenance_message.trim())
      return res.status(400).json({ error: 'maintenance_message invalide' });
    await settingsRepository.set('maintenance_message', maintenance_message.trim());
    res.json({ maintenance_message: maintenance_message.trim() });
  } catch (err) { next(err); }
};

// ── Disponibilité des créneaux ────────────────────────────────────────────────

const getSlotAvailability = async (req, res, next) => {
  try {
    const orderRepository = require('../repositories/orderRepository');
    const maxRaw = await settingsRepository.get('max_orders_per_slot');
    const max = parseInt(maxRaw ?? '5');
    const counts = await orderRepository.getSlotCounts();
    // Retourne un objet { 'YYYY-MM-DD|HH:MM': countRestant, ... } — créneaux pleins ont 0
    const availability = {};
    for (const row of counts) {
      const key = `${row.date instanceof Date ? row.date.toISOString().slice(0,10) : String(row.date).slice(0,10)}|${row.delivery_time}`;
      availability[key] = Math.max(0, max - Number(row.cnt));
    }
    res.json({ availability, max_orders_per_slot: max });
  } catch (err) { next(err); }
};

const getMaxOrdersPerSlot = async (req, res, next) => {
  try {
    const raw = await settingsRepository.get('max_orders_per_slot');
    res.json({ max_orders_per_slot: parseInt(raw ?? '5') });
  } catch (err) { next(err); }
};

const setMaxOrdersPerSlot = async (req, res, next) => {
  try {
    const { max_orders_per_slot } = req.body;
    if (!Number.isInteger(max_orders_per_slot) || max_orders_per_slot < 1)
      return res.status(400).json({ error: 'max_orders_per_slot invalide (entier ≥ 1)' });
    await settingsRepository.set('max_orders_per_slot', String(max_orders_per_slot));
    res.json({ max_orders_per_slot });
  } catch (err) { next(err); }
};

// ── Jours de fermeture exceptionnelle ────────────────────────────────────────

const getClosedDays = async (req, res, next) => {
  try {
    const raw = await settingsRepository.get('closed_days');
    const days = raw ? JSON.parse(raw) : [];
    res.json({ closed_days: days });
  } catch (err) { next(err); }
};

const setClosedDays = async (req, res, next) => {
  try {
    const { closed_days } = req.body;
    if (!Array.isArray(closed_days)) return res.status(400).json({ error: 'closed_days doit être un tableau' });
    // Valide chaque date au format YYYY-MM-DD
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    for (const d of closed_days) {
      if (typeof d !== 'string' || !dateRe.test(d) || isNaN(Date.parse(d)))
        return res.status(400).json({ error: `Date invalide : ${d}` });
    }
    // Dédoublonne et trie
    const unique = [...new Set(closed_days)].sort();
    await settingsRepository.set('closed_days', JSON.stringify(unique));
    res.json({ closed_days: unique });
  } catch (err) { next(err); }
};

// ── Paramètres livraison ─────────────────────────────────────────────────────

const getDeliverySettings = async (req, res, next) => {
  try {
    const fee       = await settingsRepository.get('delivery_fee');
    const threshold = await settingsRepository.get('free_delivery_threshold');
    const minOrder  = await settingsRepository.get('min_order_amount');
    res.json({
      delivery_fee:            parseFloat(fee       ?? '5'),
      free_delivery_threshold: parseFloat(threshold ?? '20'),
      min_order_amount:        parseFloat(minOrder  ?? '20'),
    });
  } catch (err) { next(err); }
};

const setDeliverySettings = async (req, res, next) => {
  try {
    const { delivery_fee, free_delivery_threshold, min_order_amount } = req.body;
    if (isNaN(parseFloat(delivery_fee)) || parseFloat(delivery_fee) < 0)
      return res.status(400).json({ error: 'delivery_fee invalide (≥ 0)' });
    if (isNaN(parseFloat(free_delivery_threshold)) || parseFloat(free_delivery_threshold) < 0)
      return res.status(400).json({ error: 'free_delivery_threshold invalide (≥ 0)' });
    if (isNaN(parseFloat(min_order_amount)) || parseFloat(min_order_amount) < 0)
      return res.status(400).json({ error: 'min_order_amount invalide (≥ 0)' });
    await settingsRepository.set('delivery_fee',            String(parseFloat(delivery_fee)));
    await settingsRepository.set('free_delivery_threshold', String(parseFloat(free_delivery_threshold)));
    await settingsRepository.set('min_order_amount',        String(parseFloat(min_order_amount)));
    res.json({ delivery_fee: parseFloat(delivery_fee), free_delivery_threshold: parseFloat(free_delivery_threshold), min_order_amount: parseFloat(min_order_amount) });
  } catch (err) { next(err); }
};

module.exports = {
  getServiceStatus, setServiceStatus,
  getSchedule, setSchedule,
  getSlotSettings, setSlotSettings,
  getMaintenanceMessage, setMaintenanceMessage,
  getSlotAvailability, getMaxOrdersPerSlot, setMaxOrdersPerSlot,
  getClosedDays, setClosedDays,
  getDeliverySettings, setDeliverySettings,
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, createProduct, updateProduct, deleteProduct, toggleProduct,
  createOption, updateOption, deleteOption,
  uploadProductImage, deleteProductImage,
  getFormulas, createFormula, updateFormula, deleteFormula, toggleFormula,
  uploadFormulaImage, deleteFormulaImage,
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
};

// ── Codes promo ───────────────────────────────────────────────────────────────

async function getPromoCodes(req, res, next) {
  try {
    const promos = await promoRepository.findAll();
    res.json(promos);
  } catch (err) { next(err); }
}

async function createPromoCode(req, res, next) {
  try {
    const { code, type, value, starts_at, expires_at, active } = req.body;
    if (!code || !type || value == null) {
      return res.status(400).json({ error: 'code, type et value sont requis' });
    }
    if (!['percent', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'type doit être "percent" ou "fixed"' });
    }
    if (type === 'percent' && (parseFloat(value) <= 0 || parseFloat(value) > 100)) {
      return res.status(400).json({ error: 'Un pourcentage doit être entre 1 et 100' });
    }
    const id = await promoRepository.create({ code, type, value: parseFloat(value), starts_at, expires_at, active: active !== false });
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ce code promo existe déjà' });
    }
    next(err);
  }
}

async function updatePromoCode(req, res, next) {
  try {
    const { type, value, starts_at, expires_at, active } = req.body;
    await promoRepository.update(req.params.id, { type, value: parseFloat(value), starts_at, expires_at, active });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function deletePromoCode(req, res, next) {
  try {
    await promoRepository.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}
