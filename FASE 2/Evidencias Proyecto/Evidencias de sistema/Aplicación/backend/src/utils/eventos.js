const { EventEmitter } = require('node:events');

const MAX_TOTAL = Number(process.env.EVENTOS_MAX_CONEXIONES) || 1000;
const MAX_POR_IP = Number(process.env.EVENTOS_MAX_POR_IP) || 40;

const emisor = new EventEmitter();
emisor.setMaxListeners(MAX_TOTAL + 10);

const conexionesPorIp = new Map();
let total = 0;

function emitir() {
  emisor.emit('cambio');
}

function suscribir(ip, callback) {
  const actuales = conexionesPorIp.get(ip) || 0;
  if (total >= MAX_TOTAL || actuales >= MAX_POR_IP) return null;

  total += 1;
  conexionesPorIp.set(ip, actuales + 1);
  emisor.on('cambio', callback);

  let activa = true;
  return () => {
    if (!activa) return;
    activa = false;
    emisor.off('cambio', callback);
    total -= 1;
    const restantes = (conexionesPorIp.get(ip) || 1) - 1;
    if (restantes > 0) conexionesPorIp.set(ip, restantes);
    else conexionesPorIp.delete(ip);
  };
}

function conexionesActivas() {
  return total;
}

module.exports = { emitir, suscribir, conexionesActivas };
