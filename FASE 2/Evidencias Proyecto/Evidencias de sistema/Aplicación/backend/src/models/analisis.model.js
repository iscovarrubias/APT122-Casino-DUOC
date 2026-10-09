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
     FROM venta v
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
        SELECT COALESCE(SUM(v.cantidad), 0) AS vendidas FROM venta v WHERE v.id_menu_preparacion = mp.id_menu_preparacion
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
     FROM venta v
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

module.exports = { agotamientos, ventasPorHora, masVendidas, origenes, MARCA_SIMULADO };
