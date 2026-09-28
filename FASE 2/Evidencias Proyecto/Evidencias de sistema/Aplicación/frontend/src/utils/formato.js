export function formatearPrecio(valor) {
  const numero = Number(valor);
  if (isNaN(numero)) return '—';
  return numero.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

export const ESTADO_TEXTO = {
  disponible: 'Disponible',
  baja_disponibilidad: 'Baja disponibilidad',
  agotado: 'Agotado',
};

export function calcularCaloriasTotales(componentes) {
  const todosValidados = componentes.every((c) => c.informacion_nutricional);
  if (!todosValidados) return null;
  return componentes.reduce((suma, c) => suma + Number(c.informacion_nutricional.calorias || 0), 0);
}

export function calcularPrecioTotal(componentes) {
  return componentes.reduce((suma, c) => suma + Number(c.precio || 0), 0);
}
