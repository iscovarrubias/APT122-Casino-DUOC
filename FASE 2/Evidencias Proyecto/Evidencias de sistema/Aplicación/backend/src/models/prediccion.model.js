const pool = require('../config/db');
const { hoyChile } = require('../utils/fecha');
const jornadaModel = require('./jornada.model');
const p = require('../utils/prediccion');

const PRINCIPAL = "(SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Plato Principal')";

async function nombresCategorias() {
  return (await pool.query('SELECT nombre FROM categoria_menu ORDER BY id_categoria_menu')).rows.map((r) => r.nombre);
}

async function historial(id_sede, hasta) {
  const dias = (await pool.query(
    `SELECT m.fecha::text AS fecha, EXTRACT(ISODOW FROM m.fecha)::int AS dow, cat.nombre AS categoria,
            mp.id_menu_preparacion, mp.cantidad_planificada AS planificado,
            COALESCE(SUM(v.cantidad), 0)::int AS vendidas,
            (SELECT MIN(EXTRACT(HOUR FROM d.registrado_en) * 60 + EXTRACT(MINUTE FROM d.registrado_en))
             FROM disponibilidad d WHERE d.id_menu_preparacion = mp.id_menu_preparacion AND d.estado = 'agotado')::int AS hora_agotado
     FROM menu m
     JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
     JOIN categoria_menu cat ON cat.id_categoria_menu = mp.id_categoria_menu
     LEFT JOIN venta_efectiva v ON v.id_menu_preparacion = mp.id_menu_preparacion
     WHERE m.id_sede = $1 AND m.fecha < $2 AND mp.id_tipo_componente = ${PRINCIPAL}
     GROUP BY m.fecha, cat.nombre, mp.id_menu_preparacion, mp.cantidad_planificada
     HAVING COALESCE(SUM(v.cantidad), 0) > 0
     ORDER BY m.fecha`, [id_sede, hasta])).rows;

  const bins = (await pool.query(
    `SELECT mp.id_menu_preparacion,
            (EXTRACT(HOUR FROM v.fecha_hora) * 60 + FLOOR(EXTRACT(MINUTE FROM v.fecha_hora) / 5) * 5)::int AS bin,
            SUM(v.cantidad)::int AS unidades
     FROM venta_efectiva v
     JOIN menu_preparacion mp ON mp.id_menu_preparacion = v.id_menu_preparacion
     JOIN menu m ON m.id_menu = mp.id_menu
     WHERE m.id_sede = $1 AND m.fecha < $2 AND mp.id_tipo_componente = ${PRINCIPAL} AND mp.id_categoria_menu IS NOT NULL
     GROUP BY 1, 2`, [id_sede, hasta])).rows;

  const origenes = (await pool.query(
    `SELECT DISTINCT v.origen_dato FROM venta_efectiva v
     JOIN menu_preparacion mp ON mp.id_menu_preparacion = v.id_menu_preparacion
     JOIN menu m ON m.id_menu = mp.id_menu
     WHERE m.id_sede = $1 AND m.fecha < $2`, [id_sede, hasta])).rows.map((r) => r.origen_dato);

  const porMp = new Map(dias.map((d) => [d.id_menu_preparacion, { ...d, agoto: d.hora_agotado != null, bins: [] }]));
  bins.forEach((b) => porMp.get(b.id_menu_preparacion)?.bins.push({ bin: b.bin, unidades: b.unidades }));
  const categorias = {};
  for (const d of porMp.values()) (categorias[d.categoria] = categorias[d.categoria] || []).push(d);
  return { categorias, origenes, contiene_simulados: origenes.includes('simulado') };
}

async function sugerencias(fecha, id_sede) {
  const [h, nombres] = await Promise.all([historial(id_sede, fecha), nombresCategorias()]);
  const planificados = Object.fromEntries((await pool.query(
    `SELECT cat.nombre AS categoria, mp.cantidad_planificada
     FROM menu m JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
     JOIN categoria_menu cat ON cat.id_categoria_menu = mp.id_categoria_menu
     WHERE m.fecha = $1 AND m.id_sede = $2 AND mp.id_tipo_componente = ${PRINCIPAL}`, [fecha, id_sede])).rows
    .map((r) => [r.categoria, r.cantidad_planificada]));

  const categorias = nombres.map((categoria) => ({
    categoria,
    estimacion: p.estimarDemanda(h.categorias[categoria] || [], fecha),
    planificado: planificados[categoria] ?? null,
  }));
  const compartidos = categorias.every((c) => c.estimacion)
    ? { sugerido: categorias.reduce((s, c) => s + c.estimacion.sugerido, 0) } : null;
  return { fecha, contiene_simulados: h.contiene_simulados, categorias, compartidos };
}

const minutosDe = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const ahoraChile = () => minutosDe(new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Santiago', hour12: false, hour: '2-digit', minute: '2-digit' }));

async function hoy(id_sede) {
  const fecha = hoyChile();
  const h = await historial(id_sede, fecha);
  const filas = (await pool.query(
    `SELECT cat.nombre AS categoria, mp.id_menu_preparacion,
            COALESCE(SUM(ms.delta), 0)::int AS restante,
            COALESCE(-SUM(ms.delta) FILTER (WHERE ms.tipo IN ('venta','anulacion')), 0)::int AS vendidas
     FROM menu m
     JOIN jornada j ON j.id_menu = m.id_menu AND j.estado = 'abierta'
     JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
     JOIN categoria_menu cat ON cat.id_categoria_menu = mp.id_categoria_menu
     LEFT JOIN movimiento_stock ms ON ms.id_menu_preparacion = mp.id_menu_preparacion
     WHERE m.fecha = $1 AND m.id_sede = $2 AND mp.id_tipo_componente = ${PRINCIPAL}
     GROUP BY cat.nombre, cat.id_categoria_menu, mp.id_menu_preparacion ORDER BY cat.id_categoria_menu`, [fecha, id_sede])).rows;

  const ahora = ahoraChile();
  const cierre = minutosDe(jornadaModel.HORA_CIERRE);
  const categorias = filas.map((f) => ({
    categoria: f.categoria, restante: f.restante, vendidas: f.vendidas,
    estimacion: p.estimarAgotamiento({
      curva: p.construirCurva(h.categorias[f.categoria] || []), restante: f.restante, vendidasHoy: f.vendidas, ahora, cierre,
    }),
  }));
  return { fecha, contiene_simulados: h.contiene_simulados, categorias };
}

async function confiabilidad(id_sede) {
  const h = await historial(id_sede, hoyChile());
  const cierre = minutosDe(jornadaModel.HORA_CIERRE);
  const resultados = Object.entries(h.categorias).map(([categoria, dias]) => ({
    categoria, dias_con_datos: dias.length,
    demanda: p.backtestDemanda(dias),
    agotamiento: p.backtestAgotamiento(dias, { cierre }),
  }));
  const quitarSumas = ({ sumas, ...resto }) => resto;
  return {
    contiene_simulados: h.contiene_simulados, origenes: h.origenes,
    global: {
      demanda: p.combinarDemanda(resultados.map((r) => r.demanda)),
      agotamiento: p.combinarAgotamiento(resultados.map((r) => r.agotamiento)),
    },
    categorias: resultados.map((r) => ({ categoria: r.categoria, dias_con_datos: r.dias_con_datos, demanda: quitarSumas(r.demanda), agotamiento: quitarSumas(r.agotamiento) })),
  };
}

module.exports = { sugerencias, hoy, confiabilidad };
