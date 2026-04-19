// Tests webhookController : events Stripe payment_intent.succeeded / failed
jest.mock('../repositories/orderRepository');
jest.mock('../services/mailService');
jest.mock('../config/socket');
jest.mock('stripe');

const orderRepository = require('../repositories/orderRepository');
const mailService = require('../services/mailService');
const socketConfig = require('../config/socket');
const Stripe = require('stripe');

const mockConstructEvent = jest.fn();
const mockEmit = jest.fn();

Stripe.mockImplementation(() => ({
  webhooks: { constructEvent: mockConstructEvent },
}));

socketConfig.getIO = jest.fn().mockReturnValue({
  to: jest.fn().mockReturnValue({ emit: mockEmit }),
});

process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';

const { handleStripeWebhook } = require('../controllers/webhookController');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (body = Buffer.from('{}')) => ({
  body,
  headers: { 'stripe-signature': 'sig_mock' },
});

const mockOrder = { id: 7, status: 'pending', payment_status: 'pending' };
const mockFullOrder = { id: 7, customer_email: 'jean@test.fr', items: [] };

beforeEach(() => {
  jest.clearAllMocks();
  orderRepository.findByPaymentIntentId.mockResolvedValue(mockOrder);
  orderRepository.updateStatus.mockResolvedValue();
  orderRepository.findFullOrderById.mockResolvedValue(mockFullOrder);
  mailService.sendOrderConfirmation = jest.fn().mockResolvedValue();
});

// ─── SIGNATURE INVALIDE ───────────────────────────────────────────────────────

describe('webhookController — signature Stripe', () => {
  test('retourne 400 si signature invalide', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Signature mismatch');
    });
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── PAYMENT INTENT SUCCEEDED ────────────────────────────────────────────────

describe('webhookController — payment_intent.succeeded', () => {
  const event = {
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_abc' } },
  };

  beforeEach(() => {
    mockConstructEvent.mockReturnValue(event);
  });

  test('met à jour le statut en confirmed + paid', async () => {
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(7, {
      status: 'confirmed',
      payment_status: 'paid',
    });
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('envoie la notification Socket.io au KDS cuisine', async () => {
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(socketConfig.getIO().to).toHaveBeenCalledWith('kitchen');
    expect(mockEmit).toHaveBeenCalledWith('new_order', mockFullOrder);
  });

  test('envoie le mail de confirmation', async () => {
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    // Laisser les microtasks se résoudre
    await Promise.resolve();
    expect(mailService.sendOrderConfirmation).toHaveBeenCalledWith(mockFullOrder);
  });

  test('idempotence : ignore si déjà payment_status = paid', async () => {
    orderRepository.findByPaymentIntentId.mockResolvedValue({ ...mockOrder, payment_status: 'paid' });
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('retourne 200 même si commande introuvable (PI non lié)', async () => {
    orderRepository.findByPaymentIntentId.mockResolvedValue(null);
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});

// ─── PAYMENT INTENT FAILED ───────────────────────────────────────────────────

describe('webhookController — payment_intent.payment_failed', () => {
  const event = {
    type: 'payment_intent.payment_failed',
    data: { object: { id: 'pi_abc' } },
  };

  beforeEach(() => {
    mockConstructEvent.mockReturnValue(event);
  });

  test('met à jour le statut en cancelled + failed', async () => {
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(7, {
      status: 'cancelled',
      payment_status: 'failed',
    });
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  test('idempotence : ignore si déjà payment_status = failed', async () => {
    orderRepository.findByPaymentIntentId.mockResolvedValue({ ...mockOrder, payment_status: 'failed' });
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  test('ne notifie pas Socket.io ni le mail', async () => {
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(mockEmit).not.toHaveBeenCalled();
    expect(mailService.sendOrderConfirmation).not.toHaveBeenCalled();
  });
});

// ─── ÉVÉNEMENTS INCONNUS ─────────────────────────────────────────────────────

describe('webhookController — événement inconnu', () => {
  test('répond 200 sans action', async () => {
    mockConstructEvent.mockReturnValue({ type: 'customer.created', data: { object: {} } });
    const res = makeRes();
    await handleStripeWebhook(makeReq(), res);
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
