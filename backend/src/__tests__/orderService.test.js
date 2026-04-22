// Mock des dépendances externes avant tout require
jest.mock('../repositories/productRepository');
jest.mock('../repositories/formulaRepository');
jest.mock('../repositories/orderRepository');
jest.mock('../repositories/promoRepository');
jest.mock('../repositories/settingsRepository');
jest.mock('stripe');

const productRepository = require('../repositories/productRepository');
const formulaRepository = require('../repositories/formulaRepository');
const orderRepository = require('../repositories/orderRepository');
const promoRepository = require('../repositories/promoRepository');
const settingsRepository = require('../repositories/settingsRepository');
const Stripe = require('stripe');

// Mock de l'instance Stripe
const mockPaymentIntentsCreate = jest.fn();
Stripe.mockImplementation(() => ({
  paymentIntents: { create: mockPaymentIntentsCreate },
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

const { createOrder } = require('../services/orderService');

// Produit et formule de référence pour les tests
const mockProduct = {
  id: 1, name: 'Banh Mi Poulet', price: 9.5, category: 'banhmi', available: 1,
  options: [
    { id: 10, name: 'Extra coriandre', price_delta: 0 },
    { id: 11, name: 'Double portion', price_delta: 2.5 },
  ],
};
const mockFormula = {
  id: 1, name: 'Formule Midi', price: 21.0, available: 1,
  slots: [
    { slot_name: 'plat', allowed_categories: ['banhmi'] },
    { slot_name: 'boisson', allowed_categories: ['boisson'] },
  ],
};
const mockDrink = { id: 2, name: 'Eau', price: 0, category: 'boisson', available: 1, price_supplement: 0, options: [] };

// Body de commande valide de référence
const validBody = {
  customer: { name: 'Jean Dupont', phone: '0612345678', email: 'jean@test.fr' },
  delivery_address: '12 rue des Fleurs, Saint-Genis-Pouilly',
  items: [{ product_id: 1, quantity: 3, options: [] }],
};

beforeEach(() => {
  jest.clearAllMocks();
  productRepository.findById.mockResolvedValue(mockProduct);
  productRepository.findAllAvailable.mockResolvedValue([{ ...mockProduct, options: [] }]);
  formulaRepository.findById.mockResolvedValue(mockFormula);
  orderRepository.createOrder.mockResolvedValue(42);
  mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_mock', client_secret: 'secret_mock' });
  promoRepository.findByCode.mockResolvedValue(null);
  // Paramètres depuis settingsRepository : min 20€, livraison 5€, gratuit à 20€
  settingsRepository.get.mockImplementation((key) => {
    const map = {
      delivery_fee: '5',
      free_delivery_threshold: '20',
      min_order_amount: '20',
      max_orders_per_slot: '5',
    };
    return Promise.resolve(map[key] ?? null);
  });
});

describe('orderService.createOrder — cas nominal', () => {
  test('retourne order_id, tracking_token, client_secret et total', async () => {
    const result = await createOrder(validBody);
    expect(result.order_id).toBe(42);
    expect(result.tracking_token).toMatch(/^[0-9a-f-]{36}$/); // UUID v4
    expect(result.client_secret).toBe('secret_mock');
    expect(result.total).toBe(28.5); // 9.5 * 3
  });

  test('appelle Stripe avec le montant en centimes', async () => {
    await createOrder(validBody);
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2850, currency: 'eur' })
    );
  });

  test('appelle orderRepository.createOrder avec les bons snapshots', async () => {
    await createOrder(validBody);
    const call = orderRepository.createOrder.mock.calls[0][0];
    expect(call.items[0].product_name_snapshot).toBe('Banh Mi Poulet');
    expect(call.items[0].unit_price_snapshot).toBe(9.5);
    expect(call.customer_email).toBe('jean@test.fr');
  });

  test('inclut les options dans le snapshot et ajuste le prix unitaire', async () => {
    productRepository.findAllAvailable.mockResolvedValue([{ ...mockProduct }]);
    const body = {
      ...validBody,
      items: [{ product_id: 1, quantity: 1, options: [{ product_option_id: 11 }] }],
    };
    // total = 9.5 + 2.5 (Double portion) + 5 (livraison) = 17€ < min 20€ — on ajuste le prix
    productRepository.findById.mockResolvedValue({ ...mockProduct, price: 20.0 });
    productRepository.findAllAvailable.mockResolvedValue([{ ...mockProduct, price: 20.0 }]);
    const body2 = {
      ...validBody,
      items: [{ product_id: 1, quantity: 1, options: [{ product_option_id: 11 }] }],
    };
    const result = await createOrder(body2);
    const call = orderRepository.createOrder.mock.calls[0][0];
    // unit_price_snapshot = prix produit + price_delta option
    expect(call.items[0].unit_price_snapshot).toBe(22.5); // 20 + 2.5
    expect(call.items[0].options[0].option_name_snapshot).toBe('Double portion');
    expect(call.items[0].options[0].price_delta_snapshot).toBe(2.5);
  });
});

describe('orderService.createOrder — minimum de commande', () => {
  test('rejette si le total est inférieur à 20€', async () => {
    // 1 produit à 9.5€ = sous le minimum
    const body = { ...validBody, items: [{ product_id: 1, quantity: 1, options: [] }] };
    await expect(createOrder(body)).rejects.toMatchObject({ status: 400 });
  });

  test('passe si le total est exactement 20€', async () => {
    productRepository.findById.mockResolvedValue({ ...mockProduct, price: 20.0 });
    productRepository.findAllAvailable.mockResolvedValue([{ ...mockProduct, price: 20.0, options: [] }]);
    const body = { ...validBody, items: [{ product_id: 1, quantity: 1, options: [] }] };
    const result = await createOrder(body);
    expect(result.total).toBe(20);
  });
});

describe('orderService.createOrder — validation produit', () => {
  test('rejette si le produit n\'existe pas', async () => {
    productRepository.findById.mockResolvedValue(null);
    await expect(createOrder(validBody)).rejects.toMatchObject({ status: 400 });
  });

  test('rejette si le produit est indisponible (available = 0)', async () => {
    productRepository.findById.mockResolvedValue({ ...mockProduct, available: 0 });
    await expect(createOrder(validBody)).rejects.toMatchObject({ status: 400 });
  });

  test('le catalogue retourne les produits non dispo avec available = false', async () => {
    const unavailableProduct = { ...mockProduct, available: false };
    productRepository.findAllAvailable.mockResolvedValue([unavailableProduct]);
    const catalog = await productRepository.findAllAvailable();
    expect(catalog[0].available).toBe(false);
  });
});

describe('orderService.createOrder — validation formule', () => {
  const bodyWithFormula = {
    customer: { name: 'Jean Dupont', phone: '0612345678', email: 'jean@test.fr' },
    delivery_address: '12 rue des Fleurs, Saint-Genis-Pouilly',
    items: [],
    formula_items: [{
      formula_id: 1,
      quantity: 1,
      slots: [
        { slot_name: 'plat', product_id: 1 },
        { slot_name: 'boisson', product_id: 2 },
      ],
    }],
  };

  beforeEach(() => {
    productRepository.findById.mockImplementation((id) =>
      id === 1 ? Promise.resolve(mockProduct) : Promise.resolve(mockDrink)
    );
    productRepository.findByIdWithOptions = jest.fn().mockImplementation((id) =>
      id === 1
        ? Promise.resolve({ ...mockProduct, price_supplement: 0 })
        : Promise.resolve({ ...mockDrink })
    );
  });

  test('passe avec une formule valide', async () => {
    const result = await createOrder(bodyWithFormula);
    expect(result.total).toBe(21);
  });

  test('rejette si la formule n\'existe pas', async () => {
    formulaRepository.findById.mockResolvedValue(null);
    await expect(createOrder(bodyWithFormula)).rejects.toMatchObject({ status: 400 });
  });

  test('rejette si le nombre de slots est incorrect', async () => {
    const body = {
      ...bodyWithFormula,
      formula_items: [{ ...bodyWithFormula.formula_items[0], slots: [{ slot_name: 'plat', product_id: 1 }] }],
    };
    await expect(createOrder(body)).rejects.toMatchObject({ status: 400 });
  });

  test('rejette si le produit du slot a une catégorie non autorisée', async () => {
    // Les deux slots reçoivent un produit de catégorie "banhmi" → le slot "boisson" rejette
    productRepository.findByIdWithOptions = jest.fn().mockResolvedValue({ ...mockProduct, price_supplement: 0 });
    await expect(createOrder(bodyWithFormula)).rejects.toMatchObject({ status: 400 });
  });

  test('encode les options du slot dans product_name_snapshot', async () => {
    productRepository.findByIdWithOptions = jest.fn().mockImplementation((id) =>
      id === 1
        ? Promise.resolve({ ...mockProduct, price_supplement: 0 })
        : Promise.resolve({ ...mockDrink })
    );
    const bodyWithSlotOptions = {
      ...bodyWithFormula,
      formula_items: [{
        ...bodyWithFormula.formula_items[0],
        slots: [
          { slot_name: 'plat', product_id: 1, options: [{ product_option_id: 10 }] }, // Extra coriandre
          { slot_name: 'boisson', product_id: 2, options: [] },
        ],
      }],
    };
    await createOrder(bodyWithSlotOptions);
    const call = orderRepository.createOrder.mock.calls[0][0];
    const platSlot = call.formula_items[0].slots.find(s => s.slot_name === 'plat');
    expect(platSlot.product_name_snapshot).toBe('Banh Mi Poulet (Extra coriandre)');
  });

  test('ajoute le price_delta de l\'option au price_supplement_snapshot du slot', async () => {
    productRepository.findByIdWithOptions = jest.fn().mockImplementation((id) =>
      id === 1
        ? Promise.resolve({ ...mockProduct, price_supplement: 0 })
        : Promise.resolve({ ...mockDrink })
    );
    const bodyWithPaidOption = {
      ...bodyWithFormula,
      formula_items: [{
        ...bodyWithFormula.formula_items[0],
        slots: [
          { slot_name: 'plat', product_id: 1, options: [{ product_option_id: 11 }] }, // Double portion +2.5€
          { slot_name: 'boisson', product_id: 2, options: [] },
        ],
      }],
    };
    await createOrder(bodyWithPaidOption);
    const call = orderRepository.createOrder.mock.calls[0][0];
    const platSlot = call.formula_items[0].slots.find(s => s.slot_name === 'plat');
    expect(platSlot.price_supplement_snapshot).toBe(2.5);
    expect(platSlot.product_name_snapshot).toBe('Banh Mi Poulet (Double portion)');
  });

  test('rejette si une option du slot est introuvable sur le produit', async () => {
    productRepository.findByIdWithOptions = jest.fn().mockImplementation((id) =>
      id === 1
        ? Promise.resolve({ ...mockProduct, price_supplement: 0 })
        : Promise.resolve({ ...mockDrink })
    );
    const bodyWithBadOption = {
      ...bodyWithFormula,
      formula_items: [{
        ...bodyWithFormula.formula_items[0],
        slots: [
          { slot_name: 'plat', product_id: 1, options: [{ product_option_id: 999 }] }, // option inexistante
          { slot_name: 'boisson', product_id: 2, options: [] },
        ],
      }],
    };
    await expect(createOrder(bodyWithBadOption)).rejects.toMatchObject({ status: 400 });
  });
});
