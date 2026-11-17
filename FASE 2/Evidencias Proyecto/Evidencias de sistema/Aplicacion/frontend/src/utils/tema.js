import { useSyncExternalStore } from 'react';
import { useAuth } from '../context/auth-context';
import { pedir } from '../api/cliente';

const CLAVE = 'casino_tema';
const suscriptores = new Set();
let temaActual = null;

function leerGuardado() {
  try {
    return localStorage.getItem(CLAVE) === 'oscuro' ? 'oscuro' : 'claro';
  } catch {
    return 'claro';
  }
}

export function aplicarTema(nuevo) {
  temaActual = nuevo;
  document.documentElement.dataset.theme = nuevo === 'oscuro' ? 'oscuro' : '';
  try { localStorage.setItem(CLAVE, nuevo); } catch {}
  suscriptores.forEach((cb) => cb());
}

function suscribir(cb) {
  suscriptores.add(cb);
  return () => suscriptores.delete(cb);
}

function leer() {
  if (temaActual === null) temaActual = leerGuardado();
  return temaActual;
}

export function useTema() {
  const tema = useSyncExternalStore(suscribir, leer, () => 'claro');
  const { usuario } = useAuth();

  const alternar = () => {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro';
    aplicarTema(nuevo);
    
    if (usuario) {
      pedir('/api/auth/tema', { metodo: 'PATCH', cuerpo: { tema: nuevo } }).catch(() => {});
    }
  };

  return { tema, esOscuro: tema === 'oscuro', alternar };
}