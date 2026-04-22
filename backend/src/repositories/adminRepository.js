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

  conditions.push("o.payment_status = 'paid'");

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

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

  // Charge les items et formules en 4 queries groupées (évite le N+1)
  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id);

    const [allItems] = await pool.query(
      `SELECT oi.id, oi.order_id, oi.product_name_snapshot, oi.quantity, oi.unit_price_snapshot
       FROM order_items oi
       WHERE oi.order_id IN (?)`,
      [orderIds]
    );

    const itemIds = allItems.map((i) => i.id);
    const allOptions = itemIds.length > 0
      ? (await pool.query(
          `SELECT order_item_id, option_name_snapshot, price_delta_snapshot
           FROM order_item_options WHERE order_item_id IN (?)`,
          [itemIds]
        ))[0]
      : [];

    const [allFormulaItems] = await pool.query(
      `SELECT ofi.id, ofi.order_id, ofi.formula_name_snapshot, ofi.formula_price_snapshot, ofi.quantity
       FROM order_formula_items ofi WHERE ofi.order_id IN (?)`,
      [orderIds]
    );

    const formulaItemIds = allFormulaItems.map((fi) => fi.id);
    const allSlots = formulaItemIds.length > 0
      ? (await pool.query(
          `SELECT order_formula_item_id, slot_name, product_name_snapshot, price_supplement_snapshot
           FROM order_formula_slots WHERE order_formula_item_id IN (?)`,
          [formulaItemIds]
        ))[0]
      : [];

    // Regroupement en mémoire
    const optionsByItem = {};
    for (const opt of allOptions) {
      if (!optionsByItem[opt.order_item_id]) optionsByItem[opt.order_item_id] = [];
      optionsByItem[opt.order_item_id].push({ name: opt.option_name_snapshot, price_delta: parseFloat(opt.price_delta_snapshot) });
    }

    const slotsByFi = {};
    for (const slot of allSlots) {
      if (!slotsByFi[slot.order_formula_item_id]) slotsByFi[slot.order_formula_item_id] = [];
      slotsByFi[slot.order_formula_item_id].push(slot);
    }

    const itemsByOrder = {};
    for (const item of allItems) {
      item.options = optionsByItem[item.id] || [];
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
    `SELECT oi.id, oi.product_name_snapshot, oi.quantity, oi.unit_price_snapshot
     FROM order_items oi
     WHERE oi.order_id = ?`,
    [id]
  );

  for (const item of items) {
    const [opts] = await pool.query(
      `SELECT option_name_snapshot, price_delta_snapshot
       FROM order_item_options WHERE order_item_id = ?`,
      [item.id]
    );
    item.options = opts.map((o) => ({ name: o.option_name_snapshot, price_delta: parseFloat(o.price_delta_snapshot) }));
  }

  const [formulaItems] = await pool.query(
    `SELECT ofi.id, ofi.formula_name_snapshot, ofi.formula_price_snapshot, ofi.quantity
     FROM order_formula_items ofi WHERE ofi.order_id = ?`,
    [id]
  );

  for (const fi of formulaItems) {
    const [slots] = await pool.query(
      `SELECT slot_name, product_name_snapshot, price_supplement_snapshot FROM order_formula_slots
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
    SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE status NOT IN ('cancelled', 'pending') AND DATE(created_at) = CURDATE()
  `);

  const [[week]] = await pool.query(`
    SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE status NOT IN ('cancelled', 'pending')
      AND YEARWEEK(created_at, 1) = YEARWEEK(NOW(), 1)
  `);

  const [[month]] = await pool.query(`
    SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE status NOT IN ('cancelled', 'pending')
      AND YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())
  `);

  // Ticket moyen global (commandes non annulées)
  const [[avgTicket]] = await pool.query(`
    SELECT COALESCE(AVG(total), 0) AS avg_ticket
    FROM orders WHERE status NOT IN ('cancelled', 'pending')
  `);

  // Top 5 produits les plus commandés (par quantité)
  const [topProducts] = await pool.query(`
    SELECT oi.product_name_snapshot AS name, SUM(oi.quantity) AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status NOT IN ('cancelled', 'pending')
    GROUP BY oi.product_name_snapshot
    ORDER BY qty DESC
    LIMIT 5
  `);

  // Top 5 créneaux les plus chargés
  const [topSlots] = await pool.query(`
    SELECT delivery_time AS slot, COUNT(*) AS cnt
    FROM orders
    WHERE status NOT IN ('cancelled', 'pending') AND delivery_time IS NOT NULL
    GROUP BY delivery_time
    ORDER BY cnt DESC
    LIMIT 5
  `);

  // CA des 30 derniers jours (par jour) — pour le mini graphe
  const [revenueByDay] = await pool.query(`
    SELECT DATE(created_at) AS day, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS count
    FROM orders
    WHERE status NOT IN ('cancelled', 'pending')
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `);

  const [recentOrders] = await pool.query(`
    SELECT id, customer_name, total, status, payment_status, created_at
    FROM orders ORDER BY created_at DESC LIMIT 8
  `);

  return {
    today, week, month,
    avg_ticket: parseFloat(avgTicket.avg_ticket),
    top_products: topProducts,
    top_slots: topSlots,
    revenue_by_day: revenueByDay,
    recentOrders,
  };
};

// Exporte toutes les commandes filtrées (sans pagination) pour le CSV
const findOrdersForExport = async ({ status, search, date_from, date_to }) => {
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('o.status = ?');
    params.push(status);
  }
  if (search) {
    const idMatch = search.replace(/^#/, '').trim();
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

  conditions.push("o.payment_status = 'paid'");

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [orders] = await pool.query(
    `SELECT o.id, o.customer_name, o.customer_email, o.customer_phone,
            o.delivery_address, o.delivery_time, o.status, o.payment_status,
            o.subtotal, o.delivery_fee, o.discount_amount, o.total,
            o.notes, o.created_at
     FROM orders o
     ${whereClause}
     ORDER BY o.created_at DESC`,
    params
  );

  return orders;
};

module.exports = { findOrders, findOrderById, getStats, findOrdersForExport };
