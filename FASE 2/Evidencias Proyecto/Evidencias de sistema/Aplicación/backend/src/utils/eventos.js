const { EventEmitter } = require('node:events');

const emisor = new EventEmitter();
emisor.setMaxListeners(0);

function emitir() {
  emisor.emit('cambio');
}

function suscribir(callback) {
  emisor.on('cambio', callback);
  return () => emisor.off('cambio', callback);
}

module.exports = { emitir, suscribir };