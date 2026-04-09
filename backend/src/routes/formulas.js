const express = require('express');
const router = express.Router();
const formulaController = require('../controllers/formulaController');

// GET /api/formulas
router.get('/', formulaController.getFormulas);

module.exports = router;
