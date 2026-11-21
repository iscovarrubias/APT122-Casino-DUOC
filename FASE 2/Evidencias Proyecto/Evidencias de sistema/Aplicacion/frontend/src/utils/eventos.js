const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const REINTENTO_MS = 15000;

let fuente = null;
let temporizador = null;
const suscriptores = new Map();

function conectar() {
  if (fuente || typeof EventSource === 'undefined') return;

  fuente = new EventSource(`${API_URL}/api/menu/eventos`);

  fuente.addEventListener('cambio', () => {
    suscriptores.forEach((dispersionMs, cb) => {
      const espera = dispersionMs > 0 ? Math.random() * dispersionMs : 0;
      setTimeout(() => {
        try {
          cb();
        } catch {}
      }, espera);
    });
  });

  fuente.addEventListener('error', () => {
    if (fuente && fuente.readyState === EventSource.CLOSED) {
      fuente = null;
      if (suscriptores.size > 0 && !temporizador) {
        temporizador = setTimeout(() => {
          temporizador = null;
          if (suscriptores.size > 0) conectar();
        }, REINTENTO_MS);
      }
    }
  });
}

function desconectar() {
  if (temporizador) {
    clearTimeout(temporizador);
    temporizador = null;
  }
  if (fuente) {
    fuente.close();
    fuente = null;
  }
}

export function suscribirCambios(callback, { dispersionMs = 0 } = {}) {
  suscriptores.set(callback, dispersionMs);
  conectar();

  return () => {
    suscriptores.delete(callback);
    if (suscriptores.size === 0) desconectar();
  };
}
