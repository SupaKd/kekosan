-- Migration 003 : ajout des codes promo

-- Nouvelle table promo_codes
CREATE TABLE `promo_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('percent','fixed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(8,2) NOT NULL,
  `starts_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_promo_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajout des colonnes promo dans orders
ALTER TABLE `orders`
  ADD COLUMN `promo_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `delivery_fee`,
  ADD COLUMN `discount_amount` decimal(8,2) NOT NULL DEFAULT '0.00' AFTER `promo_code`;
