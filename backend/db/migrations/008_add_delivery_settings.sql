-- Migration 008 : frais de livraison et montant minimum de commande
INSERT INTO `settings` (`key`, `value`) VALUES
  ('delivery_fee',             '5'),
  ('free_delivery_threshold',  '20'),
  ('min_order_amount',         '20')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
