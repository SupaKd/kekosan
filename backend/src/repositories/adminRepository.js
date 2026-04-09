const pool = require('../config/db');

// Liste les commandes avec pagination et filtres optionnels
const findOrders = async ({ status, search, date_from, date_to, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('o.status = ?');
    params.push(status);
  }
  if (search) {
    // Recherche par #id si la saisie commence par # ou est un nombre pur
    const idMatch = search.replace(/^#/, '').trim()
    if (/^\d+$/.test(idMatch)) {
      conditions.push('(o.id = ? OR o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.customer_phone LIKE ?)');
      const like = `%${search}%`;
      params.push(parseInt(idMatch), like, like, like);
    } else {
      conditions.push('(o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.customer_phone LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
  }
  if (date_from) {
    conditions.push('DATE(o.created_at) >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('DATE(o.created_at) <= ?');
    params.push(date_to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [orders] = await pool.query(
    `SELECT o.id, o.tracking_token, o.customer_name, o.customer_phone,
            o.customer_email, o.delivery_address, o.delivery_time, o.status, o.subtotal,
            o.delivery_fee, o.total, o.payment_status, o.notes, o.created_at
     FROM orders o
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM orders o ${whereClause}`,
    params
  );

  // Charge les items et formules en 3 queries groupées (évite le N+1)
  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id);

    const [allItems] = await pool.query(
      `SELECT oi.id, oi.order_id, oi.product_name_snapshot, oi.quantity, oi.unit_price_snapshot,
              GROUP_CONCAT(oio.option_name_snapshot ORDER BY oio.id SEPARATOR ', ') AS options_label
       FROM order_items oi
       LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id
       WHERE oi.order_id IN (?)
       GROUP BY oi.id`,
      [orderIds]
    );

    const [allFormulaItems] = await pool.query(
      `SELECT ofi.id, ofi.order_id, ofi.formula_name_snapshot, ofi.formula_price_snapshot, ofi.quantity
       FROM order_formula_items ofi WHERE ofi.order_id IN (?)`,
      [orderIds]
    );

    const formulaItemIds = allFormulaItems.map((fi) => fi.id);
    const allSlots = formulaItemIds.length > 0
      ? (await pool.query(
          `SELECT order_formula_item_id, slot_name, product_name_snapshot
           FROM order_formula_slots WHERE order_formula_item_id IN (?)`,
          [formulaItemIds]
        ))[0]
      : [];

    // Regroupement en mémoire
    const slotsByFi = {};
    for (const slot of allSlots) {
      if (!slotsByFi[slot.order_formula_item_id]) slotsByFi[slot.order_formula_item_id] = [];
      slotsByFi[slot.order_formula_item_id].push(slot);
    }

    const itemsByOrder = {};
    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }

    const formulasByOrder = {};
    for (const fi of allFormulaItems) {
      fi.slots = slotsByFi[fi.id] || [];
      if (!formulasByOrder[fi.order_id]) formulasByOrder[fi.order_id] = [];
      formulasByOrder[fi.order_id].push(fi);
    }

    for (const order of orders) {
      order.items = itemsByOrder[order.id] || [];
      order.formula_items = formulasByOrder[order.id] || [];
    }
  } else {
    for (const order of orders) {
      order.items = [];
      order.formula_items = [];
    }
  }

  return { orders, total, page, limit };
};

// Récupère une commande complète pour l'admin (avec items et formules)
const findOrderById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, tracking_token, customer_name, customer_phone, customer_email,
            delivery_address, status, subtotal, delivery_fee, total, payment_status,
            stripe_payment_intent_id, notes, created_at
     FROM orders WHERE id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const order = rows[0];

  const [items] = await pool.query(
    `SELECT oi.id, oi.product_name_snapshot, oi.quantity, oi.unit_price_snapshot,
            GROUP_CONCAT(oio.option_name_snapshot ORDER BY oio.id SEPARATOR ', ') AS options_label
     FROM order_items oi
     LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id
     WHERE oi.order_id = ?
     GROUP BY oi.id`,
    [id]
  );

  const [formulaItems] = await pool.query(
    `SELECT ofi.id, ofi.formula_name_snapshot, ofi.formula_price_snapshot, ofi.quantity
     FROM order_formula_items ofi WHERE ofi.order_id = ?`,
    [id]
  );

  for (const fi of formulaItems) {
    const [slots] = await pool.query(
      `SELECT slot_name, product_name_snapshot FROM order_formula_slots
       WHERE order_formula_item_id = ?`,
      [fi.id]
    );
    fi.slots = slots;
  }

  return { ...order, items, formula_items: formulaItems };
};

// Statistiques pour le dashboard admin
const getStats = async () => {
  const [[today]] = await pool.query(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE status NOT IN ('cancelled', 'pending')
      AND DATE(created_at) = CURDATE()
  `);

  const [[week]] = await pool.query(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE status NOT IN ('cancelled', 'pending')
      AND YEARWEEK(created_at, 1) = YEARWEEK(NOW(), 1)
  `);

  const [[month]] = await pool.query(`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE status NOT IN ('cancelled', 'pending')
      AND YEAR(created_at) = YEAR(NOW())
      AND MONTH(created_at) = MONTH(NOW())
  `);

  const [recentOrders] = await pool.query(`
    SELECT id, customer_name, total, status, payment_status, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 8
  `);

  return { today, week, month, recentOrders };
};

module.exports = { findOrders, findOrderById, getStats };
