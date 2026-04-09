const productRepository = require('../repositories/productRepository');

// Retourne le catalogue complet groupé par catégorie
const getCatalog = async () => {
  const products = await productRepository.findAllAvailable();

  // Regroupe les produits par catégorie pour faciliter l'affichage côté client
  return products.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {});
};

module.exports = { getCatalog };
