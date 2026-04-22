let _io = null;

// Initialise l'instance Socket.io — appelé une seule fois depuis server.js
const init = (httpServer) => {
  const { Server } = require('socket.io');
  _io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  _io.on('connection', (socket) => {
    // Le KDS rejoint la room "kitchen" pour recevoir les events commandes
    socket.on('join_kitchen', () => {
      socket.join('kitchen');
    });

    // Le client rejoint sa room de suivi avec son tracking_token (UUID public)
    socket.on('track_order', (trackingToken) => {
      if (typeof trackingToken === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trackingToken)) {
        socket.join(`order_${trackingToken}`);
      }
    });
  });

  return _io;
};

// Retourne l'instance — utilisé par les controllers/services pour émettre
const getIO = () => {
  if (!_io) throw new Error('Socket.io non initialisé');
  return _io;
};

module.exports = { init, getIO };
