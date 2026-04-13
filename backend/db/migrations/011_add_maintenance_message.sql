-- Migration 011 : message affiché quand le service est fermé manuellement
INSERT INTO `settings` (`key`, `value`) VALUES
  ('maintenance_message', 'Le service est momentanément fermé. Revenez bientôt !')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
