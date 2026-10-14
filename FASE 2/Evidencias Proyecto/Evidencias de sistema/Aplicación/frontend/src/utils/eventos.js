const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let fuente = null;
const suscriptores = new Set();

function conectar() {
  if (fuente || typeof EventSource === 'undefined') return;

  fuente = new EventSource(`${API_URL}/api/menu/eventos`);

  fuente.addEventListener('cambio', () => {
    suscriptores.forEach((cb) => {
      try { cb(); } catch { }
    });
  });

  fuente.addEventListener('error', () => {
  });
}

function desconectar() {
  if (fuente) {
    fuente.close();
    fuente = null;
  }
}

export function suscribirCambios(callback) {
  suscriptores.add(callback);
  conectar();

  return () => {
    suscriptores.delete(callback);
    if (suscriptores.size === 0) desconectar();
  };
}