const settingsRepository = require('../repositories/settingsRepository');


// Vérifie qu'un créneau HH:MM est valide (plage horaire, jour ouvré, délai minimum)
const isSlotValid = async (slot) => {
  if (!slot || !/^\d{2}:\d{2}$/.test(slot)) return false;

  const [h, m] = slot.split(':').map(Number);

  // Lecture des horaires et jours fermés depuis la DB (fallback sur les valeurs par défaut)
  const openingRaw  = await settingsRepository.get('opening_time');
  const closingRaw  = await settingsRepository.get('closing_time');
  const closedRaw   = await settingsRepository.get('closed_days');
  const openDaysRaw = await settingsRepository.get('open_days');
  const intervalRaw = await settingsRepository.get('slot_interval');
  const delayRaw    = await settingsRepository.get('min_delivery_delay');

  const [openH, openM]   = (openingRaw  ?? '11:00').split(':').map(Number);
  const [closeH, closeM] = (closingRaw  ?? '15:00').split(':').map(Number);
  const closedDays      = closedRaw   ? JSON.parse(closedRaw)   : [];
  const openDays        = openDaysRaw ? JSON.parse(openDaysRaw) : [1, 2, 3, 4, 5];
  const SLOT_INTERVAL   = parseInt(intervalRaw ?? '30');
  const MIN_DELAY_MIN   = parseInt(delayRaw    ?? '30');

  const slotTotalMin  = h * 60 + m;
  const openTotalMin  = openH * 60 + openM;
  const closeTotalMin = closeH * 60 + closeM;

  // Le créneau doit être dans la plage horaire et sur une tranche valide
  if (slotTotalMin < openTotalMin || slotTotalMin >= closeTotalMin) return false;
  if ((slotTotalMin - openTotalMin) % SLOT_INTERVAL !== 0) return false;

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  // Le jour actuel doit être dans les jours d'ouverture configurés
  const dow = now.getDay();
  if (!openDays.includes(dow)) return false;

  const slotDate = new Date(now);
  slotDate.setHours(h, m, 0, 0);
  const earliest = new Date(now.getTime() + MIN_DELAY_MIN * 60000);

  // Un créneau passé ou trop proche est refusé — pas de report au lendemain
  if (slotDate < earliest) return false;

  // Vérification des jours de fermeture exceptionnelle (format YYYY-MM-DD)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (closedDays.includes(todayStr)) return false;

  return true;
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

  // Note : la vérification de capacité du créneau est faite atomiquement dans la transaction DB
  // (orderRepository.createOrder) pour éviter toute race condition entre deux requêtes simultanées.

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
