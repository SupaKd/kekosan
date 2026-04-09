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

// ── Produits ────────────────────────────────────────────────────────────────

const getProducts = async (req, res, next) => {
  try {
    res.json(await productAdminRepository.findAll());
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const { category, name, description, price, available, sort_order } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    if (isNaN(parseFloat(price))) return res.status(400).json({ error: 'Prix invalide' });
    const categories = await categoryRepository.findAll();
    if (!categories.find(c => c.slug === category)) return res.status(400).json({ error: 'Catégorie invalide' });
    const id = await productAdminRepository.create({ category, name: name.trim(), description, price: parseFloat(price), available: available !== false ? 1 : 0, sort_order: sort_order || 0 });
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const { category, name, description, price, available, sort_order } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    if (isNaN(parseFloat(price))) return res.status(400).json({ error: 'Prix invalide' });
    const categories = await categoryRepository.findAll();
    if (!categories.find(c => c.slug === category)) return res.status(400).json({ error: 'Catégorie invalide' });
    await productAdminRepository.update(parseInt(req.params.id), { category, name: name.trim(), description, price: parseFloat(price), available: available ? 1 : 0, sort_order: sort_order || 0 });
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

module.exports = {
  getServiceStatus, setServiceStatus,
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
