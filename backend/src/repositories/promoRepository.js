const pool = require('../config/db');

// Récupère un code promo par son code (insensible à la casse)
const findByCode = async (code) => {
  const [rows] = await pool.query(
    `SELECT id, code, type, value, starts_at, expires_at, active
     FROM promo_codes WHERE code = ?`,
    [code.toUpperCase()]
  );
  return rows[0] || null;
};

// Liste tous les codes promo (admin)
const findAll = async () => {
  const [rows] = await pool.query(
    `SELECT id, code, type, value, starts_at, expires_at, active, created_at
     FROM promo_codes ORDER BY created_at DESC`
  );
  return rows;
};

// Crée un code promo
const create = async ({ code, type, value, starts_at, expires_at, active }) => {
  const [result] = await pool.query(
    `INSERT INTO promo_codes (code, type, value, starts_at, expires_at, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [code.toUpperCase(), type, value, starts_at || null, expires_at || null, active ? 1 : 0]
  );
  return result.insertId;
};

// Met à jour un code promo
const update = async (id, { type, value, starts_at, expires_at, active }) => {
  await pool.query(
    `UPDATE promo_codes SET type = ?, value = ?, starts_at = ?, expires_at = ?, active = ?
     WHERE id = ?`,
    [type, value, starts_at || null, expires_at || null, active ? 1 : 0, id]
  );
};

// Supprime un code promo
const remove = async (id) => {
  await pool.query(`DELETE FROM promo_codes WHERE id = ?`, [id]);
};

module.exports = { findByCode, findAll, create, update, remove };
