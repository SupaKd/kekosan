const pool = require('../config/db');

// Note: on utilise toujours `pool` directement — jamais require() inline

const findAll = async () => {
  const [formulas] = await pool.query(
    `SELECT id, name, description, price, available, sort_order, image_url FROM formulas ORDER BY sort_order, name`
  );
  if (formulas.length === 0) return [];

  const [slots] = await pool.query(
    `SELECT id, formula_id, slot_name, allowed_categories FROM formula_slots ORDER BY formula_id, id`
  );

  const slotsByFormula = {};
  for (const s of slots) {
    if (!slotsByFormula[s.formula_id]) slotsByFormula[s.formula_id] = [];
    slotsByFormula[s.formula_id].push({
      ...s,
      allowed_categories: s.allowed_categories
        ? s.allowed_categories.split(',').map(c => c.trim()).filter(Boolean)
        : [],
    });
  }

  return formulas.map(f => ({
    ...f,
    price: parseFloat(f.price),
    sort_order: f.sort_order ?? 0,
    slots: slotsByFormula[f.id] || [],
  }));
};

const create = async ({ name, description, price, available = 1, sort_order = 0, slots = [] }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO formulas (name, description, price, available, sort_order, image_url) VALUES (?, ?, ?, ?, ?, NULL)`,
      [name, description || null, price, available, sort_order]
    );
    const formulaId = result.insertId;
    for (const slot of slots) {
      await conn.query(
        `INSERT INTO formula_slots (formula_id, slot_name, allowed_categories) VALUES (?, ?, ?)`,
        [formulaId, slot.slot_name, slot.allowed_categories || '']
      );
    }
    await conn.commit();
    return formulaId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const update = async (id, { name, description, price, available, sort_order = 0, slots = [] }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE formulas SET name = ?, description = ?, price = ?, available = ?, sort_order = ? WHERE id = ?`,
      [name, description || null, price, available ? 1 : 0, sort_order, id]
    );
    // Remplace tous les slots existants
    await conn.query('DELETE FROM formula_slots WHERE formula_id = ?', [id]);
    for (const slot of slots) {
      await conn.query(
        `INSERT INTO formula_slots (formula_id, slot_name, allowed_categories) VALUES (?, ?, ?)`,
        [id, slot.slot_name, slot.allowed_categories || '']
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const remove = async (id) => {
  await pool.query('DELETE FROM formulas WHERE id = ?', [id]);
};

const setAvailable = async (id, available) => {
  await pool.query(
    'UPDATE formulas SET available = ? WHERE id = ?',
    [available ? 1 : 0, id]
  );
};

const getImageUrl = async (id) => {
  const [rows] = await pool.query('SELECT image_url FROM formulas WHERE id = ?', [id]);
  return rows[0]?.image_url || null;
};

const setImageUrl = async (id, imageUrl) => {
  await pool.query('UPDATE formulas SET image_url = ? WHERE id = ?', [imageUrl, id]);
};

module.exports = { findAll, create, update, remove, setAvailable, getImageUrl, setImageUrl };
