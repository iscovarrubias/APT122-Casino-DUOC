import { ErrorApi } from './cliente';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function obtener(ruta, textoError) {
  let res;
  try {
    res = await fetch(`${API_URL}${ruta}`);
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
  }
  if (!res.ok) {
    throw new ErrorApi(`${textoError} (${res.status})`, res.status);
  }
  return res.json();
}

export function obtenerMenuHoy(categoria, fecha) {
  const params = new URLSearchParams();
  if (categoria) params.set('categoria', categoria);
  if (fecha) params.set('fecha', fecha);
  return obtener(`/api/menu/hoy?${params.toString()}`, 'Error al consultar el menú');
}

export function obtenerPreparaciones() {
  return obtener('/api/preparaciones', 'Error al consultar preparaciones');
}

export function obtenerHistorialMenu(desde, hasta) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  return obtener(`/api/menu/historial?${params.toString()}`, 'Error al consultar el historial');
}
