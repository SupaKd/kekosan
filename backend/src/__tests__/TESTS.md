# Documentation des tests — Kekosan Backend

## Vue d'ensemble

| Fichier | Tests | Ce qui est testé |
|---|---|---|
| `orderService.test.js` | 13 | Création de commande (service métier) |
| `validateOrder.test.js` | 21 | Middleware de validation HTTP |
| `validatePromo.test.js` | 16 | Codes promo publics/privés + frais de livraison |
| `adminController.test.js` | 17 | Endpoints admin (auth, statuts, remboursements) |
| `webhookController.test.js` | 9 | Événements Stripe (paiement, échec) |
| **Total** | **76** | |

---

## 1. `orderService.test.js`

Teste la fonction `createOrder()` du service métier, qui orchestre validation DB → calcul du total → Stripe → insertion.

Toutes les dépendances externes sont mockées : `productRepository`, `formulaRepository`, `orderRepository`, `promoRepository`, `settingsRepository`, Stripe.

### Cas couverts

**Cas nominal**
- Retourne `order_id`, `tracking_token` (UUID v4), `client_secret` et `total` corrects
- Appelle Stripe avec le montant en centimes (ex : 28,50 € → `2850`)
- Passe les bons snapshots à `orderRepository` (`product_name_snapshot`, `unit_price_snapshot`, `customer_email`)

**Minimum de commande**
- Rejette si le total est inférieur à 20 € (lu depuis `settingsRepository`)
- Accepte si le total est exactement 20 €

**Validation produit**
- Rejette si le produit n'existe pas en DB
- Rejette si le produit est marqué `available = 0` (rupture — la commande est bloquée même si la carte l'affiche grisée)
- Le catalogue retourne les produits non disponibles avec `available = false` (ils s'affichent grisés côté client)

**Validation formule**
- Accepte une formule valide avec tous les slots remplis
- Rejette si la formule n'existe pas
- Rejette si le nombre de slots fournis ne correspond pas à la formule
- Rejette si le produit choisi dans un slot a une catégorie non autorisée pour ce slot

---

## 2. `validateOrder.test.js`

Teste le middleware `validateOrder` (async) qui valide le body de `POST /api/orders` avant que la requête arrive au contrôleur.

`settingsRepository` est mocké pour contrôler les horaires. `jest.useFakeTimers()` fige la date au **lundi 21 avril 2026 à 11h00 (Europe/Paris)** pour rendre les tests de créneau déterministes.

### Cas couverts

**Champ customer**
- Passe avec un body entièrement valide
- Rejette si `customer` est absent
- Rejette si le nom fait moins de 2 caractères
- Rejette si le téléphone fait moins de 8 caractères
- Rejette si l'email ne contient pas `@`

**Adresse de livraison**
- Rejette si l'adresse est vide
- Rejette si l'adresse fait moins de 5 caractères
- Rejette si l'adresse n'est ni à Saint-Genis-Pouilly ni avec le code postal 01630
- Accepte une adresse contenant `saint-genis` (avec tiret, insensible à la casse)

**Créneau de livraison**
- Rejette si `delivery_time` est absent
- Rejette si le créneau est avant l'ouverture (ex : `10:00`)
- Rejette si le créneau est après la fermeture (ex : `16:00`)
- Rejette si le créneau est dans moins de 30 min (délai minimum)
- Rejette si le jour est dans la liste des jours de fermeture exceptionnelle

**Panier**
- Rejette si `items` et `formula_items` sont tous les deux vides
- Rejette si `product_id` est invalide (0 ou négatif)
- Rejette si `quantity` est 0 ou moins
- Rejette si `options` n'est pas un tableau

**Formules**
- Accepte une formule valide
- Rejette si `formula_id` est invalide
- Rejette si `slots` est un tableau vide
- Rejette si `slot_name` est absent dans un slot
- Rejette si `product_id` est invalide dans un slot

---

## 3. `validatePromo.test.js`

Teste la fonction `validatePromo()` exportée depuis `orderService`, et valide le calcul des frais de livraison dans `createOrder()`.

`promoRepository` et `settingsRepository` sont mockés. Date figée au **21 avril 2026 à 10h00 UTC**.

### Cas couverts

**Cas nominal**
- Retourne `discount_amount = 0` si aucun code promo n'est fourni
- Retourne `discount_amount = 0` si le code est une chaîne vide ou blanche
- Calcule correctement une remise de type `percent` (ex : 10% de 50 € = 5 €)
- Calcule correctement une remise de type `fixed` (ex : 3 € sur 50 €)
- La remise `fixed` est plafonnée au subtotal (ex : 100 € sur 25 € → remise de 25 €)

**Codes invalides**
- Rejette si le code n'existe pas en DB
- Rejette si le code est désactivé (`active = 0`)
- Rejette si `starts_at` est dans le futur (pas encore valide)
- Rejette si `expires_at` est dans le passé (expiré)
- Accepte si `expires_at` est dans le futur

**Codes privés (préfixe `PRV_`)**
- Un code `PRV_` est validé normalement par `validatePromo` — il fonctionne au checkout
- Un code `PRV_` désactivé est rejeté comme tout autre code
- Les codes `PRV_` ne sont jamais retournés par `GET /api/orders/active-promos` (filtrés côté contrôleur)

**Frais de livraison dans `createOrder`**
- Applique les frais de livraison si le subtotal est sous le seuil (ex : 24 € < 30 € → +5 €)
- Livraison gratuite si le subtotal est au-dessus du seuil (ex : 32 € > 30 € → +0 €)
- Une promo ne retire pas la livraison gratuite si le **subtotal brut** (avant remise) dépasse le seuil

---

## 4. `adminController.test.js`

Teste les actions du contrôleur admin. `bcryptjs`, `jsonwebtoken`, `adminRepository`, `orderRepository` et Stripe sont mockés.

### Cas couverts

**Login (`POST /api/admin/login`)**
- Rejette (400) si email ou mot de passe est vide
- Rejette (401) si l'email ne correspond pas à `ADMIN_EMAIL`
- Rejette (401) si le mot de passe est incorrect (bcrypt retourne `false`)
- Retourne un token JWT si les identifiants sont valides

**Refresh token (`POST /api/admin/refresh`)**
- Retourne un nouveau token JWT valide

**Mise à jour du statut (`PATCH /api/admin/orders/:id/status`)**
- Met à jour le statut avec une valeur valide et retourne `{ success: true }`
- Rejette (400) si le statut est inconnu
- Retourne 404 si la commande n'existe pas
- Accepte les 6 statuts valides : `pending`, `confirmed`, `preparing`, `delivering`, `delivered`, `cancelled`

**Remboursement (`POST /api/admin/orders/:id/refund`)**
- Appelle `stripe.refunds.create()` et met à jour la DB en `cancelled` + `refunded`
- Retourne 404 si la commande n'existe pas
- Rejette (400) si `payment_status` n'est pas `paid`
- Rejette (400) si la commande est déjà annulée
- Rejette (400) si `stripe_payment_intent_id` est absent

**Export CSV (`GET /api/admin/orders/export.csv`)**
- Définit le header `Content-Type: text/csv; charset=utf-8`
- Inclut le BOM UTF-8 (`﻿`) pour la compatibilité Excel
- Échappe correctement les champs contenant un point-virgule (entourés de guillemets)
- N'exporte que les commandes avec `payment_status = 'paid'` (les commandes en attente de paiement sont exclues)

---

## 5. `webhookController.test.js`

Teste le handler Stripe (`POST /api/webhook`). Stripe, `orderRepository`, `mailService` et `socketConfig` sont mockés.

### Cas couverts

**Signature Stripe**
- Retourne 400 si la signature est invalide ou absente

**`payment_intent.succeeded`**
- Met à jour la commande en `status: confirmed` + `payment_status: paid`
- Émet l'événement `new_order` sur le room Socket.io `kitchen` (écran cuisine)
- Envoie le mail de confirmation via `mailService.sendOrderConfirmation()`
- **Idempotence** : ignore si la commande est déjà `payment_status: paid` (évite le double traitement)
- Retourne 200 même si aucune commande n'est liée au PaymentIntent

**`payment_intent.payment_failed`**
- Met à jour la commande en `status: cancelled` + `payment_status: failed`
- **Idempotence** : ignore si déjà `payment_status: failed`
- N'émet pas de Socket.io et n'envoie pas de mail

**Événement inconnu**
- Répond 200 sans effectuer aucune action en DB

---

## Comportements métier couverts par les tests

| Fonctionnalité | Fichier(s) de test |
|---|---|
| Codes promo publics (affichés dans la bannière) | `validatePromo.test.js` |
| Codes promo privés (`PRV_` — jamais dans la bannière) | `validatePromo.test.js` |
| Produits en rupture (grisés, non commandables) | `orderService.test.js` |
| Dashboard admin : uniquement commandes payées | `adminController.test.js` |
| Export CSV : uniquement commandes payées | `adminController.test.js` |
| Livraison gratuite basée sur subtotal brut (avant promo) | `validatePromo.test.js` |

---

## Lancer les tests

```bash
cd backend
npm test
```

Option verbose pour voir chaque test individuellement :

```bash
npx jest --runInBand --verbose
```

Un seul fichier :

```bash
npx jest src/__tests__/webhookController.test.js
```

---

## Architecture des mocks

Tous les tests utilisent des **mocks Jest** pour isoler la logique à tester :

- **Repositories** (`productRepository`, `orderRepository`, etc.) → remplacés par des `jest.fn()` qui retournent des données fictives
- **Stripe** → instance mockée avec `jest.mock('stripe')`, les méthodes comme `paymentIntents.create` ou `refunds.create` sont des `jest.fn()`
- **`settingsRepository`** → mocké pour contrôler les paramètres (minimum commande, frais livraison, horaires)
- **`mailService`** → mocké pour éviter l'envoi de vrais emails en test
- **`socketConfig`** → mocké pour éviter la connexion Socket.io réelle
- **Timers** (`jest.useFakeTimers`) → utilisés dans `validateOrder` et `validatePromo` pour figer la date et rendre les tests de créneau déterministes
