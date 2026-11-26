import { hoyChile } from '../../utils/formato';
import { MESES } from '../../utils/periodos';
import { Utensils, Ticket, Leaf, Salad, CakeSlice, CupSoda, Soup, Wheat, Apple } from 'lucide-react';

export const PRINCIPALES = [
  { categoria: 'General', Icono: Utensils },
  { categoria: 'JUNAEB', Icono: Ticket },
  { categoria: 'Vegetariano', Icono: Leaf },
  { categoria: 'Hipocalórico', Icono: Salad },
];

export const ACOMPANAMIENTOS = [
  { tipo: 'Ensalada', Icono: Salad, color: '#318386', aplica: 'Exclusivo: General, Vegetariano e Hipocalórico' },
  { tipo: 'Sopa', Icono: Soup, color: '#B07C3C', aplica: 'Exclusivo: General, Vegetariano e Hipocalórico' },
  { tipo: 'Pan', Icono: Wheat, color: '#A06B3C', aplica: 'Opcional, exclusivo de General y Vegetariano', opcional: true },
  { tipo: 'Postre', Icono: CakeSlice, color: '#B15FBB', aplica: 'Exclusivo: General y Vegetariano (a elección con fruta)' },
  { tipo: 'Fruta', Icono: Apple, color: '#D94040', aplica: 'Exclusivo: General y Vegetariano (a elección con postre) e Hipocalórico' },
  { tipo: 'Bebida', Icono: CupSoda, color: '#4C8FD1', aplica: 'En todos los menús' },
];
export const REQUERIDOS_COMPARTIDOS = ['Ensalada', 'Sopa', 'Postre', 'Fruta', 'Bebida'];
export const aTexto = (v) => (v === null || v === undefined || v === '' ? '' : String(Number(v)));
export const sumarDias = (f, n) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
export const lunesDe = (f) => {
  const d = new Date(`${f}T12:00:00Z`).getUTCDay();
  return sumarDias(f, d === 0 ? -6 : 1 - d);
};
const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const nombreDia = (f) => NOMBRES_DIA[(new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7];
export const nombreLargo = (f) => {
  const d = nombreDia(f);
  return `${d.charAt(0).toUpperCase()}${d.slice(1)} ${Number(f.slice(8))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;
};
export function etiquetaRelativa(f) {
  const hoy = hoyChile();
  const dif = Math.round((new Date(`${f}T12:00:00Z`) - new Date(`${hoy}T12:00:00Z`)) / 86400000);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Mañana';
  if (dif === -1) return 'Ayer';
  return dif > 0 ? `En ${dif} días` : `Hace ${-dif} días`;
}
export const corta = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

export const claveRanura = (tipo, categoria) => `${tipo}-${categoria || 'sin'}`;

export function etiquetaCopia(tipo, f) {
  if (!f) return null;
  if (tipo === 'semana') return `Semana del ${nombreDia(lunesDe(f))} ${corta(lunesDe(f))}`;
  return `${nombreDia(f)} ${corta(f)}`;
}
