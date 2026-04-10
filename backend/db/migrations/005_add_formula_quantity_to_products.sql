-- Migration 005 : quantité d'un produit dans le contexte formule
-- NULL = pas de quantité spécifique (ex: Soupe Miso → on n'affiche rien)
-- Valeur > 0 = quantité affichée dans la FormulaModal (ex: Nems → 2, Boulettes → 2)

ALTER TABLE products
  ADD COLUMN `formula_quantity` INT NULL DEFAULT NULL AFTER `sort_order`;

-- Rollback de la migration 004 (quantité sur slots — remplacée par cette approche)
ALTER TABLE formula_slots
  DROP COLUMN IF EXISTS `quantity`;

ALTER TABLE order_formula_slots
  DROP COLUMN IF EXISTS `product_quantity_snapshot`;
