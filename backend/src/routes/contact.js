const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const transporter = require('../config/mailer')

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de messages envoyés. Réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/', contactLimiter, async (req, res) => {
  const { name, email, order_number, message } = req.body

  if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' })
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email requis' })
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message requis' })

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Email invalide' })

  try {
    await transporter.sendMail({
      from: `"Kekosan Contact" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: email,
      subject: order_number
        ? `[Contact] ${name} — Commande #${order_number}`
        : `[Contact] ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
          <div style="background:#000;padding:28px 32px;text-align:center;">
            <span style="font-size:28px;font-weight:900;letter-spacing:2px;color:#ffd60a;">KEKOSAN</span>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 24px;font-size:20px;color:#111;font-weight:700;">Nouveau message de contact</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:140px;">Nom</td>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111;font-weight:500;">${name}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;"><a href="mailto:${email}" style="color:#000;font-weight:600;text-decoration:none;">${email}</a></td>
              </tr>
              ${order_number ? `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:1px;">N° commande</td>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111;font-weight:500;">#${order_number}</td>
              </tr>` : ''}
            </table>
            <div style="margin-top:24px;">
              <p style="margin:0 0 10px;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Message</p>
              <div style="background:#f9f9f9;border-left:3px solid #ffd60a;border-radius:0 8px 8px 0;padding:16px 20px;font-size:14px;color:#111;line-height:1.7;white-space:pre-wrap;">${message}</div>
            </div>
            <div style="margin-top:28px;text-align:center;">
              <a href="mailto:${email}" style="display:inline-block;background:#ffd60a;color:#000;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Répondre à ${name}</a>
            </div>
          </div>
          <div style="background:#f5f5f5;padding:16px 32px;text-align:center;font-size:11px;color:#999;">
            Saint-Genis-Pouilly · kekosan.com
          </div>
        </div>
      `,
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message.' })
  }
})

module.exports = router
