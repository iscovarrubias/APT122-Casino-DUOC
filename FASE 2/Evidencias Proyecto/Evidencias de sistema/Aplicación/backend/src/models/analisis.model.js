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

async function rankingMensual(mes) {
  const resumen = (await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE j.estado = 'cerrada')::int AS jornadas_cerradas,
        COUNT(*) FILTER (WHERE j.estado = 'cerrada' AND j.sobrante_contado)::int AS con_conteo_de_cocina,
        COUNT(*) FILTER (WHERE j.estado = 'cerrada' AND j.cierre_automatico)::int AS cierres_automaticos
     FROM jornada j
     JOIN menu m ON m.id_menu = j.id_menu
     WHERE m.fecha >= $1::date AND m.fecha < ($1::date + INTERVAL '1 month')`,
    [`${mes}-01`]
  )).rows[0];

  const { rows } = await pool.query(
    `WITH jornadas_mes AS (
        SELECT j.id_jornada, j.id_menu, j.estado, j.sobrante_contado, j.iniciada_en, m.fecha
        FROM jornada j
        JOIN menu m ON m.id_menu = j.id_menu
        WHERE m.fecha >= $1::date AND m.fecha < ($1::date + INTERVAL '1 month')
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
    [`${mes}-01`]
  );

  return { resumen, platos: rows };
}

module.exports = { agotamientos, ventasPorHora, masVendidas, origenes, rankingMensual, MARCA_SIMULADO };
