export const SPLASH_ACTIVO = true;
export const SPLASH_DURACION_MS = 1200;
export const SPLASH_SALIDA_MS = 250;

const CLAVE = 'casino_splash_visto';

export function debeMostrarSplash() {
  if (!SPLASH_ACTIVO) return false;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const ruta = window.location.hash.replace(/^#/, '') || '/';
    if (ruta.startsWith('/panel') || ruta === '/login') return false;
    return sessionStorage.getItem(CLAVE) !== '1';
  } catch {
    return false;
  }
}

export function marcarSplashVisto() {
  try { sessionStorage.setItem(CLAVE, '1'); } catch {  }
}
