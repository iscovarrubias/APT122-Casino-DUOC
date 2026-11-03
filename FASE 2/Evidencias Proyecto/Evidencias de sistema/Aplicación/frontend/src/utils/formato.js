export function formatearPrecio(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (isNaN(numero)) return '—';
  return numero.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

export const ESTADO_TEXTO = {
  disponible: 'Disponible',
  baja_disponibilidad: 'Quedan pocas unidades',
  agotado: 'Agotado',
  cerrada: 'Jornada cerrada',
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

export const CATEGORIAS_MENU = ['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];

export function colorDeCategoria(categoria) {
  return CATEGORIAS_COLOR[categoria] || CATEGORIAS_COLOR.Principal;
}

export function colorTextoSobre(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const canal = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const luminancia = 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  return luminancia > 0.3 ? '#1B1F27' : '#FFFFFF';
}

export function estadoEfectivo(item) {
  if (item.jornada_estado === 'cerrada') return 'cerrada';
  if (item.disponibilidad === 'agotado') return 'agotado';
  if (item.jornada_estado === 'abierta' && item.cantidad_restante === 0) return 'agotado';
  return item.disponibilidad;
}
export const NO_DISPONIBLE = ['agotado', 'cerrada'];
