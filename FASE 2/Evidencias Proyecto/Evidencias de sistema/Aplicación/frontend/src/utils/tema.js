import { useSyncExternalStore } from 'react';

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

function aplicar(nuevo) {
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

export function alternarTema() {
  aplicar(leer() === 'oscuro' ? 'claro' : 'oscuro');
}

export function useTema() {
  const tema = useSyncExternalStore(suscribir, leer, () => 'claro');
  return { tema, esOscuro: tema === 'oscuro', alternar: alternarTema };
}