-- Migration 002 : correction des index sur order_items
-- Note : idx_orders_stripe_payment_intent_id existe déjà en BDD

-- Suppression du double index idx_order_id sur order_items (idx_order_items_order_id le remplace)
ALTER TABLE `order_items`
  DROP INDEX `idx_order_id`;
