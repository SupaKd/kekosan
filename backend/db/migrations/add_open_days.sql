-- Migration : ajout du setting open_days
-- open_days = tableau JSON des jours de livraison actifs (0=dim, 1=lun, ..., 6=sam)
-- Valeur par défaut : lundi au vendredi
INSERT INTO settings (`key`, `value`)
VALUES ('open_days', '[1,2,3,4,5]')
ON DUPLICATE KEY UPDATE `value` = `value`;
