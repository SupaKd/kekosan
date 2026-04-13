const settingsRepository = require('../repositories/settingsRepository');
const orderRepository   = require('../repositories/orderRepository');

const MIN_DELAY_MIN  = 30;
const SLOT_INTERVAL  = 30; // minutes

// Vérifie qu'un créneau HH:MM est valide (plage horaire, jour ouvré, délai minimum)
const isSlotValid = async (slot) => {
  if (!slot || !/^\d{2}:\d{2}$/.test(slot)) return false;

  const [h, m] = slot.split(':').map(Number);

  // Lecture des horaires et jours fermés depuis la DB (fallback sur les valeurs par défaut)
  const openingRaw   = await settingsRepository.get('opening_hour');
  const closingRaw   = await settingsRepository.get('closing_hour');
  const closedRaw    = await settingsRepository.get('closed_days');
  const SERVICE_START = parseInt(openingRaw ?? '11');
  const SERVICE_END   = parseInt(closingRaw  ?? '15');
  const closedDays    = closedRaw ? JSON.parse(closedRaw) : [];

  // Le créneau doit être dans la plage horaire et sur une tranche de 30min
  if (h < SERVICE_START || h >= SERVICE_END) return false;
  if (m % SLOT_INTERVAL !== 0) return false;

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  // Pas de livraison le week-end
  const dow = now.getDay();
  if (dow === 0 || dow === 6) return false;

  const slotDate = new Date(now);
  slotDate.setHours(h, m, 0, 0);

  // Si le créneau est déjà passé aujourd'hui, on essaie le lendemain ouvré
  if (slotDate <= now) {
    slotDate.setDate(slotDate.getDate() + 1);
    // Passer le week-end si nécessaire
    while (slotDate.getDay() === 0 || slotDate.getDay() === 6) {
      slotDate.setDate(slotDate.getDate() + 1);
    }
  }

  // Vérification des jours de fermeture exceptionnelle (format YYYY-MM-DD)
  const slotDateStr = slotDate.toISOString().slice(0, 10);
  if (closedDays.includes(slotDateStr)) return false;

  const diffMin = (slotDate - now) / 60000;
  return diffMin >= MIN_DELAY_MIN;
};

// Valide le body de la requête POST /api/orders
const validateOrder = async (req, res, next) => {
  try {
  const { customer, delivery_address, delivery_time, items, formula_items, notes } = req.body;

  // Infos client
  if (!customer || typeof customer !== 'object') {
    return res.status(400).json({ error: 'Champ customer manquant' });
  }
  const { name, phone, email } = customer;
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Nom client invalide' });
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
    return res.status(400).json({ error: 'Téléphone invalide' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  // Adresse de livraison
  if (!delivery_address || typeof delivery_address !== 'string' || delivery_address.trim().length < 5) {
    return res.status(400).json({ error: 'Adresse de livraison invalide' });
  }

  // Vérifie que la livraison est bien à Saint-Genis-Pouilly
  const addr = delivery_address.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isInZone = addr.includes('01630') || addr.includes('saint genis') || addr.includes('saint-genis');
  if (!isInZone) {
    return res.status(400).json({ error: 'Nous livrons uniquement à Saint-Genis-Pouilly (01630)' });
  }

  // Créneau de livraison
  if (!delivery_time) {
    return res.status(400).json({ error: 'Veuillez choisir un créneau de livraison' });
  }
  if (!await isSlotValid(delivery_time)) {
    return res.status(400).json({ error: 'Créneau de livraison invalide ou indisponible' });
  }

  // Vérifie que le créneau n'est pas saturé
  const maxRaw = await settingsRepository.get('max_orders_per_slot');
  const max = parseInt(maxRaw ?? '5');
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const todayStr = now.toISOString().slice(0, 10);
  const count = await orderRepository.countOrdersBySlot(delivery_time, todayStr);
  if (count >= max) {
    return res.status(400).json({ error: `Ce créneau est complet. Veuillez en choisir un autre.` });
  }

  // Le panier doit contenir au moins un élément
  const hasItems = Array.isArray(items) && items.length > 0;
  const hasFormulas = Array.isArray(formula_items) && formula_items.length > 0;
  if (!hasItems && !hasFormulas) {
    return res.status(400).json({ error: 'Le panier est vide' });
  }

  // Validation de la structure des items à la carte
  if (hasItems) {
    for (const item of items) {
      if (!Number.isInteger(item.product_id) || item.product_id < 1) {
        return res.status(400).json({ error: 'product_id invalide dans items' });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ error: 'quantity invalide dans items' });
      }
      if (item.options !== undefined && !Array.isArray(item.options)) {
        return res.status(400).json({ error: 'options doit être un tableau dans items' });
      }
    }
  }

  // Validation de la structure des formules
  if (hasFormulas) {
    for (const fi of formula_items) {
      if (!Number.isInteger(fi.formula_id) || fi.formula_id < 1) {
        return res.status(400).json({ error: 'formula_id invalide dans formula_items' });
      }
      if (!Number.isInteger(fi.quantity) || fi.quantity < 1) {
        return res.status(400).json({ error: 'quantity invalide dans formula_items' });
      }
      if (!Array.isArray(fi.slots) || fi.slots.length === 0) {
        return res.status(400).json({ error: 'slots manquants dans formula_items' });
      }
      for (const slot of fi.slots) {
        if (!slot.slot_name || typeof slot.slot_name !== 'string') {
          return res.status(400).json({ error: 'slot_name invalide dans formula_items.slots' });
        }
        if (!Number.isInteger(slot.product_id) || slot.product_id < 1) {
          return res.status(400).json({ error: 'product_id invalide dans formula_items.slots' });
        }
      }
    }
  }

  next();
  } catch (err) { next(err); }
};

module.exports = validateOrder;
