const mysql = require('mysql2/promise');

// Pool de connexions MySQL — partagé dans toute l'application
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'local', // hérite du fuseau du système — configurer TZ=Europe/Paris dans l'env
});

module.exports = pool;
