const pool = require('../config/db');

const get = async (key) => {
  const [rows] = await pool.query('SELECT `value` FROM settings WHERE `key` = ?', [key]);
  return rows[0]?.value ?? null;
};

const set = async (key, value) => {
  await pool.query(
    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
    [key, value, value]
  );
};

module.exports = { get, set };
