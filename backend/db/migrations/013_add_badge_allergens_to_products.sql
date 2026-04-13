-- Migration 013 : badge et allergènes sur les produits
ALTER TABLE `products`
  ADD COLUMN `badge`     varchar(50)  COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `description`,
  ADD COLUMN `allergens` json                                    DEFAULT NULL AFTER `badge`;
