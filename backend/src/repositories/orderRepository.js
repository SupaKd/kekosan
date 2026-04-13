const pool = require('../config/db');
const socketConfig = require('../config/socket');

// Insère une commande complète dans une transaction unique.
// orderData = {
//   tracking_token, customer_name, customer_phone, customer_email,
//   delivery_address, subtotal, total, notes,
//   items: [{ product_id, product_name_snapshot, quantity, unit_price_snapshot, options: [...] }],
//   formula_items: [{ formula_id, formula_name_snapshot, formula_price_snapshot, quantity, slots: [...] }]
// }
// Note : stripe_payment_intent_id est mis à jour séparément via updatePaymentIntent
const createOrder = async (orderData) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insertion de la commande principale (sans payment intent — créé après)
    const [orderResult] = await conn.query(
      `INSERT INTO orders
        (tracking_token, customer_name, customer_phone, customer_email,
         delivery_address, delivery_time, subtotal, delivery_fee, total,
         promo_code, discount_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderData.tracking_token,
        orderData.customer_name,
        orderData.customer_phone,
        orderData.customer_email,
        orderData.delivery_address,
        orderData.delivery_time,
        orderData.subtotal,
        orderData.delivery_fee,
        orderData.total,
        orderData.promo_code || null,
        orderData.discount_amount || 0,
        orderData.notes || null,
      ]
    );
    const orderId = orderResult.insertId;

    // 2. Insertion des items à la carte
    for (const item of orderData.items) {
      const [itemResult] = await conn.query(
        `INSERT INTO order_items
          (order_id, product_id, product_name_snapshot, quantity, unit_price_snapshot)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.product_name_snapshot,
          item.quantity,
          item.unit_price_snapshot,
        ]
      );
      const orderItemId = itemResult.insertId;

      // Options de l'item
      for (const opt of item.options) {
        await conn.query(
          `INSERT INTO order_item_options
            (order_item_id, product_option_id, option_name_snapshot, price_delta_snapshot)
           VALUES (?, ?, ?, ?)`,
          [orderItemId, opt.product_option_id, opt.option_name_snapshot, opt.price_delta_snapshot]
        );
      }
    }

    // 3. Insertion des formules
    for (const fi of orderData.formula_items) {
      const [fiResult] = await conn.query(
        `INSERT INTO order_formula_items
          (order_id, formula_id, formula_name_snapshot, formula_price_snapshot, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          fi.formula_id,
          fi.formula_name_snapshot,
          fi.formula_price_snapshot,
          fi.quantity,
        ]
      );
      const orderFormulaItemId = fiResult.insertId;

      // Slots de la formule
      for (const slot of fi.slots) {
        await conn.query(
          `INSERT INTO order_formula_slots
            (order_formula_item_id, slot_name, product_id, product_name_snapshot, price_supplement_snapshot)
           VALUES (?, ?, ?, ?, ?)`,
          [orderFormulaItemId, slot.slot_name, slot.product_id, slot.product_name_snapshot, slot.price_supplement_snapshot || 0]
        );
      }
    }

    await conn.commit();
    return orderId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Récupère une commande par son tracking token (pour le suivi client)
const findByTrackingToken = async (token) => {
  const [orders] = await pool.query(
    `SELECT id, tracking_token, customer_name, customer_email,
            delivery_address, delivery_time, status, subtotal, delivery_fee,
            promo_code, discount_amount, total, payment_status, notes, created_at
     FROM orders
     WHERE tracking_token = ?`,
    [token]
  );
  return orders[0] || null;
};

// Récupère une commande complète avec ses items et formules (pour le mail de confirmation)
const findFullOrderById = async (orderId) => {
  const [orders] = await pool.query(
    `SELECT id, tracking_token, customer_name, customer_email, customer_phone,
            delivery_address, delivery_time, status, subtotal, delivery_fee,
            promo_code, discount_amount, total, notes, created_at
     FROM orders WHERE id = ?`,
    [orderId]
  );
  if (!orders[0]) return null;
  const order = orders[0];

  const [items] = await pool.query(
    `SELECT oi.id, oi.product_name_snapshot, oi.quantity, oi.unit_price_snapshot,
            GROUP_CONCAT(oio.option_name_snapshot ORDER BY oio.id SEPARATOR ', ') AS options_label
     FROM order_items oi
     LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id
     WHERE oi.order_id = ?
     GROUP BY oi.id`,
    [orderId]
  );

  const [formulaItems] = await pool.query(
    `SELECT ofi.id, ofi.formula_name_snapshot, ofi.formula_price_snapshot, ofi.quantity
     FROM order_formula_items ofi
     WHERE ofi.order_id = ?`,
    [orderId]
  );

  for (const fi of formulaItems) {
    const [slots] = await pool.query(
      `SELECT slot_name, product_name_snapshot
       FROM order_formula_slots WHERE order_formula_item_id = ?`,
      [fi.id]
    );
    fi.slots = slots;
  }

  return { ...order, items, formula_items: formulaItems };
};

// Récupère une commande par son stripe_payment_intent_id (utilisé par le webhook)
const findByPaymentIntentId = async (paymentIntentId) => {
  const [rows] = await pool.query(
    `SELECT id, status, payment_status FROM orders WHERE stripe_payment_intent_id = ?`,
    [paymentIntentId]
  );
  return rows[0] || null;
};

// Met à jour le statut de commande et de paiement, puis notifie en temps réel
const updateStatus = async (orderId, { status, payment_status }) => {
  await pool.query(
    `UPDATE orders SET status = ?, payment_status = ? WHERE id = ?`,
    [status, payment_status, orderId]
  );

  // Récupère le tracking_token pour la room client (évite d'exposer l'id interne)
  const [tokenRows] = await pool.query(
    `SELECT tracking_token FROM orders WHERE id = ?`,
    [orderId]
  );
  const tracking_token = tokenRows[0]?.tracking_token;

  // Notifie la cuisine et le client (via sa room tracking_token)
  try {
    const io = socketConfig.getIO();
    io.to('kitchen').emit('order_status_updated', { order_id: orderId, status, payment_status });
    if (tracking_token) {
      io.to(`order_${tracking_token}`).emit('order_status_updated', { order_id: orderId, status, payment_status });
    }
  } catch (_) {
    // Socket.io pas encore initialisé (ex: appel au démarrage) — on ignore
  }
};

// Met à jour le stripe_payment_intent_id après création du PaymentIntent Stripe
const updatePaymentIntent = async (orderId, paymentIntentId) => {
  await pool.query(
    `UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ?`,
    [paymentIntentId, orderId]
  );
};

// Compte les commandes confirmées/en cours pour un créneau et une date donnés
// Exclut les commandes annulées — elles libèrent leur place
const countOrdersBySlot = async (delivery_time, date) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE delivery_time = ?
       AND DATE(created_at) = ?
       AND status NOT IN ('cancelled')
       AND payment_status = 'paid'`,
    [delivery_time, date]
  );
  return rows[0].cnt;
};

// Retourne le nombre de commandes par créneau pour aujourd'hui et demain
const getSlotCounts = async () => {
  const [rows] = await pool.query(
    `SELECT delivery_time, DATE(created_at) AS date, COUNT(*) AS cnt
     FROM orders
     WHERE DATE(created_at) >= CURDATE()
       AND DATE(created_at) <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       AND status NOT IN ('cancelled')
       AND payment_status = 'paid'
     GROUP BY delivery_time, DATE(created_at)`
  );
  return rows; // [{ delivery_time: '12:00', date: '2026-04-13', cnt: 3 }, ...]
};

module.exports = { createOrder, updatePaymentIntent, findByTrackingToken, findFullOrderById, findByPaymentIntentId, updateStatus, countOrdersBySlot, getSlotCounts };
