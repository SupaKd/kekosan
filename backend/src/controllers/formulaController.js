const formulaService = require('../services/formulaService');

// GET /api/formulas — retourne toutes les formules avec leurs slots
const getFormulas = async (req, res, next) => {
  try {
    const formulas = await formulaService.getFormulas();
    res.json(formulas);
  } catch (err) {
    next(err);
  }
};

module.exports = { getFormulas };
