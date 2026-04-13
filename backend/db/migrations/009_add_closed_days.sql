-- Migration 009 : jours de fermeture exceptionnelle
INSERT INTO `settings` (`key`, `value`) VALUES
  ('closed_days', '[]')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
