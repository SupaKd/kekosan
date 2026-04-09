const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products
router.get('/', productController.getCatalog);

module.exports = router;
