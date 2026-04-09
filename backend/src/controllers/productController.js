const productService = require('../services/productService');

// GET /api/products — retourne le catalogue groupé par catégorie
const getCatalog = async (req, res, next) => {
  try {
    const catalog = await productService.getCatalog();
    res.json(catalog);
  } catch (err) {
    next(err);
  }
};

module.exports = { getCatalog };
