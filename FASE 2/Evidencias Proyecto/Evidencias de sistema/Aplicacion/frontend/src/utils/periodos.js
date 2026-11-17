import { hoyChile } from './formato';

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const sumarDias = (f, n) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
export const lunesDe = (f) => { const d = new Date(`${f}T12:00:00Z`).getUTCDay(); return sumarDias(f, d === 0 ? -6 : 1 - d); };
export const ultimoDiaMes = (mes) => {
  const [a, m] = mes.split('-').map(Number);
  return `${mes}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, '0')}`;
};
export const sumarMeses = (mes, n) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1, 12)).toISOString().slice(0, 7);
};
export const nombreMes = (mes) => {
  const t = `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export const fechaLarga = (f) => `${Number(f.slice(8))} de ${MESES[Number(f.slice(5, 7)) - 1]} de ${f.slice(0, 4)}`;
export const fechaCorta = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;

export function etiquetaRango(desde, hasta) {
  if (desde.slice(0, 7) === hasta.slice(0, 7) && desde.slice(8) === '01' && hasta === ultimoDiaMes(desde.slice(0, 7))) return nombreMes(desde.slice(0, 7));
  if (desde === hasta) return fechaLarga(desde);
  return `${fechaLarga(desde)} al ${fechaLarga(hasta)}`;
}

export function atajos() {
  const hoy = hoyChile();
  const mes = hoy.slice(0, 7);
  const lunes = lunesDe(hoy);
  const mesAnt = sumarMeses(mes, -1);
  return [
    { id: 'semana', texto: 'Esta semana', desde: lunes, hasta: sumarDias(lunes, 5) },
    { id: 'mes', texto: 'Este mes', desde: `${mes}-01`, hasta: ultimoDiaMes(mes) },
    { id: 'mes-ant', texto: 'Mes anterior', desde: `${mesAnt}-01`, hasta: ultimoDiaMes(mesAnt) },
    { id: '30', texto: 'Últimos 30 días', desde: sumarDias(hoy, -29), hasta: hoy },
  ];
}
