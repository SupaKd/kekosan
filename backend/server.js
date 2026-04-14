require('dotenv').config();

// Vérification des variables d'environnement critiques au démarrage
const REQUIRED_ENV = [
  'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'JWT_SECRET',
  'ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM',
  // MIN_ORDER_AMOUNT est optionnel — pas de minimum de commande par défaut
];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`[ERREUR DÉMARRAGE] Variables d'environnement manquantes : ${missingEnv.join(', ')}`);
  process.exit(1);
}

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const socketConfig = require('./src/config/socket');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialisation de Socket.io
socketConfig.init(httpServer);

// Middlewares globaux
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

// Le webhook Stripe doit recevoir le raw body AVANT express.json()
const { handleStripeWebhook } = require('./src/controllers/webhookController');
app.post('/api/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// Fichiers statiques (images produits) — cache 7 jours
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  maxAge: '7d',
  immutable: true,
}));

// Logo public (utilisé dans les emails)
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '30d',
}));

// Vérification de la connexion DB au démarrage
const pool = require('./src/config/db');
pool.query('SELECT 1')
  .then(() => console.log('Connexion MySQL établie'))
  .catch((err) => {
    console.error('Erreur de connexion MySQL :', err.code, err.message, err.sqlMessage);
    process.exit(1);
  });

// Routes
app.use('/api/products', require('./src/routes/products'));
app.use('/api/formulas', require('./src/routes/formulas'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/admin', require('./src/routes/admin'));

// Route de santé
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

// Gestion des routes inconnues
app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Gestion des erreurs globales
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
