const formulaRepository = require('../repositories/formulaRepository');

// Retourne toutes les formules disponibles avec leurs slots
const getFormulas = async () => {
  return formulaRepository.findAllAvailable();
};

module.exports = { getFormulas };
