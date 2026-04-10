-- Migration 006 : supplément de prix pour certains produits en formule
-- NULL ou 0 = pas de supplément (comportement par défaut)
-- Valeur > 0 = supplément affiché et ajouté au prix de la formule (ex: Café froid, Red Bull → 1.00)

ALTER TABLE products
  ADD COLUMN `price_supplement` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `formula_quantity`;

-- Snapshot du supplément dans les slots de commande (rétrocompatible à 0)
ALTER TABLE order_formula_slots
  ADD COLUMN `price_supplement_snapshot` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `product_name_snapshot`;
