const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function obtenerMenuHoy(categoria, fecha) {
  const params = new URLSearchParams();
  if (categoria) params.set('categoria', categoria);
  if (fecha) params.set('fecha', fecha);

  const res = await fetch(`${API_URL}/api/menu/hoy?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Error al consultar el menú (${res.status})`);
  }
  return res.json();
}

export async function obtenerPreparaciones() {
  const res = await fetch(`${API_URL}/api/preparaciones`);
  if (!res.ok) {
    throw new Error(`Error al consultar preparaciones (${res.status})`);
  }
  return res.json();
}
