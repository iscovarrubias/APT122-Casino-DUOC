const pool = require('../config/db');
const MARCA_SIMULADO = 'dato simulado';

async function agotamientos(desde, hasta, id_sede) {
  const { rows } = await pool.query(
    `WITH primer_agotado AS (
        SELECT mp.id_preparacion, d.id_menu_preparacion, MIN(d.registrado_en) AS primera
        FROM disponibilidad d
        JOIN menu_preparacion mp ON mp.id_menu_preparacion = d.id_menu_preparacion
        JOIN menu m ON m.id_menu = mp.id_menu
        WHERE d.estado = 'agotado' AND m.id_sede = $3 AND m.fecha BETWEEN $1 AND $2
        GROUP BY mp.id_preparacion, d.id_menu_preparacion
     ),
     apariciones AS (
        SELECT mp.id_preparacion, COUNT(DISTINCT m.id_menu) AS dias
        FROM menu_preparacion mp
        JOIN menu m ON m.id_menu = mp.id_menu
        WHERE m.id_sede = $3 AND m.fecha BETWEEN $1 AND $2
        GROUP BY mp.id_preparacion
     )
     SELECT p.id_preparacion, p.nombre,
            a.dias::int AS dias_en_menu,
            COUNT(pa.id_menu_preparacion)::int AS dias_agotado,
            ROUND(100.0 * COUNT(pa.id_menu_preparacion) / a.dias, 1)::float8 AS porcentaje,
            AVG(EXTRACT(EPOCH FROM pa.primera::time))::int AS segundos_promedio
     FROM apariciones a
     JOIN preparacion p ON p.id_preparacion = a.id_preparacion
     JOIN primer_agotado pa ON pa.id_preparacion = a.id_preparacion
     GROUP BY p.id_preparacion, p.nombre, a.dias
     ORDER BY porcentaje DESC, dias_agotado DESC, p.nombre`,
    [desde, hasta, id_sede]
  );
  return rows.map((f) => ({
    ...f,
    hora_promedio: f.segundos_promedio == null ? null
      : `${String(Math.floor(f.segundos_promedio / 3600)).padStart(2, '0')}:${String(Math.floor((f.segundos_promedio % 3600) / 60)).padStart(2, '0')}`,
  }));
}

async function ventasPorHora(desde, hasta, id_sede) {
  const { rows } = await pool.query(
    `SELECT EXTRACT(HOUR FROM v.fecha_hora)::int AS hora, SUM(v.cantidad)::int AS unidades
     FROM venta_efectiva v
     JOIN menu_preparacion mp ON mp.id_menu_preparacion = v.id_menu_preparacion
     JOIN menu m ON m.id_menu = mp.id_menu
     WHERE m.id_sede = $3 AND m.fecha BETWEEN $1 AND $2
     GROUP BY 1 ORDER BY 1`,
    [desde, hasta, id_sede]
  );
  return rows;
}

async function masVendidas(desde, hasta, id_sede) {
  const { rows } = await pool.query(
    `SELECT p.id_preparacion, p.nombre,
            SUM(x.vendidas)::int AS vendidas,
            SUM(mp.cantidad_planificada)::int AS planificadas
     FROM menu_preparacion mp
     JOIN menu m ON m.id_menu = mp.id_menu
     JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
     JOIN LATERAL (
        SELECT COALESCE(SUM(v.cantidad), 0) AS vendidas FROM venta_efectiva v WHERE v.id_menu_preparacion = mp.id_menu_preparacion
     ) x ON TRUE
     WHERE m.id_sede = $3 AND m.fecha BETWEEN $1 AND $2
     GROUP BY p.id_preparacion, p.nombre
     HAVING SUM(x.vendidas) > 0
     ORDER BY vendidas DESC, p.nombre
     LIMIT 10`,
    [desde, hasta, id_sede]
  );
  return rows.map((f) => ({
    ...f,
    porcentaje_consumo: f.planificadas > 0 ? Math.round((1000 * f.vendidas) / f.planificadas) / 10 : null,
  }));
}

async function origenes(desde, hasta, id_sede) {
  const ventas = await pool.query(
    `SELECT v.origen_dato, COUNT(*)::int AS registros
     FROM venta_efectiva v
     JOIN menu_preparacion mp ON mp.id_menu_preparacion = v.id_menu_preparacion
     JOIN menu m ON m.id_menu = mp.id_menu
     WHERE m.id_sede = $3 AND m.fecha BETWEEN $1 AND $2
     GROUP BY v.origen_dato`,
    [desde, hasta, id_sede]
  );
  const disp = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE d.observacion = $4)::int AS simulados
     FROM disponibilidad d
     JOIN menu_preparacion mp ON mp.id_menu_preparacion = d.id_menu_preparacion
     JOIN menu m ON m.id_menu = mp.id_menu
     WHERE m.id_sede = $3 AND m.fecha BETWEEN $1 AND $2`,
    [desde, hasta, id_sede, MARCA_SIMULADO]
  );
  const porOrigen = Object.fromEntries(ventas.rows.map((r) => [r.origen_dato, r.registros]));
  return {
    ventas: porOrigen,
    disponibilidad: disp.rows[0],
    contiene_simulados: (porOrigen.simulado || 0) > 0 || disp.rows[0].simulados > 0,
  };
}

async function rankingPeriodo(desde, hasta) {
  const resumen = (await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE j.estado = 'cerrada')::int AS jornadas_cerradas,
        COUNT(*) FILTER (WHERE j.estado = 'cerrada' AND j.sobrante_contado)::int AS con_conteo_de_cocina,
        COUNT(*) FILTER (WHERE j.estado = 'cerrada' AND j.cierre_automatico)::int AS cierres_automaticos
     FROM jornada j
     JOIN menu m ON m.id_menu = j.id_menu
     WHERE m.fecha BETWEEN $1::date AND $2::date`,
    [desde, hasta]
  )).rows[0];

  const { rows } = await pool.query(
    `WITH jornadas_mes AS (
        SELECT j.id_jornada, j.id_menu, j.estado, j.sobrante_contado, j.iniciada_en, m.fecha
        FROM jornada j
        JOIN menu m ON m.id_menu = j.id_menu
        WHERE m.fecha BETWEEN $1::date AND $2::date
          AND j.estado = 'cerrada'
     ),
     apariciones AS (
        SELECT
          jm.id_jornada, jm.fecha, jm.iniciada_en, jm.sobrante_contado,
          mp.id_menu_preparacion, mp.id_preparacion, p.nombre
        FROM jornadas_mes jm
        JOIN menu_preparacion mp ON mp.id_menu = jm.id_menu
        JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
     ),
     stock AS (
        SELECT
          a.id_jornada, a.id_menu_preparacion,
          COALESCE(SUM(ms.delta), 0)::int AS stock_final,
          COALESCE(-SUM(ms.delta) FILTER (WHERE ms.tipo = 'venta'), 0)::int AS vendidas
        FROM apariciones a
        LEFT JOIN movimiento_stock ms ON ms.id_menu_preparacion = a.id_menu_preparacion
        GROUP BY a.id_jornada, a.id_menu_preparacion
     ),
     primer_agotado AS (
        SELECT a.id_jornada, a.id_menu_preparacion,
               MIN(ms.registrado_en) AS momento
        FROM apariciones a
        JOIN movimiento_stock ms ON ms.id_menu_preparacion = a.id_menu_preparacion
        WHERE (
          SELECT SUM(ms2.delta) FROM movimiento_stock ms2
          WHERE ms2.id_menu_preparacion = ms.id_menu_preparacion
            AND ms2.registrado_en <= ms.registrado_en
        ) <= 0
        GROUP BY a.id_jornada, a.id_menu_preparacion
     )
     SELECT
        a.id_preparacion,
        a.nombre,
        COUNT(DISTINCT a.id_jornada)::int AS jornadas,
        COUNT(DISTINCT CASE WHEN s.stock_final <= 0 THEN a.id_jornada END)::int AS dias_agotado,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN s.stock_final <= 0 THEN a.id_jornada END)
              / NULLIF(COUNT(DISTINCT a.id_jornada), 0), 1)::float8 AS porcentaje_agotado,
        ROUND(AVG(EXTRACT(EPOCH FROM (pa.momento - a.iniciada_en)) / 60.0)
              FILTER (WHERE pa.momento IS NOT NULL))::int AS minutos_hasta_agotarse,
        ROUND(AVG(s.vendidas)::numeric, 1)::float8 AS vendidas_por_jornada,
        ROUND((AVG(s.stock_final) FILTER (WHERE a.sobrante_contado AND s.stock_final > 0))::numeric, 1)::float8 AS sobrante_promedio
     FROM apariciones a
     JOIN stock s ON s.id_jornada = a.id_jornada AND s.id_menu_preparacion = a.id_menu_preparacion
     LEFT JOIN primer_agotado pa ON pa.id_jornada = a.id_jornada AND pa.id_menu_preparacion = a.id_menu_preparacion
     GROUP BY a.id_preparacion, a.nombre
     ORDER BY porcentaje_agotado DESC NULLS LAST, dias_agotado DESC, a.nombre`,
    [desde, hasta]
  );

  return { desde, hasta, resumen, platos: rows };
}

async function rankingMensual(mes) {
  const [a, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return rankingPeriodo(`${mes}-01`, `${mes}-${String(ultimo).padStart(2, '0')}`);
}

const aHora = (seg) => (seg == null ? null
  : `${String(Math.floor(seg / 3600)).padStart(2, '0')}:${String(Math.floor((seg % 3600) / 60)).padStart(2, '0')}`);

const BASE_DETALLE = `
  WITH base AS (
    SELECT mp.id_menu_preparacion, mp.id_preparacion, p.nombre AS preparacion, t.nombre AS componente,
           COALESCE(c.nombre, 'Compartido') AS categoria, (mp.id_categoria_menu IS NOT NULL) AS es_principal,
           mp.cantidad_planificada AS planificadas, mp.precio, m.fecha,
           COALESCE(v.vendidas, 0)::int AS vendidas, v.primera, v.ultima, ag.agotado_en
    FROM menu_preparacion mp
    JOIN menu m ON m.id_menu = mp.id_menu
    JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
    JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
    LEFT JOIN categoria_menu c ON c.id_categoria_menu = mp.id_categoria_menu
    LEFT JOIN LATERAL (
      SELECT SUM(ve.cantidad) AS vendidas, MIN(ve.fecha_hora) AS primera, MAX(ve.fecha_hora) AS ultima
      FROM venta_efectiva ve WHERE ve.id_menu_preparacion = mp.id_menu_preparacion
    ) v ON TRUE
    LEFT JOIN LATERAL (
      SELECT MIN(d.registrado_en) AS agotado_en FROM disponibilidad d
      WHERE d.id_menu_preparacion = mp.id_menu_preparacion AND d.estado = 'agotado'
    ) ag ON TRUE
    WHERE m.id_sede = $3 AND m.fecha BETWEEN $1 AND $2
      AND ($4::int IS NULL OR mp.id_preparacion = $4)
      AND ($5::text IS NULL OR COALESCE(c.nombre, 'Compartido') = $5)
  )`;

const RESUMEN_GRUPO = `
  COUNT(DISTINCT fecha)::int AS dias,
  COALESCE(SUM(planificadas), 0)::int AS planificadas,
  COALESCE(SUM(vendidas), 0)::int AS vendidas,
  COUNT(*) FILTER (WHERE agotado_en IS NOT NULL)::int AS dias_agotado,
  AVG(EXTRACT(EPOCH FROM agotado_en::time))::int AS segundos_agotado,
  ROUND(AVG(precio) FILTER (WHERE precio IS NOT NULL AND precio > 0))::int AS precio_promedio,
  ROUND((SUM(vendidas) FILTER (WHERE vendidas > 0)
         / NULLIF(SUM(GREATEST(EXTRACT(EPOCH FROM (ultima - primera)) / 3600.0, 0.25)) FILTER (WHERE vendidas > 0), 0))::numeric, 1)::float8 AS ritmo_hora`;

function conPorcentajes(f) {
  const { segundos_agotado, ...resto } = f;
  return {
    ...resto,
    porcentaje_consumo: f.planificadas > 0 ? Math.round((1000 * f.vendidas) / f.planificadas) / 10 : null,
    porcentaje_agotado: f.dias > 0 ? Math.round((1000 * f.dias_agotado) / f.dias) / 10 : null,
    hora_agotamiento: aHora(segundos_agotado),
  };
}

async function detalle(desde, hasta, id_sede, { id_preparacion = null, categoria = null } = {}) {
  const par = [desde, hasta, id_sede, id_preparacion, categoria];
  const [porCategoria, preparaciones, porHora, porDia] = await Promise.all([
    pool.query(`${BASE_DETALLE}
      SELECT categoria, es_principal, ${RESUMEN_GRUPO}
      FROM base GROUP BY categoria, es_principal
      ORDER BY es_principal DESC, categoria`, par),
    pool.query(`${BASE_DETALLE}
      SELECT id_preparacion, preparacion AS nombre, MIN(componente) AS componente,
             COUNT(DISTINCT categoria) FILTER (WHERE es_principal)::int AS categorias, ${RESUMEN_GRUPO}
      FROM base GROUP BY id_preparacion, preparacion
      ORDER BY SUM(vendidas) DESC, preparacion`, par),
    pool.query(`${BASE_DETALLE}
      SELECT EXTRACT(HOUR FROM ve.fecha_hora)::int AS hora, SUM(ve.cantidad)::int AS unidades
      FROM base b JOIN venta_efectiva ve ON ve.id_menu_preparacion = b.id_menu_preparacion
      GROUP BY 1 ORDER BY 1`, par),
    pool.query(`${BASE_DETALLE}
      SELECT fecha, categoria, preparacion, planificadas, vendidas, precio, agotado_en,
             ROUND((vendidas / GREATEST(EXTRACT(EPOCH FROM (ultima - primera)) / 3600.0, 0.25))::numeric, 1)::float8 AS ritmo_hora
      FROM base ORDER BY fecha DESC, categoria, preparacion LIMIT 200`, par),
  ]);
  return {
    por_categoria: porCategoria.rows.map(conPorcentajes),
    preparaciones: preparaciones.rows.map(conPorcentajes),
    ventas_por_hora: porHora.rows,
    por_dia: porDia.rows.map((f) => ({
      ...f,
      fecha: String(f.fecha).slice(0, 10),
      hora_agotado: f.agotado_en ? String(f.agotado_en).slice(11, 16) : null,
      agotado_en: undefined,
    })),
  };
}

module.exports = { detalle, agotamientos, ventasPorHora, masVendidas, origenes, rankingMensual, rankingPeriodo, MARCA_SIMULADO };
