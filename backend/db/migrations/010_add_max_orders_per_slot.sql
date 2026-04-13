-- Migration 010 : nombre maximum de commandes par créneau horaire
INSERT INTO `settings` (`key`, `value`) VALUES
  ('max_orders_per_slot', '5')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
