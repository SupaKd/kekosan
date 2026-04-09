const pool = require('../config/db');

const findAll = async () => {
  const [rows] = await pool.query(
    'SELECT id, slug, label, sort_order FROM categories ORDER BY sort_order, label'
  );
  return rows;
};

const create = async ({ slug, label, sort_order = 0 }) => {
  const [result] = await pool.query(
    'INSERT INTO categories (slug, label, sort_order) VALUES (?, ?, ?)',
    [slug, label, sort_order]
  );
  return result.insertId;
};

const update = async (id, { slug, label, sort_order }) => {
  await pool.query(
    'UPDATE categories SET slug = ?, label = ?, sort_order = ? WHERE id = ?',
    [slug, label, sort_order, id]
  );
};

const countProductsBySlug = async (slug) => {
  const [[row]] = await pool.query(
    'SELECT COUNT(*) as cnt FROM products WHERE category = ?',
    [slug]
  );
  return row.cnt;
};

const remove = async (id) => {
  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
};

module.exports = { findAll, create, update, remove, countProductsBySlug };
