const pool = require('../config/db');

// Récupère toutes les formules disponibles avec leurs slots
const findAllAvailable = async () => {
  const [formulas] = await pool.query(
    `SELECT id, name, description, badge, allergens, price, image_url
     FROM formulas
     WHERE available = 1
     ORDER BY sort_order, name`
  );

  if (formulas.length === 0) return [];

  const formulaIds = formulas.map((f) => f.id);

  const [slots] = await pool.query(
    `SELECT id, formula_id, slot_name, allowed_categories, required, sort_order
     FROM formula_slots
     WHERE formula_id IN (?)
     ORDER BY formula_id, sort_order, id`,
    [formulaIds]
  );

  // Attache les slots à chaque formule
  const slotsByFormula = {};
  for (const slot of slots) {
    if (!slotsByFormula[slot.formula_id]) slotsByFormula[slot.formula_id] = [];
    slotsByFormula[slot.formula_id].push({
      id: slot.id,
      slot_name: slot.slot_name,
      required: slot.required === 1,
      sort_order: slot.sort_order ?? 0,
      allowed_categories: slot.allowed_categories.split(',').map((c) => c.trim()),
    });
  }

  return formulas.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    badge: f.badge || null,
    allergens: Array.isArray(f.allergens) ? f.allergens : (f.allergens && f.allergens !== '' ? JSON.parse(f.allergens) : []),
    price: parseFloat(f.price),
    image_url: f.image_url || null,
    slots: slotsByFormula[f.id] || [],
  }));
};

// Récupère une formule par son id avec ses slots (pour validation commande)
const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, name, price, available
     FROM formulas
     WHERE id = ?`,
    [id]
  );
  if (!rows[0]) return null;

  const [slots] = await pool.query(
    `SELECT id, slot_name, allowed_categories, required
     FROM formula_slots
     WHERE formula_id = ?
     ORDER BY id`,
    [id]
  );

  return {
    ...rows[0],
    price: parseFloat(rows[0].price),
    slots: slots.map((s) => ({
      id: s.id,
      slot_name: s.slot_name,
      required: s.required === 1,
      allowed_categories: s.allowed_categories.split(',').map((c) => c.trim()),
    })),
  };
};

module.exports = { findAllAvailable, findById };
