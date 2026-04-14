const path = require('path');
const transporter = require('../config/mailer');

// Formate un montant en euros
const formatPrice = (amount) => `${parseFloat(amount).toFixed(2)} €`;

// Génère les lignes items à la carte
const renderItems = (items) => {
  if (!items || items.length === 0) return '';
  return items.map((item) => {
    const options = item.options_label
      ? `<tr><td colspan="3" style="padding:2px 0 10px;border-bottom:1px solid #e8dfc8;font-size:12px;color:#9a8c72">${item.options_label}</td></tr>`
      : '';
    return `
      <tr>
        <td style="padding:12px 0 ${item.options_label ? '2px' : '12px'};border-bottom:${item.options_label ? 'none' : '1px solid #e8dfc8'};vertical-align:top;font-size:14px;color:#2d2410;line-height:1.4">${item.product_name_snapshot}</td>
        <td style="padding:12px 0 ${item.options_label ? '2px' : '12px'};border-bottom:${item.options_label ? 'none' : '1px solid #e8dfc8'};text-align:center;color:#9a8c72;font-size:14px;vertical-align:top">×${item.quantity}</td>
        <td style="padding:12px 0 ${item.options_label ? '2px' : '12px'};border-bottom:${item.options_label ? 'none' : '1px solid #e8dfc8'};text-align:right;color:#2d2410;font-size:14px;vertical-align:top;white-space:nowrap;font-weight:600">${formatPrice(item.unit_price_snapshot * item.quantity)}</td>
      </tr>${options}`;
  }).join('');
};

// Génère les lignes formules
const renderFormulaItems = (formulaItems) => {
  if (!formulaItems || formulaItems.length === 0) return '';
  return formulaItems.map((fi) => {
    const slots = fi.slots.map((s) => `${s.slot_name} : ${s.product_name_snapshot}`).join(' · ');
    return `
      <tr>
        <td style="padding:12px 0 2px;border-bottom:none;vertical-align:top;font-size:14px;color:#2d2410;line-height:1.4">${fi.formula_name_snapshot}</td>
        <td style="padding:12px 0 2px;border-bottom:none;text-align:center;color:#9a8c72;font-size:14px;vertical-align:top">×${fi.quantity}</td>
        <td style="padding:12px 0 2px;border-bottom:none;text-align:right;color:#2d2410;font-size:14px;vertical-align:top;white-space:nowrap;font-weight:600">${formatPrice(fi.formula_price_snapshot * fi.quantity)}</td>
      </tr>
      <tr><td colspan="3" style="padding:2px 0 12px;border-bottom:1px solid #e8dfc8;font-size:12px;color:#9a8c72">${slots}</td></tr>`;
  }).join('');
};

// Envoie le mail de confirmation au client après paiement validé
const sendOrderConfirmation = async (order) => {
  const trackingUrl = `${process.env.CLIENT_URL}/tracking/${order.tracking_token}`;
  const deliveryFee = parseFloat(order.delivery_fee || 0);
  const discountAmount = parseFloat(order.discount_amount || 0);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Commande confirmée</title>
</head>
<body style="margin:0;padding:0;background:#f0e9d6;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0e9d6;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

          <!-- HEADER LOGO -->
          <tr>
            <td align="center" style="padding:40px 0 28px">
              <img src="cid:kekosanlogo" alt="Kekosan" width="180" height="auto"
                   style="display:block;width:180px;height:auto;margin:0 auto 16px" />
              <div style="font-size:11px;letter-spacing:6px;color:#9a8c72;text-transform:uppercase">Saint-Genis-Pouilly</div>
            </td>
          </tr>

          <!-- BADGE CONFIRMATION -->
          <tr>
            <td align="center" style="padding-bottom:28px">
              <div style="display:inline-block;background:#d4edda;border:1px solid #b8ddc4;border-radius:100px;padding:10px 24px">
                <span style="color:#2d7a47;font-size:13px;font-weight:700;letter-spacing:1px">✓ &nbsp;COMMANDE CONFIRMÉE</span>
              </div>
            </td>
          </tr>

          <!-- CARTE PRINCIPALE -->
          <tr>
            <td style="background:#faf6ed;border:1px solid #e0d5b8;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(100,80,30,0.08)">

              <!-- Salutation -->
              <div style="padding:28px 28px 0">
                <p style="margin:0;font-size:16px;color:#2d2410;font-weight:600">Bonjour ${order.customer_name} 👋</p>
                <p style="margin:10px 0 0;font-size:14px;color:#7a6a4a;line-height:1.6">
                  Votre paiement a bien été reçu. Notre équipe prépare votre commande avec soin.
                </p>
              </div>

              <div style="height:1px;background:#e8dfc8;margin:24px 28px"></div>

              <!-- Récapitulatif -->
              <div style="padding:0 28px">
                <div style="font-size:11px;letter-spacing:2px;color:#9a8c72;text-transform:uppercase;margin-bottom:8px;font-weight:600">Récapitulatif</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <thead>
                    <tr>
                      <th style="text-align:left;padding:8px 0;font-size:11px;color:#9a8c72;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e0d5b8">Article</th>
                      <th style="text-align:center;padding:8px 0;font-size:11px;color:#9a8c72;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e0d5b8">Qté</th>
                      <th style="text-align:right;padding:8px 0;font-size:11px;color:#9a8c72;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e0d5b8">Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderItems(order.items)}
                    ${renderFormulaItems(order.formula_items)}
                  </tbody>
                </table>

                <!-- Sous-total + promo + livraison + total -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
                  <tr>
                    <td style="padding:8px 0 4px;font-size:13px;color:#7a6a4a">Sous-total</td>
                    <td style="padding:8px 0 4px;font-size:13px;color:#7a6a4a;text-align:right">${formatPrice(order.subtotal)}</td>
                  </tr>
                  ${discountAmount > 0 ? `
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#2d7a47">Code promo (${order.promo_code})</td>
                    <td style="padding:4px 0;font-size:13px;color:#2d7a47;text-align:right;font-weight:600">− ${formatPrice(discountAmount)}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#7a6a4a">Livraison</td>
                    <td style="padding:4px 0;font-size:13px;text-align:right;${deliveryFee === 0 ? 'color:#2d7a47;font-weight:600' : 'color:#7a6a4a'}">${deliveryFee === 0 ? 'Gratuite' : formatPrice(deliveryFee)}</td>
                  </tr>
                  <tr>
                    <td style="padding:16px 0 0;font-size:17px;font-weight:700;color:#1a1200;border-top:2px solid #e0d5b8">Total payé</td>
                    <td style="padding:16px 0 0;font-size:17px;font-weight:700;color:#1a1200;text-align:right;border-top:2px solid #e0d5b8">${formatPrice(order.total)}</td>
                  </tr>
                </table>
              </div>

              <div style="height:1px;background:#e8dfc8;margin:24px 28px"></div>

              <!-- Infos livraison -->
              <div style="padding:0 28px 28px">
                <div style="font-size:11px;letter-spacing:2px;color:#9a8c72;text-transform:uppercase;margin-bottom:12px;font-weight:600">Livraison</div>
                <div style="background:#f5eedb;border:1px solid #e0d5b8;border-radius:10px;padding:14px 16px">
                  <div style="font-size:13px;color:#2d2410;line-height:1.6;font-weight:500">${order.delivery_address}</div>
                  ${order.delivery_time ? `<div style="font-size:12px;color:#7a6a4a;margin-top:6px">🕐 Créneau : <strong>${order.delivery_time}</strong></div>` : ''}
                  ${order.notes ? `<div style="font-size:12px;color:#7a6a4a;margin-top:6px;font-style:italic">📝 ${order.notes}</div>` : ''}
                </div>
              </div>

            </td>
          </tr>

          <!-- BOUTON SUIVI -->
          <tr>
            <td align="center" style="padding:32px 0">
              <a href="${trackingUrl}"
                 style="display:inline-block;background:#1a1200;color:#ffd60a;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 40px;border-radius:100px">
                Suivre ma commande →
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding-bottom:40px">
              <div style="font-size:11px;color:#b0a080;line-height:1.8;text-align:center">
                Kekosan · Livraison uniquement à Saint-Genis-Pouilly (01630)<br>
                <a href="mailto:${process.env.SMTP_USER}" style="color:#9a8c72;text-decoration:none">${process.env.SMTP_USER}</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: order.customer_email,
    subject: `✓ Commande confirmée — ${formatPrice(order.total)}`,
    html,
    attachments: [
      {
        filename: 'logokekosan.png',
        path: path.join(__dirname, '../../public/logokekosan.png'),
        cid: 'kekosanlogo',
      },
    ],
  });
};

module.exports = { sendOrderConfirmation };
