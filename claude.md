# CLAUDE.md — Banh Mi Dark Kitchen

## Projet

Plateforme de commande en ligne avec livraison uniquement sur Saint-Genis-Pouilly (01630).
Pas de local physique. Pas de création de compte client.
Suivi de commande via lien unique (UUID token) envoyé par mail.

## Stack

- Frontend : React + Vite + CSS Modules + Lucide React + Axios
- Backend : Node.js + Express + MySQL (raw SQL, pas d'ORM)
- Paiement : Stripe PaymentIntent + webhook
- Mail : Nodemailer (confirmation + facture PDF)
- Temps réel : Socket.io (KDS cuisine)
- Deploy : Hostinger VPS — PM2 + Nginx + Certbot

## Architecture backend

routes → controllers → services → repositories
Raw SQL uniquement. Pas de Sequelize, pas de Prisma.

## Base de données

- Fichier SQL : `server/db/schema.sql`
- Tables : products, product_options, formulas, formula_slots,
  orders, order_items, order_item_options,
  order_formula_items, order_formula_slots
- Toujours utiliser les snapshots (nom + prix) dans les tables order\_\*
- Minimum de commande : lire MIN_ORDER_AMOUNT dans .env (défaut 20€)

## Conventions

- Commentaires en français
- Nommage variables/fonctions en anglais
- Composants React fonctionnels uniquement
- Pas de console.log en production
- CSS Modules uniquement, pas de style inline

## Variables d'environnement clés

```
DB_HOST / DB_USER / DB_PASSWORD / DB_NAME
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
JWT_SECRET (admin uniquement)
MIN_ORDER_AMOUNT=20
SMTP_HOST / SMTP_USER / SMTP_PASS
CLIENT_URL
```

## Règles métier importantes

- Le tracking_token est un UUID v4 généré à la création de la commande
- Le statut de commande ne passe à "confirmed" qu'après webhook Stripe paid
- Pas de remboursement automatique — géré manuellement depuis le dashboard admin
- Les order_formula_slots stockent les choix produit slot par slot
