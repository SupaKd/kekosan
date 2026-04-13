-- Ajoute les horaires d'ouverture/fermeture dans la table settings
INSERT INTO `settings` (`key`, `value`) VALUES
  ('opening_hour', '11'),
  ('closing_hour', '15')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
