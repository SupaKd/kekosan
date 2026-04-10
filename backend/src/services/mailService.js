const path = require('path');
const transporter = require('../config/mailer');

// Formate un montant en euros
const formatPrice = (amount) => `${parseFloat(amount).toFixed(2)} €`;

// Génère les lignes items à la carte
const renderItems = (items) => {
  if (!items || items.length === 0) return '';
  return items.map((item) => {
    const options = item.options_label
      ? `<div style="font-size:12px;color:#888;margin-top:2px">${item.options_label}</div>`
      : '';
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;vertical-align:top">
          <div style="color:#f0f0f0;font-size:14px">${item.product_name_snapshot}</div>
          ${options}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:center;color:#888;font-size:14px;vertical-align:top">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;color:#f0f0f0;font-size:14px;vertical-align:top;white-space:nowrap">${formatPrice(item.unit_price_snapshot * item.quantity)}</td>
      </tr>`;
  }).join('');
};

// Génère les lignes formules
const renderFormulaItems = (formulaItems) => {
  if (!formulaItems || formulaItems.length === 0) return '';
  return formulaItems.map((fi) => {
    const slots = fi.slots.map((s) => `${s.slot_name} : ${s.product_name_snapshot}`).join(' · ');
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;vertical-align:top">
          <div style="color:#f0f0f0;font-size:14px">${fi.formula_name_snapshot}</div>
          <div style="font-size:12px;color:#888;margin-top:2px">${slots}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:center;color:#888;font-size:14px;vertical-align:top">×${fi.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;color:#f0f0f0;font-size:14px;vertical-align:top;white-space:nowrap">${formatPrice(fi.formula_price_snapshot * fi.quantity)}</td>
      </tr>`;
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
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

          <!-- HEADER LOGO -->
          <tr>
            <td align="center" style="padding:40px 0 32px">
              <div style="font-size:32px;font-weight:900;letter-spacing:4px;color:#ffffff;text-transform:uppercase;line-height:1">KEKOSAN</div>
              <div style="font-size:11px;letter-spacing:6px;color:#555;margin-top:6px;text-transform:uppercase">Saint-Genis-Pouilly</div>
            </td>
          </tr>

          <!-- BADGE CONFIRMATION -->
          <tr>
            <td align="center" style="padding-bottom:32px">
              <div style="display:inline-block;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:100px;padding:10px 24px">
                <span style="color:#4ade80;font-size:13px;font-weight:600;letter-spacing:1px">✓ &nbsp;COMMANDE CONFIRMÉE</span>
              </div>
            </td>
          </tr>

          <!-- CARTE PRINCIPALE -->
          <tr>
            <td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden">

              <!-- Salutation -->
              <div style="padding:28px 28px 0">
                <p style="margin:0;font-size:16px;color:#f0f0f0">Bonjour <strong>${order.customer_name}</strong>,</p>
                <p style="margin:10px 0 0;font-size:14px;color:#888;line-height:1.6">
                  Votre paiement a bien été reçu. Notre équipe prépare votre commande avec soin.
                </p>
              </div>

              <div style="height:1px;background:#2a2a2a;margin:24px 28px"></div>

              <!-- Récapitulatif -->
              <div style="padding:0 28px">
                <div style="font-size:11px;letter-spacing:2px;color:#555;text-transform:uppercase;margin-bottom:4px">Récapitulatif</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <thead>
                    <tr>
                      <th style="text-align:left;padding:8px 0;font-size:11px;color:#555;font-weight:500;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #2a2a2a">Article</th>
                      <th style="text-align:center;padding:8px 0;font-size:11px;color:#555;font-weight:500;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #2a2a2a">Qté</th>
                      <th style="text-align:right;padding:8px 0;font-size:11px;color:#555;font-weight:500;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #2a2a2a">Prix</th>
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
                    <td style="padding:6px 0;font-size:13px;color:#888">Sous-total</td>
                    <td style="padding:6px 0;font-size:13px;color:#888;text-align:right">${formatPrice(order.subtotal)}</td>
                  </tr>
                  ${discountAmount > 0 ? `
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#4ade80">Code promo (${order.promo_code})</td>
                    <td style="padding:6px 0;font-size:13px;color:#4ade80;text-align:right">− ${formatPrice(discountAmount)}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#888">Livraison</td>
                    <td style="padding:6px 0;font-size:13px;color:#888;text-align:right">${deliveryFee === 0 ? '<span style="color:#4ade80">Gratuite</span>' : formatPrice(deliveryFee)}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 0 0;font-size:16px;font-weight:700;color:#ffffff;border-top:1px solid #2a2a2a">Total payé</td>
                    <td style="padding:14px 0 0;font-size:16px;font-weight:700;color:#ffffff;text-align:right;border-top:1px solid #2a2a2a">${formatPrice(order.total)}</td>
                  </tr>
                </table>
              </div>

              <div style="height:1px;background:#2a2a2a;margin:24px 28px"></div>

              <!-- Infos livraison -->
              <div style="padding:0 28px 28px">
                <div style="font-size:11px;letter-spacing:2px;color:#555;text-transform:uppercase;margin-bottom:12px">Livraison</div>
                <div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px">
                  <div style="font-size:13px;color:#f0f0f0;line-height:1.5">${order.delivery_address}</div>
                  ${order.delivery_time ? `<div style="font-size:12px;color:#888;margin-top:6px">🕐 Créneau : ${order.delivery_time}</div>` : ''}
                  ${order.notes ? `<div style="font-size:12px;color:#888;margin-top:6px;font-style:italic">📝 ${order.notes}</div>` : ''}
                </div>
              </div>

            </td>
          </tr>

          <!-- BOUTON SUIVI -->
          <tr>
            <td align="center" style="padding:28px 0">
              <a href="${trackingUrl}"
                 style="display:inline-block;background:#ffffff;color:#000000;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:100px">
                Suivre ma commande →
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding-bottom:40px">
              <div style="font-size:11px;color:#444;line-height:1.8">
                Kekosan · Livraison uniquement à Saint-Genis-Pouilly (01630)<br>
                <a href="mailto:${process.env.SMTP_USER}" style="color:#555;text-decoration:none">${process.env.SMTP_USER}</a>
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
  });
};

module.exports = { sendOrderConfirmation };
