-- Migration 012 : intervalle entre créneaux et délai minimum de livraison
INSERT INTO `settings` (`key`, `value`) VALUES
  ('slot_interval',        '30'),
  ('min_delivery_delay',   '30')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
