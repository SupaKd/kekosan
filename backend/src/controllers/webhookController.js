const Stripe = require('stripe');
const orderRepository = require('../repositories/orderRepository');
const mailService = require('../services/mailService');
const socketConfig = require('../config/socket');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/webhook — reçoit les événements Stripe
// IMPORTANT : ce endpoint reçoit le raw body (Buffer), pas du JSON parsé
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // Signature invalide — requête rejetée
    return res.status(400).json({ error: `Webhook signature invalide : ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const order = await orderRepository.findByPaymentIntentId(paymentIntent.id);

        // Idempotence : si déjà traité (payment_status = 'paid'), on ignore silencieusement
        if (order && order.payment_status !== 'paid') {
          await orderRepository.updateStatus(order.id, {
            status: 'confirmed',
            payment_status: 'paid',
          });

          // Récupère la commande complète pour le mail et le KDS
          const fullOrder = await orderRepository.findFullOrderById(order.id);
          if (fullOrder) {
            // Notification temps réel vers l'écran cuisine
            socketConfig.getIO().to('kitchen').emit('new_order', fullOrder);

            // Envoi du mail de confirmation (non bloquant)
            mailService.sendOrderConfirmation(fullOrder).catch((err) => {
              console.error('Erreur envoi mail confirmation :', err.message);
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const order = await orderRepository.findByPaymentIntentId(paymentIntent.id);

        // Idempotence : si déjà annulé, on ignore
        if (order && order.payment_status !== 'failed') {
          await orderRepository.updateStatus(order.id, {
            status: 'cancelled',
            payment_status: 'failed',
          });
        }
        break;
      }

      // Les autres événements sont ignorés
      default:
        break;
    }
  } catch (err) {
    console.error('Erreur traitement webhook Stripe :', err.message);
  }

  // Stripe attend un 200 rapide pour confirmer la réception
  res.json({ received: true });
};

module.exports = { handleStripeWebhook };
