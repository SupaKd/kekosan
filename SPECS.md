# Kekosan — Cahier des charges fonctionnel

Dark kitchen livraison uniquement sur Saint-Genis-Pouilly (01630).
Pas de local physique. Pas de création de compte client.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React + Vite + CSS Modules + Lucide React + Axios |
| Backend | Node.js + Express + MySQL (raw SQL, pas d'ORM) |
| Temps réel | Socket.io |
| Paiement | Stripe PaymentIntent + Webhook |
| Mail | Nodemailer (template HTML) |
| Images | Multer + Sharp (optimisation WebP) |
| Auth admin | JWT (8h, sliding window refresh) |
| Déploiement | VPS Hostinger — PM2 + Nginx + Certbot |

---

## 1. Catalogue public

### Produits
- Affichage groupé par catégories (entree, banhmi, dessert, boisson)
- Chaque produit : nom, description, prix, badge, allergènes, image
- Badges disponibles : Nouveau, Populaire, Spécial, Halal ✓, Épicé 🌶, Végan 🌿, Sans gluten
- Allergènes : 14 allergènes réglementaires (gluten, crustacés, œufs, etc.)
- Produit peut être désactivé sans être supprimé

### Options produit
- Chaque produit peut avoir des options avec supplément de prix
- Exemple : "Sauce piquante +0.50€", "Extra fromage +1€"
- Options activables/désactivables indépendamment

### Formules
- Formule multi-slot : ex. Entrée + Bánh mì + Boisson
- Chaque slot définit les catégories de produits autorisées
- Slots marquables comme obligatoires ou optionnels
- Prix fixe pour la formule entière (indépendant des produits choisis)

---

## 2. Panier

- Persisté en localStorage (survit au rechargement)
- Items à la carte et formules coexistent dans le même panier
- Clé unique par item/formule (combinaison produit + options)
- Modification des quantités
- Suppression d'un item
- Calcul en temps réel : sous-total, frais de livraison, remise, total

---

## 3. Codes promo

- Code promo saisi au checkout
- Type `percent` : remise en % (1–100)
- Type `fixed` : remise en € (cappée au sous-total)
- Dates d'activation et d'expiration optionnelles
- Code actif/inactif
- Bannière publique affichant les codes promo actifs
- La remise s'applique sur le sous-total brut

---

## 4. Checkout

### Validation commande
- Informations client : nom, téléphone, email
- Adresse de livraison : obligatoirement Saint-Genis-Pouilly **01630**
- Montant minimum de commande (configurable, défaut 20€)

### Créneaux de livraison
- Générés dynamiquement selon les horaires du service
- Intervalle configurable (défaut : 30 min) → créneaux : 11:00, 11:30, 12:00…
- Délai minimum avant le premier créneau disponible (défaut : 30 min)
- Créneaux bloqués si capacité maximale atteinte (défaut : 5 commandes/créneau)
- Jours de fermeture exceptionnelle bloqués

### Paiement Stripe
- Stripe Elements intégré (carte bancaire)
- PaymentIntent créé côté serveur avant l'INSERT en base
- Le statut passe à `confirmed` uniquement après le webhook Stripe `payment_intent.succeeded`
- En cas d'échec paiement : commande marquée `cancelled`

### Frais de livraison
- Frais fixes configurables (défaut : 5€)
- Livraison gratuite si sous-total brut ≥ seuil configurable (défaut : 20€)

---

## 5. Confirmation & suivi commande

### Email de confirmation
- Envoyé automatiquement après paiement validé (webhook Stripe)
- Contenu : récapitulatif items/formules, infos client, créneau, total
- Lien de suivi unique (token UUID v4)
- Template HTML responsive avec logo

### Page de suivi
- Accessible via `/tracking/{token}` (lien dans l'email)
- Pas de compte requis — le token UUID est l'identifiant public
- Affichage timeline du statut : En attente → Confirmée → En préparation → En livraison → Livrée
- Mise à jour en temps réel via Socket.io
- Pull-to-refresh pour actualisation manuelle

---

## 6. Interface cuisine (KDS)

Accessible sur `/cuisine` — protégée par JWT.

### Kanban temps réel
- 3 colonnes : À préparer / En cours / En livraison
- Chaque carte affiche : ID, heure, client, téléphone, adresse, créneau, items détaillés
- Bouton de passage au statut suivant sur chaque carte
- Réception des nouvelles commandes en temps réel via Socket.io (pas de refresh manuel nécessaire)

### Statuts et transitions
```
pending → confirmed (automatique via webhook Stripe)
confirmed → preparing → delivering → delivered
Toute étape → cancelled (admin)
```

---

## 7. Panel administrateur

Accessible depuis `/cuisine` après login — protégé JWT.

### Dashboard
- CA du jour / de la semaine / du mois
- Nombre de commandes par période
- Panier moyen global
- Top 5 produits les plus commandés
- Top 5 créneaux les plus chargés
- Graphique CA des 30 derniers jours
- 8 commandes récentes

### Gestion des commandes
- Liste paginée (15 par page)
- Filtres : statut, recherche (nom / email / téléphone / #id), date début, date fin
- Vue détail commande complète (items, formules, slots, notes, total)
- Changement de statut manuel
- Remboursement Stripe (annulation + remboursement total, sans auto-refund)
- Export CSV des commandes filtrées (format Excel, BOM UTF-8, séparateur `;`)

### Gestion du catalogue

**Catégories**
- Créer / modifier / supprimer
- Slug unique (immuable après création), label, ordre d'affichage
- Impossible de supprimer une catégorie ayant des produits assignés

**Produits**
- CRUD complet
- Upload image (optimisée WebP via Sharp)
- Toggle disponibilité sans suppression
- Gestion des options (CRUD, supplément prix, disponibilité)

**Formules**
- CRUD complet
- Upload image
- Gestion des slots (nom, catégories autorisées, obligatoire, ordre)
- Toggle disponibilité

### Codes promo
- CRUD : code unique, type (percent/fixed), valeur, dates, statut actif

### Paramètres service

| Paramètre | Description | Défaut |
|---|---|---|
| Service ouvert/fermé | Bloque le checkout si fermé | ouvert |
| Horaires | Heure d'ouverture et de fermeture | 11h–15h |
| Intervalle créneaux | Espacement entre créneaux (multiple de 5, max 60 min) | 30 min |
| Délai minimum | Avant le premier créneau disponible | 30 min |
| Max commandes/créneau | Anti-surcharge | 5 |
| Frais de livraison | Fixe | 5€ |
| Seuil livraison gratuite | Basé sur le sous-total brut | 20€ |
| Montant minimum | Commande minimum | 20€ |
| Jours fermés | Dates exceptionnelles (tableau YYYY-MM-DD) | — |
| Message de maintenance | Affiché quand le service est fermé | — |

---

## 8. Base de données

### Tables principales

| Table | Rôle |
|---|---|
| `categories` | Catégories du catalogue |
| `products` | Produits avec prix, badge, allergènes |
| `product_options` | Options d'un produit (supplément) |
| `formulas` | Formules avec prix global |
| `formula_slots` | Slots d'une formule (catégories autorisées) |
| `orders` | Commandes avec snapshots prix |
| `order_items` | Lignes produit d'une commande |
| `order_item_options` | Options choisies par ligne produit |
| `order_formula_items` | Lignes formule d'une commande |
| `order_formula_slots` | Choix par slot d'une formule commandée |
| `promo_codes` | Codes de réduction |
| `settings` | Clé/valeur pour tous les paramètres service |

### Règle snapshots
Toutes les tables `order_*` stockent les noms et prix **au moment de la commande** (snapshot). Une modification ultérieure du catalogue n'affecte pas les commandes existantes.

---

## 9. Sécurité & performances

- Rate limiting : 10 tentatives login / IP / 15 min
- Rate limiting : 10 créations de commande / IP / 15 min
- JWT obligatoire sur toutes les routes admin
- Vérification signature webhook Stripe (secret dédié)
- Transaction SQL atomique à la création de commande (verrou `FOR UPDATE` sur les créneaux)
- Idempotence webhook : double traitement Stripe ignoré
- Token de suivi : UUID v4 public (jamais l'ID interne)
- Images servies avec cache long-term (7 jours)
- Lazy loading de la KitchenPage (Socket.io hors bundle principal)

---

## 10. Flux utilisateur complet

```
1. Client visite le menu → browse produits/formules
2. Ajoute au panier (options, formules multi-slot)
3. Ouvre le checkout → saisit infos + adresse + créneau
4. (Optionnel) applique un code promo
5. Paye via Stripe Elements
6. Webhook Stripe → commande confirmée → email envoyé → KDS notifié
7. Client suit sa commande via le lien reçu par email
8. Cuisine met à jour le statut (KDS) → client voit en temps réel
```

---

## Variables d'environnement requises

```env
# Base de données
DB_HOST / DB_USER / DB_PASSWORD / DB_NAME

# Stripe
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET

# Auth admin
JWT_SECRET
ADMIN_EMAIL / ADMIN_PASSWORD_HASH

# Mail
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM

# App
CLIENT_URL
NODE_ENV
PORT
MIN_ORDER_AMOUNT   # optionnel, défaut 20
```
