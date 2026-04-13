const pool = require('../config/db');

// ── Produits ────────────────────────────────────────────────────────────────

const findAll = async () => {
  const [products] = await pool.query(
    `SELECT id, category, name, description, badge, allergens, image_url, price, available, sort_order, formula_quantity
     FROM products ORDER BY category, sort_order, name`
  );
  if (products.length === 0) return [];

  const [options] = await pool.query(
    `SELECT id, product_id, name, price_delta, available
     FROM product_options ORDER BY product_id, name`
  );

  const optsByProduct = {};
  for (const opt of options) {
    if (!optsByProduct[opt.product_id]) optsByProduct[opt.product_id] = [];
    optsByProduct[opt.product_id].push(opt);
  }

  return products.map(p => ({
    ...p,
    price: parseFloat(p.price),
    allergens: p.allergens ? (typeof p.allergens === 'string' ? JSON.parse(p.allergens) : p.allergens) : [],
    options: optsByProduct[p.id] || [],
  }));
};

const create = async ({ category, name, description, badge, allergens, price, available = 1, sort_order = 0, formula_quantity = null }) => {
  const [result] = await pool.query(
    `INSERT INTO products (category, name, description, badge, allergens, price, available, sort_order, formula_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [category, name, description || null, badge || null, allergens ? JSON.stringify(allergens) : null, price, available, sort_order, formula_quantity || null]
  );
  return result.insertId;
};

const update = async (id, { category, name, description, badge, allergens, price, available, sort_order, formula_quantity }) => {
  await pool.query(
    `UPDATE products SET category = ?, name = ?, description = ?, badge = ?, allergens = ?, price = ?,
     available = ?, sort_order = ?, formula_quantity = ? WHERE id = ?`,
    [category, name, description || null, badge || null, allergens ? JSON.stringify(allergens) : null, price, available, sort_order, formula_quantity || null, id]
  );
};

const setImageUrl = async (id, image_url) => {
  await pool.query('UPDATE products SET image_url = ? WHERE id = ?', [image_url, id]);
};

const getImageUrl = async (id) => {
  const [[row]] = await pool.query('SELECT image_url FROM products WHERE id = ?', [id]);
  return row?.image_url || null;
};

const remove = async (id) => {
  await pool.query('DELETE FROM products WHERE id = ?', [id]);
};

const setAvailable = async (id, available) => {
  await pool.query('UPDATE products SET available = ? WHERE id = ?', [available ? 1 : 0, id]);
};

// ── Options ─────────────────────────────────────────────────────────────────

const createOption = async (productId, { name, price_delta = 0, available = 1 }) => {
  const [result] = await pool.query(
    `INSERT INTO product_options (product_id, name, price_delta, available) VALUES (?, ?, ?, ?)`,
    [productId, name, price_delta, available]
  );
  return result.insertId;
};

const updateOption = async (id, { name, price_delta, available }) => {
  await pool.query(
    `UPDATE product_options SET name = ?, price_delta = ?, available = ? WHERE id = ?`,
    [name, price_delta, available ? 1 : 0, id]
  );
};

const removeOption = async (id) => {
  await pool.query('DELETE FROM product_options WHERE id = ?', [id]);
};

module.exports = { findAll, create, update, remove, setAvailable, setImageUrl, getImageUrl, createOption, updateOption, removeOption };
