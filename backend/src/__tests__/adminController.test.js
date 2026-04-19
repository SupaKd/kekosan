// Tests adminController : login, refreshToken, updateOrderStatus, refundOrder
jest.mock('../repositories/adminRepository');
jest.mock('../repositories/orderRepository');
jest.mock('stripe');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const adminRepository = require('../repositories/adminRepository');
const orderRepository = require('../repositories/orderRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');

const mockRefundsCreate = jest.fn();
Stripe.mockImplementation(() => ({
  refunds: { create: mockRefundsCreate },
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.ADMIN_EMAIL = 'admin@kekosan.com';
process.env.ADMIN_PASSWORD_HASH = '$2a$10$mockedhash';
process.env.JWT_SECRET = 'test_secret';

const { login, refreshToken, updateOrderStatus, refundOrder, exportOrdersCsv } = require('../controllers/adminController');

// Helpers req/res
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.send = jest.fn();
  return res;
};
const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────

describe('adminController.login', () => {
  test('rejette si email ou mot de passe manquant', async () => {
    const res = makeRes();
    await login({ body: { email: '', password: '' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si email ne correspond pas à ADMIN_EMAIL', async () => {
    const res = makeRes();
    bcrypt.compare.mockResolvedValue(false);
    await login({ body: { email: 'mauvais@test.fr', password: 'pwd' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejette si mot de passe invalide', async () => {
    const res = makeRes();
    bcrypt.compare.mockResolvedValue(false);
    await login({ body: { email: 'admin@kekosan.com', password: 'mauvais' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('retourne un token JWT si identifiants valides', async () => {
    const res = makeRes();
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt_token_mock');
    await login({ body: { email: 'admin@kekosan.com', password: 'correct' } }, res, next);
    expect(res.json).toHaveBeenCalledWith({ token: 'jwt_token_mock' });
  });
});

// ─── REFRESH TOKEN ───────────────────────────────────────────────────────────

describe('adminController.refreshToken', () => {
  test('retourne un nouveau token JWT', () => {
    const res = makeRes();
    jwt.sign.mockReturnValue('new_jwt_mock');
    refreshToken({ admin: { role: 'admin' } }, res);
    expect(res.json).toHaveBeenCalledWith({ token: 'new_jwt_mock' });
  });
});

// ─── UPDATE ORDER STATUS ─────────────────────────────────────────────────────

describe('adminController.updateOrderStatus', () => {
  const mockOrder = { id: 5, status: 'confirmed', payment_status: 'paid' };

  beforeEach(() => {
    adminRepository.findOrderById.mockResolvedValue(mockOrder);
    orderRepository.updateStatus.mockResolvedValue();
  });

  test('met à jour le statut avec une valeur valide', async () => {
    const res = makeRes();
    await updateOrderStatus({ params: { id: '5' }, body: { status: 'preparing' } }, res, next);
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(5, expect.objectContaining({ status: 'preparing' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('rejette avec un statut invalide', async () => {
    const res = makeRes();
    await updateOrderStatus({ params: { id: '5' }, body: { status: 'inexistant' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('retourne 404 si commande introuvable', async () => {
    adminRepository.findOrderById.mockResolvedValue(null);
    const res = makeRes();
    await updateOrderStatus({ params: { id: '999' }, body: { status: 'preparing' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('accepte tous les statuts valides', async () => {
    const validStatuses = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'];
    for (const status of validStatuses) {
      jest.clearAllMocks();
      adminRepository.findOrderById.mockResolvedValue(mockOrder);
      orderRepository.updateStatus.mockResolvedValue();
      const res = makeRes();
      await updateOrderStatus({ params: { id: '5' }, body: { status } }, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    }
  });
});

// ─── REFUND ORDER ─────────────────────────────────────────────────────────────

describe('adminController.refundOrder', () => {
  const mockPaidOrder = {
    id: 10,
    status: 'confirmed',
    payment_status: 'paid',
    stripe_payment_intent_id: 'pi_abc123',
  };

  beforeEach(() => {
    adminRepository.findOrderById.mockResolvedValue(mockPaidOrder);
    orderRepository.updateStatus.mockResolvedValue();
    mockRefundsCreate.mockResolvedValue({ id: 're_mock' });
  });

  test('effectue le remboursement Stripe et met à jour la DB', async () => {
    const res = makeRes();
    await refundOrder({ params: { id: '10' } }, res, next);
    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_abc123' });
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(10, { status: 'cancelled', payment_status: 'refunded' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('retourne 404 si commande introuvable', async () => {
    adminRepository.findOrderById.mockResolvedValue(null);
    const res = makeRes();
    await refundOrder({ params: { id: '999' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('rejette si commande non payée', async () => {
    adminRepository.findOrderById.mockResolvedValue({ ...mockPaidOrder, payment_status: 'pending' });
    const res = makeRes();
    await refundOrder({ params: { id: '10' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  test('rejette si commande déjà annulée', async () => {
    adminRepository.findOrderById.mockResolvedValue({ ...mockPaidOrder, status: 'cancelled' });
    const res = makeRes();
    await refundOrder({ params: { id: '10' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si pas de stripe_payment_intent_id', async () => {
    adminRepository.findOrderById.mockResolvedValue({ ...mockPaidOrder, stripe_payment_intent_id: null });
    const res = makeRes();
    await refundOrder({ params: { id: '10' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── EXPORT CSV ──────────────────────────────────────────────────────────────

describe('adminController.exportOrdersCsv', () => {
  const mockOrders = [
    {
      id: 1,
      created_at: new Date('2026-04-21T10:00:00Z'),
      customer_name: 'Jean Dupont',
      customer_email: 'jean@test.fr',
      customer_phone: '0612345678',
      delivery_address: '12 rue des Fleurs, Saint-Genis-Pouilly',
      delivery_time: '12:00',
      status: 'delivered',
      payment_status: 'paid',
      subtotal: '24.00',
      delivery_fee: '0.00',
      discount_amount: '0.00',
      total: '24.00',
      notes: null,
    },
  ];

  test('retourne un CSV avec BOM UTF-8 et headers corrects', async () => {
    adminRepository.findOrdersForExport = jest.fn().mockResolvedValue(mockOrders);
    const res = makeRes();
    await exportOrdersCsv({ query: {} }, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('\uFEFF'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('jean@test.fr'));
  });

  test('échappe correctement les champs avec point-virgule', async () => {
    const ordersWithSemicolon = [{ ...mockOrders[0], notes: 'allergique; arachides' }];
    adminRepository.findOrdersForExport = jest.fn().mockResolvedValue(ordersWithSemicolon);
    const res = makeRes();
    await exportOrdersCsv({ query: {} }, res, next);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('"allergique; arachides"'));
  });
});
