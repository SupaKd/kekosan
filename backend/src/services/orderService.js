const { v4: uuidv4 } = require('uuid');
const Stripe = require('stripe');
const productRepository = require('../repositories/productRepository');
const formulaRepository = require('../repositories/formulaRepository');
const orderRepository = require('../repositories/orderRepository');
const promoRepository = require('../repositories/promoRepository');
const settingsRepository = require('../repositories/settingsRepository');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Valide et enrichit les items à la carte depuis la DB
// Retourne les items avec snapshots ou lève une erreur métier
const resolveItems = async (rawItems) => {
  const resolved = [];

  // Chargement unique du catalogue complet (avec options) — évite le N+1
  const needsOptions = rawItems.some((r) => r.options && r.options.length > 0);
  const allProducts = needsOptions ? await productRepository.findAllAvailable() : [];

  for (const raw of rawItems) {
    const product = await productRepository.findById(raw.product_id);
    if (!product) {
      throw { status: 400, message: `Produit introuvable : id ${raw.product_id}` };
    }
    if (!product.available) {
      throw { status: 400, message: `Produit indisponible : ${product.name}` };
    }

    // Résolution des options
    const resolvedOptions = [];
    if (raw.options && raw.options.length > 0) {
      const fullProduct = allProducts.find((p) => p.id === raw.product_id);
      const availableOptions = fullProduct ? fullProduct.options : [];

      for (const rawOpt of raw.options) {
        const opt = availableOptions.find((o) => o.id === rawOpt.product_option_id);
        if (!opt) {
          throw { status: 400, message: `Option introuvable : id ${rawOpt.product_option_id}` };
        }
        resolvedOptions.push({
          product_option_id: opt.id,
          option_name_snapshot: opt.name,
          price_delta_snapshot: opt.price_delta,
        });
      }
    }

    const optionsDelta = resolvedOptions.reduce((sum, o) => sum + o.price_delta_snapshot, 0);

    resolved.push({
      product_id: product.id,
      product_name_snapshot: product.name,
      quantity: raw.quantity,
      unit_price_snapshot: parseFloat(product.price) + optionsDelta,
      options: resolvedOptions,
    });
  }

  return resolved;
};

// Valide et enrichit les formules depuis la DB
const resolveFormulaItems = async (rawFormulaItems) => {
  const resolved = [];

  for (const raw of rawFormulaItems) {
    const formula = await formulaRepository.findById(raw.formula_id);
    if (!formula) {
      throw { status: 400, message: `Formule introuvable : id ${raw.formula_id}` };
    }
    if (!formula.available) {
      throw { status: 400, message: `Formule indisponible : ${formula.name}` };
    }

    // Vérifie que tous les slots requis sont remplis
    if (raw.slots.length !== formula.slots.length) {
      throw {
        status: 400,
        message: `Nombre de slots incorrect pour la formule ${formula.name}`,
      };
    }

    const resolvedSlots = [];
    for (const rawSlot of raw.slots) {
      const slotDef = formula.slots.find((s) => s.slot_name === rawSlot.slot_name);
      if (!slotDef) {
        throw { status: 400, message: `Slot inconnu : ${rawSlot.slot_name}` };
      }

      const product = await productRepository.findByIdWithOptions(rawSlot.product_id);
      if (!product) {
        throw { status: 400, message: `Produit de slot introuvable : id ${rawSlot.product_id}` };
      }
      if (!product.available) {
        throw { status: 400, message: `Produit de slot indisponible : ${product.name}` };
      }

      // Vérifie que la catégorie du produit est autorisée dans ce slot
      if (!slotDef.allowed_categories.includes(product.category)) {
        throw {
          status: 400,
          message: `Produit "${product.name}" non autorisé dans le slot "${rawSlot.slot_name}"`,
        };
      }

      // Résolution des options du slot (même logique que les items à la carte)
      const resolvedSlotOptions = [];
      if (rawSlot.options && rawSlot.options.length > 0) {
        const availableOptions = product.options || [];
        for (const rawOpt of rawSlot.options) {
          const opt = availableOptions.find(o => o.id === rawOpt.product_option_id);
          if (!opt) {
            throw { status: 400, message: `Option de slot introuvable : id ${rawOpt.product_option_id}` };
          }
          resolvedSlotOptions.push({
            product_option_id: opt.id,
            option_name_snapshot: opt.name,
            price_delta_snapshot: opt.price_delta,
          });
        }
      }
      const slotOptionsDelta = resolvedSlotOptions.reduce((sum, o) => sum + o.price_delta_snapshot, 0);

      resolvedSlots.push({
        slot_name: rawSlot.slot_name,
        product_id: product.id,
        product_name_snapshot: product.name,
        price_supplement_snapshot: (parseFloat(product.price_supplement) || 0) + slotOptionsDelta,
        options: resolvedSlotOptions,
      });
    }

    // Supplément total = somme des suppléments de chaque slot
    const supplementTotal = resolvedSlots.reduce((sum, s) => sum + s.price_supplement_snapshot, 0);

    resolved.push({
      formula_id: formula.id,
      formula_name_snapshot: formula.name,
      formula_price_snapshot: parseFloat(formula.price) + supplementTotal,
      quantity: raw.quantity,
      slots: resolvedSlots,
    });
  }

  return resolved;
};

// Valide un code promo et retourne le montant de la remise
const validatePromo = async (promoCode, subtotal) => {
  if (!promoCode || !promoCode.trim()) {
    return { discount_amount: 0, promo_code: null };
  }

  const promo = await promoRepository.findByCode(promoCode.trim().toUpperCase());
  if (!promo) {
    throw { status: 400, message: `Code promo invalide : ${promoCode}` };
  }
  if (!promo.active) {
    throw { status: 400, message: 'Ce code promo est désactivé' };
  }

  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    throw { status: 400, message: 'Ce code promo n\'est pas encore valide' };
  }
  if (promo.expires_at && new Date(promo.expires_at) < now) {
    throw { status: 400, message: 'Ce code promo a expiré' };
  }

  let discount_amount = 0;
  if (promo.type === 'percent') {
    discount_amount = Math.round((subtotal * parseFloat(promo.value)) / 100 * 100) / 100;
  } else {
    // fixed — la remise ne peut pas dépasser le subtotal
    discount_amount = Math.min(parseFloat(promo.value), subtotal);
  }

  return { discount_amount: Math.max(0, discount_amount), promo_code: promo.code };
};

// Crée une commande complète : validation → calcul → DB → Stripe
const createOrder = async (body) => {
  const { customer, delivery_address, delivery_time, items = [], formula_items = [], notes, promo_code } = body;

  // Résolution et validation depuis la DB
  const resolvedItems = await resolveItems(items);
  const resolvedFormulaItems = await resolveFormulaItems(formula_items);

  // Calcul du sous-total
  const itemsTotal = resolvedItems.reduce(
    (sum, item) => sum + item.unit_price_snapshot * item.quantity,
    0
  );
  const formulasTotal = resolvedFormulaItems.reduce(
    (sum, fi) => sum + fi.formula_price_snapshot * fi.quantity,
    0
  );
  const subtotal = Math.round((itemsTotal + formulasTotal) * 100) / 100;

  // Validation et application du code promo
  const { discount_amount, promo_code: appliedPromoCode } = await validatePromo(promo_code, subtotal);
  const subtotalAfterDiscount = Math.max(0, subtotal - discount_amount);

  // Lecture des paramètres de livraison depuis la DB (fallback sur valeurs par défaut)
  const feeRaw       = await settingsRepository.get('delivery_fee');
  const threshRaw    = await settingsRepository.get('free_delivery_threshold');
  const minOrderRaw  = await settingsRepository.get('min_order_amount');
  const DELIVERY_FEE            = parseFloat(feeRaw    ?? '5');
  const FREE_DELIVERY_THRESHOLD = parseFloat(threshRaw ?? '20');
  const MIN_ORDER_AMOUNT        = parseFloat(minOrderRaw ?? '20');

  // Vérification du montant minimum de commande
  if (subtotal < MIN_ORDER_AMOUNT) {
    throw { status: 400, message: `Montant minimum de commande : ${MIN_ORDER_AMOUNT} €` };
  }

  // Calcul des frais de livraison (basé sur le subtotal brut — la promo ne retire pas la livraison gratuite)
  const delivery_fee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = Math.round((subtotalAfterDiscount + delivery_fee) * 100) / 100;

  // Génération du tracking token UUID v4
  const tracking_token = uuidv4();

  // Lecture de la capacité max par créneau (nécessaire pour la vérification atomique en DB)
  const maxRaw = await settingsRepository.get('max_orders_per_slot');
  const max_orders_per_slot = parseInt(maxRaw ?? '5');

  // Création du PaymentIntent Stripe AVANT l'INSERT en DB
  // → si Stripe échoue, aucune commande orpheline n'est créée
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: 'eur',
    metadata: { customer_email: customer.email, customer_name: customer.name, tracking_token },
  });

  // Insertion en DB avec le PI déjà connu + vérification atomique du créneau dans la transaction
  const orderId = await orderRepository.createOrder({
    tracking_token,
    customer_name: customer.name.trim(),
    customer_phone: customer.phone.trim(),
    customer_email: customer.email.trim().toLowerCase(),
    delivery_address: delivery_address.trim(),
    delivery_time,
    subtotal,
    delivery_fee,
    total,
    promo_code: appliedPromoCode || null,
    discount_amount,
    notes: notes || null,
    stripe_payment_intent_id: paymentIntent.id,
    max_orders_per_slot,
    items: resolvedItems,
    formula_items: resolvedFormulaItems,
  });

  return {
    order_id: orderId,
    tracking_token,
    client_secret: paymentIntent.client_secret,
    subtotal,
    discount_amount,
    delivery_fee,
    total,
  };
};

module.exports = { createOrder, validatePromo };
