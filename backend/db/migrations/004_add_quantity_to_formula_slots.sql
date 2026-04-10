-- Migration 004 : quantité par slot de formule
-- Permet de définir une quantité différente selon le contexte (ex: 6 nems à la carte, 2 en formule)

-- Ajout de la quantité sur la définition du slot (défaut 1 = pas de changement pour l'existant)
ALTER TABLE formula_slots
  ADD COLUMN `quantity` INT NOT NULL DEFAULT 1 AFTER `allowed_categories`;

-- Ajout du snapshot de quantité sur les slots de commande (défaut 1 = rétrocompatible)
ALTER TABLE order_formula_slots
  ADD COLUMN `product_quantity_snapshot` INT NOT NULL DEFAULT 1 AFTER `product_name_snapshot`;
