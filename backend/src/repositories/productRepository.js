const pool = require('../config/db');

// Récupère tous les produits disponibles, groupés avec leurs options
const findAllAvailable = async () => {
  const [products] = await pool.query(
    `SELECT id, category, name, description, image_url, price, sort_order, formula_quantity, price_supplement
     FROM products
     WHERE available = 1
     ORDER BY category, sort_order, name`
  );

  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const [options] = await pool.query(
    `SELECT id, product_id, name, price_delta
     FROM product_options
     WHERE available = 1 AND product_id IN (?)
     ORDER BY product_id, name`,
    [productIds]
  );

  // Attache les options à chaque produit
  const optionsByProduct = {};
  for (const opt of options) {
    if (!optionsByProduct[opt.product_id]) optionsByProduct[opt.product_id] = [];
    optionsByProduct[opt.product_id].push({
      id: opt.id,
      name: opt.name,
      price_delta: parseFloat(opt.price_delta),
    });
  }

  return products.map((p) => ({
    id: p.id,
    category: p.category,
    name: p.name,
    description: p.description,
    image_url: p.image_url || null,
    price: parseFloat(p.price),
    sort_order: p.sort_order,
    formula_quantity: p.formula_quantity ?? null,
    price_supplement: parseFloat(p.price_supplement) || 0,
    options: optionsByProduct[p.id] || [],
  }));
};

// Récupère un produit par son id (pour validation lors de la commande)
const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, category, name, price, price_supplement, available
     FROM products
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

module.exports = { findAllAvailable, findById };
