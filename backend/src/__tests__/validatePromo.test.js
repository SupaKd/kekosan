// Tests pour validatePromo (orderService) et orderController.applyPromo
jest.mock('../repositories/promoRepository');
jest.mock('../repositories/productRepository');
jest.mock('../repositories/formulaRepository');
jest.mock('../repositories/orderRepository');
jest.mock('../repositories/settingsRepository');
jest.mock('stripe');

const promoRepository = require('../repositories/promoRepository');
const settingsRepository = require('../repositories/settingsRepository');
const Stripe = require('stripe');

Stripe.mockImplementation(() => ({
  paymentIntents: { create: jest.fn().mockResolvedValue({ id: 'pi_mock', client_secret: 'secret_mock' }) },
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

const { validatePromo } = require('../services/orderService');

const makePromo = (overrides = {}) => ({
  id: 1,
  code: 'TEST10',
  type: 'percent',
  value: '10',
  active: 1,
  starts_at: null,
  expires_at: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-04-21T10:00:00.000Z').getTime());
  settingsRepository.get.mockResolvedValue(null);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('validatePromo — cas nominal', () => {
  test('retourne discount 0 si pas de code promo', async () => {
    const result = await validatePromo(null, 50);
    expect(result).toEqual({ discount_amount: 0, promo_code: null });
  });

  test('retourne discount 0 si code vide', async () => {
    const result = await validatePromo('  ', 50);
    expect(result).toEqual({ discount_amount: 0, promo_code: null });
  });

  test('calcule remise percent correctement', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ type: 'percent', value: '10' }));
    const result = await validatePromo('TEST10', 50);
    expect(result.discount_amount).toBe(5); // 10% de 50
    expect(result.promo_code).toBe('TEST10');
  });

  test('calcule remise fixed correctement', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ type: 'fixed', value: '3' }));
    const result = await validatePromo('PROMO3', 50);
    expect(result.discount_amount).toBe(3);
  });

  test('remise fixed ne dépasse pas le subtotal', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ type: 'fixed', value: '100' }));
    const result = await validatePromo('PROMO100', 25);
    expect(result.discount_amount).toBe(25);
  });
});

describe('validatePromo — codes invalides', () => {
  test('rejette si code introuvable', async () => {
    promoRepository.findByCode.mockResolvedValue(null);
    await expect(validatePromo('INEXISTANT', 50)).rejects.toMatchObject({ status: 400 });
  });

  test('rejette si code désactivé', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ active: 0 }));
    await expect(validatePromo('TEST10', 50)).rejects.toMatchObject({ status: 400 });
  });

  test('rejette si pas encore valide (starts_at dans le futur)', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ starts_at: '2030-01-01T00:00:00Z' }));
    await expect(validatePromo('TEST10', 50)).rejects.toMatchObject({ status: 400 });
  });

  test('rejette si expiré (expires_at dans le passé)', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ expires_at: '2020-01-01T00:00:00Z' }));
    await expect(validatePromo('TEST10', 50)).rejects.toMatchObject({ status: 400 });
  });

  test('passe si expires_at dans le futur', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ expires_at: '2030-01-01T00:00:00Z' }));
    const result = await validatePromo('TEST10', 50);
    expect(result.discount_amount).toBe(5);
  });
});

describe('validatePromo — codes privés (préfixe PRV_)', () => {
  test('un code PRV_ est validé normalement par validatePromo', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ code: 'PRV_ACME2025', type: 'percent', value: '15' }));
    const result = await validatePromo('PRV_ACME2025', 50);
    expect(result.discount_amount).toBe(7.5); // 15% de 50
    expect(result.promo_code).toBe('PRV_ACME2025');
  });

  test('un code PRV_ désactivé est rejeté comme tout autre code', async () => {
    promoRepository.findByCode.mockResolvedValue(makePromo({ code: 'PRV_ACME2025', active: 0 }));
    await expect(validatePromo('PRV_ACME2025', 50)).rejects.toMatchObject({ status: 400 });
  });
});

describe('validatePromo — frais de livraison et total dans createOrder', () => {
  const productRepository = require('../repositories/productRepository');
  const formulaRepository = require('../repositories/formulaRepository');
  const orderRepository = require('../repositories/orderRepository');
  const { createOrder } = require('../services/orderService');

  const mockProduct = { id: 1, name: 'Banh Mi', price: 12, category: 'banhmi', available: 1 };

  beforeEach(() => {
    productRepository.findById.mockResolvedValue(mockProduct);
    productRepository.findAllAvailable.mockResolvedValue([{ ...mockProduct, options: [] }]);
    formulaRepository.findById.mockResolvedValue(null);
    orderRepository.createOrder.mockResolvedValue(1);
    // Paramètres livraison : frais 5€, gratuit à partir de 30€, minimum 20€
    settingsRepository.get.mockImplementation((key) => {
      const map = { delivery_fee: '5', free_delivery_threshold: '30', min_order_amount: '20', max_orders_per_slot: '5' };
      return Promise.resolve(map[key] ?? null);
    });
    promoRepository.findByCode.mockResolvedValue(null);
  });

  const baseBody = {
    customer: { name: 'Jean Dupont', phone: '0612345678', email: 'jean@test.fr' },
    delivery_address: '12 rue des Fleurs, Saint-Genis-Pouilly',
    delivery_time: '12:00',
    items: [{ product_id: 1, quantity: 2, options: [] }], // 24€
  };

  test('applique frais de livraison si sous le seuil', async () => {
    // 24€ < 30€ seuil → frais 5€
    const result = await createOrder(baseBody);
    expect(result.delivery_fee).toBe(5);
    expect(result.total).toBe(29); // 24 + 5
  });

  test('livraison gratuite si au-dessus du seuil', async () => {
    productRepository.findById.mockResolvedValue({ ...mockProduct, price: 16 });
    productRepository.findAllAvailable.mockResolvedValue([{ ...mockProduct, price: 16, options: [] }]);
    // 32€ > 30€ seuil → livraison gratuite
    const result = await createOrder({ ...baseBody, items: [{ product_id: 1, quantity: 2, options: [] }] });
    expect(result.delivery_fee).toBe(0);
    expect(result.total).toBe(32);
  });

  test('promo ne supprime pas la livraison gratuite si subtotal brut >= seuil', async () => {
    // Subtotal brut = 36€ > 30€ → livraison gratuite même avec promo
    productRepository.findById.mockResolvedValue({ ...mockProduct, price: 18 });
    productRepository.findAllAvailable.mockResolvedValue([{ ...mockProduct, price: 18, options: [] }]);
    promoRepository.findByCode.mockResolvedValue(makePromo({ type: 'fixed', value: '10' }));
    const result = await createOrder({ ...baseBody, items: [{ product_id: 1, quantity: 2, options: [] }], promo_code: 'TEST10' });
    expect(result.delivery_fee).toBe(0); // basé sur subtotal brut 36€
    expect(result.discount_amount).toBe(10);
    expect(result.total).toBe(26); // 36 - 10 + 0
  });
});
