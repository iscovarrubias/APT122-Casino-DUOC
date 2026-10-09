export function formatearPrecio(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
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

const ZONA = 'America/Santiago';

export function aISOChile(fecha) {
  return fecha.toLocaleDateString('en-CA', { timeZone: ZONA }); 
}

export function hoyChile() {
  return aISOChile(new Date());
}

export function haceDiasChile(dias) {
  return aISOChile(new Date(Date.now() - dias * 24 * 60 * 60 * 1000));
}

export function parseFechaISO(fechaISO) {
  const [anio, mes, dia] = String(fechaISO).slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function formatearHora(marca) {
  if (!marca) return '';
  return String(marca).slice(11, 16);
}


export const CATEGORIAS_COLOR = {
  Principal:     { color: '#F5A623', light: '#FDECD2' },
  JUNAEB:        { color: '#D11B1B', light: '#FBE3E3' },
  Vegetariano:   { color: '#3C7424', light: '#E1EFD8' },
  Hipocalórico:  { color: '#318386', light: '#D7EAEB' },
};

export function colorDeCategoria(categoria) {
  return CATEGORIAS_COLOR[categoria] || CATEGORIAS_COLOR.Principal;
}
