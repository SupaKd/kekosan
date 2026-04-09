-- Migration 001 : ajout de delivery_fee dans la table orders
-- À exécuter sur une BDD existante (le schéma kekosan_db.sql a déjà été mis à jour)

ALTER TABLE `orders`
  ADD COLUMN `delivery_fee` decimal(8,2) NOT NULL DEFAULT '0.00'
  AFTER `subtotal`;
