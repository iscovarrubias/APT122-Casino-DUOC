import { consultarMes } from '../api/gestion';

const sumar = (f, n) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const lunesDe = (f) => { const d = new Date(`${f}T12:00:00Z`).getUTCDay(); return sumar(f, d === 0 ? -6 : 1 - d); };
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dia = (f) => Number(f.slice(8, 10));
const mesNombre = (f) => MESES[Number(f.slice(5, 7)) - 1];
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export const ORDEN_CATEGORIAS = ['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];
export const ESTILO_CATEGORIA = {
  Principal: { texto: '9A5B00', fila: 'FEF4E6', etiqueta: 'FDECD2' },
  JUNAEB: { texto: 'D11B1B', fila: 'FDF5F5', etiqueta: 'FBE3E3' },
  Vegetariano: { texto: '3C7424', fila: 'F1F7ED', etiqueta: 'E1EFD8' },
  Hipocalórico: { texto: '318386', fila: 'EBF5F5', etiqueta: 'D7EAEB' },
};
const ESTILO_OTRA = { texto: '374151', fila: 'F3F4F6', etiqueta: 'E5E7EB' };
export const estiloCategoria = (c) => ESTILO_CATEGORIA[c] || ESTILO_OTRA;
const ORDEN_ACOMP = ['Entrada', 'Postre', 'Bebida'];
const rangoCat = (c) => { const i = ORDEN_CATEGORIAS.indexOf(c); return i === -1 ? 99 : i; };

export async function cargarPeriodo({ modo, fecha, mes }) {
  const lunes = lunesDe(fecha);
  const meses = modo === 'mes' ? [mes] : [...new Set([lunes.slice(0, 7), sumar(lunes, 5).slice(0, 7)])];
  const respuestas = await Promise.all(meses.map((m) => consultarMes(m)));
  const dias = respuestas.flatMap((r) => r.dias);
  return construirPeriodo({ modo, fecha, mes, dias });
}

export function construirPeriodo({ modo, fecha, mes, dias }) {
  const mapa = new Map(dias.map((d) => [String(d.fecha).slice(0, 10), d]));
  const lunes = lunesDe(fecha);
  let lunes0 = lunes;
  let lunesN = lunes;
  if (modo === 'mes') {
    lunes0 = lunesDe(`${mes}-01`);
    const ultimo = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
    lunesN = lunesDe(ultimo);
  }

  const semanas = [];
  for (let l = lunes0; l <= lunesN; l = sumar(l, 7)) {
    const lista = [];
    for (let i = 0; i < 6; i++) {
      const f = sumar(l, i);
      const info = mapa.get(f);
      const comps = (info?.componentes || [])
        .map((c) => ({
          tipo: c.componente,
          categoria: c.categoria,
          preparacion: c.preparacion,
          cantidad: Number(c.cantidad) || 0,
          precio: c.precio === null || c.precio === undefined ? null : Number(c.precio),
        }))
        .sort((a, b) => {
          if (a.tipo === 'Plato Principal' && b.tipo === 'Plato Principal') return rangoCat(a.categoria) - rangoCat(b.categoria);
          if (a.tipo === 'Plato Principal') return -1;
          if (b.tipo === 'Plato Principal') return 1;
          return ORDEN_ACOMP.indexOf(a.tipo) - ORDEN_ACOMP.indexOf(b.tipo);
        });
      lista.push({
        fecha: f,
        indice: i,
        fuera: modo === 'mes' && !f.startsWith(mes),
        tiene: comps.length > 0,
        publicado: !!info?.publicado,
        comps,
      });
    }
    semanas.push({ lunes: l, sabado: sumar(l, 5), dias: lista });
  }

  const primero = semanas[0].dias.find((d) => !d.fuera) || semanas[0].dias[0];
  const ultimo = [...semanas[semanas.length - 1].dias].reverse().find((d) => !d.fuera) || semanas[semanas.length - 1].dias[5];
  const anio = (modo === 'mes' ? mes : primero.fecha).slice(0, 4);
  let etiquetaMes;
  let subtitulo;
  if (modo === 'mes') {
    etiquetaMes = `${mesNombre(`${mes}-01`).toUpperCase()} ${anio}`;
    subtitulo = `Mes de ${mesNombre(`${mes}-01`)} de ${anio}`;
  } else {
    const a = primero.fecha;
    const b = ultimo.fecha;
    const mismoMes = a.slice(0, 7) === b.slice(0, 7);
    etiquetaMes = mismoMes
      ? `${mesNombre(a).toUpperCase()} ${anio}`
      : `${mesNombre(a).slice(0, 3).toUpperCase()} – ${mesNombre(b).slice(0, 3).toUpperCase()} ${b.slice(0, 4)}`;
    subtitulo = mismoMes
      ? `Semana del ${dia(a)} al ${dia(b)} de ${mesNombre(a)} de ${anio}`
      : `Semana del ${dia(a)} de ${mesNombre(a)} al ${dia(b)} de ${mesNombre(b)} de ${b.slice(0, 4)}`;
  }

  return {
    modo,
    etiquetaMes,
    subtitulo,
    semanas,
    archivo: modo === 'mes' ? `mes_${mes}` : `semana_${lunes}`,
  };
}

export const principalesDe = (d) => d.comps.filter((c) => c.tipo === 'Plato Principal');
export const acompDe = (d) => d.comps.filter((c) => c.tipo !== 'Plato Principal');
export const combosDe = (d) => principalesDe(d).reduce((s, c) => s + c.cantidad, 0);
export const diasDelPeriodo = (p) => p.semanas.flatMap((s) => s.dias).filter((d) => !d.fuera);

export function categoriasDelPeriodo(p) {
  const usadas = new Set(diasDelPeriodo(p).flatMap((d) => principalesDe(d).map((c) => c.categoria)));
  const extra = [...usadas].filter((c) => !ORDEN_CATEGORIAS.includes(c)).sort();
  return [...ORDEN_CATEGORIAS, ...extra];
}

export const nombreLargo = (f) => `${cap(DIAS[(new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7])} ${dia(f)} de ${mesNombre(f)} de ${f.slice(0, 4)}`;
export const encabezadoDia = (f) => `${DIAS[(new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7].toUpperCase()} ${dia(f)}`;
const etiquetaCorta = (f) => `${DIAS_CORTOS[(new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7]} ${dia(f)}`;
export const rangoSemana = (s) => `${dia(s.lunes)} ${mesNombre(s.lunes).slice(0, 3)} – ${dia(s.sabado)} ${mesNombre(s.sabado).slice(0, 3)}`;

export function totalesDelPeriodo(p) {
  const mapa = new Map();
  diasDelPeriodo(p).forEach((d) => {
    d.comps.forEach((c) => {
      const clave = `${c.tipo}|${c.categoria || ''}|${c.preparacion}`;
      if (!mapa.has(clave)) mapa.set(clave, { tipo: c.tipo, categoria: c.categoria, preparacion: c.preparacion, total: 0, dias: [] });
      const fila = mapa.get(clave);
      fila.total += c.cantidad;
      fila.dias.push(etiquetaCorta(d.fecha));
    });
  });
  const rango = (f) => (f.tipo === 'Plato Principal' ? 0 : 1 + ORDEN_ACOMP.indexOf(f.tipo));
  return [...mapa.values()]
    .map((f) => ({ ...f, textoDias: [...new Set(f.dias)].join(', ') }))
    .sort((a, b) => rango(a) - rango(b) || rangoCat(a.categoria) - rangoCat(b.categoria) || a.preparacion.localeCompare(b.preparacion, 'es'));
}

export const nombreTipo = (t) => (t === 'Plato Principal' ? 'Plato principal' : t);

export function lineasIncluye(d) {
  return acompDe(d).map((c) => `${c.tipo}: ${c.preparacion}`);
}

export function nombreArchivo(p, parte, extension) {
  return `Planificacion_${p.archivo}${parte ? `_${parte}` : ''}.${extension}`;
}
