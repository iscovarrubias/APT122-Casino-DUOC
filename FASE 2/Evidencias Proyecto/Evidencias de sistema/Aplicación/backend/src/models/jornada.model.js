const pool = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { estadoPorStock } = require('../utils/stock');
const { hoyChile } = require('../utils/fecha');
const eventos = require('../utils/eventos');
const HORA_CIERRE = process.env.HORA_CIERRE_AUTOMATICO || '16:00';
const horaChile = () =>
  new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Santiago', hour12: false, hour: '2-digit', minute: '2-digit' });

async function transaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const stockDe = async (c, id_menu_preparacion) =>
  (await c.query(
    `SELECT COALESCE(SUM(delta), 0)::int AS restante,
            COALESCE(SUM(delta) FILTER (WHERE tipo IN ('inicio','reposicion')), 0)::int AS total
     FROM movimiento_stock WHERE id_menu_preparacion = $1`,
    [id_menu_preparacion]
  )).rows[0];

async function sincronizarDisponibilidad(c, ids, id_usuario) {
  for (const id of ids) {
    const estado = estadoPorStock(await stockDe(c, id));
    if (!estado) continue;
    const ultimo = (await c.query(
      `SELECT estado FROM disponibilidad WHERE id_menu_preparacion = $1
       ORDER BY registrado_en DESC, id_disponibilidad DESC LIMIT 1`, [id])).rows[0];
    if ((ultimo?.estado ?? 'disponible') !== estado) {
      await c.query(
        `INSERT INTO disponibilidad (id_menu_preparacion, estado, id_usuario, observacion)
         VALUES ($1, $2, $3, 'stock automático')`, [id, estado, id_usuario ?? null]);
    }
  }
}

const movimiento = (c, id_mp, tipo, delta, id_usuario, id_venta_combo = null, observacion = null) =>
  c.query(
    `INSERT INTO movimiento_stock (id_menu_preparacion, tipo, delta, id_usuario, id_venta_combo, observacion)
     VALUES ($1, $2, $3, $4, $5, $6)`, [id_mp, tipo, delta, id_usuario ?? null, id_venta_combo, observacion]);

const jornadaDeHoy = async (c, id_sede, bloquear = false) =>
  (await c.query(
    `SELECT j.*, m.fecha FROM jornada j JOIN menu m ON m.id_menu = j.id_menu
     WHERE m.fecha = $1 AND m.id_sede = $2 ${bloquear ? 'FOR UPDATE OF j' : ''}`,
    [hoyChile(), id_sede])).rows[0];

async function componentesConStock(c, id_menu) {
  const { rows } = await c.query(
    `SELECT mp.id_menu_preparacion, p.nombre AS preparacion, cat.nombre AS categoria, t.nombre AS componente,
            mp.cantidad_planificada,
            COALESCE(SUM(ms.delta), 0)::int AS restante,
            COALESCE(SUM(ms.delta) FILTER (WHERE ms.tipo IN ('inicio','reposicion')), 0)::int AS total_disponible,
            COALESCE(-SUM(ms.delta) FILTER (WHERE ms.tipo IN ('venta','anulacion')), 0)::int AS vendidas,
            COALESCE(d.estado, 'disponible') AS disponibilidad,
            d.registrado_en AS disponibilidad_actualizada_en
     FROM menu_preparacion mp
     JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
     JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
     LEFT JOIN categoria_menu cat ON cat.id_categoria_menu = mp.id_categoria_menu
     LEFT JOIN movimiento_stock ms ON ms.id_menu_preparacion = mp.id_menu_preparacion
     LEFT JOIN LATERAL (
        SELECT estado, registrado_en FROM disponibilidad WHERE id_menu_preparacion = mp.id_menu_preparacion
        ORDER BY registrado_en DESC, id_disponibilidad DESC LIMIT 1
     ) d ON TRUE
     WHERE mp.id_menu = $1
     GROUP BY mp.id_menu_preparacion, p.nombre, cat.nombre, t.nombre, t.id_tipo_componente, d.estado, d.registrado_en
     ORDER BY t.id_tipo_componente, cat.nombre NULLS FIRST`, [id_menu]);
  return rows;
}

async function cerrarEn(c, j, { id_usuario = null, sobrantes = null, automatico = false }) {
  let contado = false;
  const tocados = [];
  if (sobrantes && typeof sobrantes === 'object') {
    for (const [id, valor] of Object.entries(sobrantes)) {
      if (valor === '' || valor === null || valor === undefined) continue;
      const n = Number(valor);
      if (!Number.isInteger(n) || n < 0) throw new ApiError(400, 'Los sobrantes deben ser enteros mayores o iguales a 0.');
      const mp = (await c.query('SELECT 1 FROM menu_preparacion WHERE id_menu_preparacion = $1 AND id_menu = $2', [id, j.id_menu])).rows[0];
      if (!mp) throw new ApiError(400, `El componente ${id} no pertenece a esta jornada.`);
      const { restante } = await stockDe(c, id);
      if (n !== restante) await movimiento(c, id, 'cierre', n - restante, id_usuario, null, 'conteo de cierre');
      tocados.push(id);
      contado = true;
    }
  }
  await c.query(
    `UPDATE jornada SET estado = 'cerrada', cerrada_en = CURRENT_TIMESTAMP, cerrada_por = $2,
                        cierre_automatico = $3, sobrante_contado = $4 WHERE id_jornada = $1`,
    [j.id_jornada, id_usuario, automatico, contado]);
  await sincronizarDisponibilidad(c, tocados, id_usuario);
}

async function cerrarVencidas() {
  const { rows } = await pool.query(
    `SELECT j.id_jornada FROM jornada j JOIN menu m ON m.id_menu = j.id_menu
     WHERE j.estado = 'abierta' AND (m.fecha < $1 OR (m.fecha = $1 AND $2::text >= $3::text))`,
    [hoyChile(), horaChile(), HORA_CIERRE]);
  for (const { id_jornada } of rows) {
    await transaccion(async (c) => {
      const j = (await c.query('SELECT * FROM jornada WHERE id_jornada = $1 FOR UPDATE', [id_jornada])).rows[0];
      if (j.estado === 'abierta') await cerrarEn(c, j, { automatico: true });
    });
  }
  if (rows.length) eventos.emitir();
  return rows.length;
}

async function estadoHoy({ id_sede }) {
  await cerrarVencidas();
  const fecha = hoyChile();
  const menu = (await pool.query('SELECT id_menu, fecha, publicado FROM menu WHERE fecha = $1 AND id_sede = $2', [fecha, id_sede])).rows[0] || null;
  const base = { fecha, menu, jornada: null, componentes: [], ventas_por_categoria: [], ventas_recientes: [], hora_cierre_automatico: HORA_CIERRE };
  if (!menu) return base;

  const jornada = (await pool.query('SELECT * FROM jornada WHERE id_menu = $1', [menu.id_menu])).rows[0] || null;
  const componentes = await componentesConStock(pool, menu.id_menu);
  if (!jornada) return { ...base, componentes };

  const ventas_por_categoria = (await pool.query(
    `SELECT cat.nombre AS categoria, COUNT(*) FILTER (WHERE NOT vc.anulada)::int AS ventas
     FROM venta_combo vc JOIN categoria_menu cat ON cat.id_categoria_menu = vc.id_categoria_menu
     WHERE vc.id_jornada = $1 GROUP BY cat.nombre, cat.id_categoria_menu ORDER BY cat.id_categoria_menu`, [jornada.id_jornada])).rows;
  const ventas_recientes = (await pool.query(
    `SELECT vc.id_venta_combo, cat.nombre AS categoria, vc.registrada_en, vc.anulada, u.nombre AS registrada_por
     FROM venta_combo vc JOIN categoria_menu cat ON cat.id_categoria_menu = vc.id_categoria_menu
     LEFT JOIN usuario u ON u.id_usuario = vc.id_usuario
     WHERE vc.id_jornada = $1 ORDER BY vc.registrada_en DESC, vc.id_venta_combo DESC LIMIT 12`, [jornada.id_jornada])).rows;
  return { ...base, jornada, componentes, ventas_por_categoria, ventas_recientes };
}

async function iniciar({ id_usuario, id_sede, cantidades = {} }) {
  const resultado = await transaccion(async (c) => {
    const menu = (await c.query('SELECT id_menu, publicado FROM menu WHERE fecha = $1 AND id_sede = $2', [hoyChile(), id_sede])).rows[0];
    if (!menu) throw new ApiError(409, 'No hay un menú planificado para hoy.');
    if (!menu.publicado) throw new ApiError(409, 'Publica el menú de hoy antes de iniciar la jornada.');
    const comps = (await c.query('SELECT id_menu_preparacion, cantidad_planificada FROM menu_preparacion WHERE id_menu = $1', [menu.id_menu])).rows;
    if (!comps.length) throw new ApiError(409, 'El menú de hoy no tiene componentes.');

    let jornada;
    try {
      jornada = (await c.query('INSERT INTO jornada (id_menu, iniciada_por) VALUES ($1, $2) RETURNING *', [menu.id_menu, id_usuario])).rows[0];
    } catch (err) {
      if (err.code === '23505') throw new ApiError(409, 'Ya existe una jornada para hoy.');
      throw err;
    }
    for (const comp of comps) {
      const dado = cantidades[comp.id_menu_preparacion];
      const inicial = dado === undefined || dado === '' || dado === null ? comp.cantidad_planificada : Number(dado);
      if (!Number.isInteger(inicial) || inicial < 0) throw new ApiError(400, 'Las cantidades iniciales deben ser enteros mayores o iguales a 0.');
      if (inicial > 0) await movimiento(c, comp.id_menu_preparacion, 'inicio', inicial, id_usuario, null, 'inicio de jornada');
    }
    await sincronizarDisponibilidad(c, comps.map((x) => x.id_menu_preparacion), id_usuario);
    return jornada;
  });
  eventos.emitir();
  return resultado;
}

async function cerrar({ id_usuario, id_sede, sobrantes }) {
  const resultado = await transaccion(async (c) => {
    const j = await jornadaDeHoy(c, id_sede, true);
    if (!j) throw new ApiError(409, 'No hay una jornada para cerrar.');
    if (j.estado !== 'abierta') throw new ApiError(409, 'La jornada ya está cerrada.');
    await cerrarEn(c, j, { id_usuario, sobrantes });
    return { id_jornada: j.id_jornada };
  });
  eventos.emitir();
  return resultado;
}

async function registrarVenta({ categoria, id_usuario, id_sede }) {
  const resultado = await transaccion(async (c) => {
    const j = await jornadaDeHoy(c, id_sede, true);
    if (!j || j.estado !== 'abierta') throw new ApiError(409, 'No hay una jornada abierta. Inicia la jornada primero.');
    const cat = (await c.query('SELECT id_categoria_menu FROM categoria_menu WHERE nombre = $1', [categoria])).rows[0];
    if (!cat) throw new ApiError(400, `Categoría "${categoria}" no existe.`);
    const comps = (await c.query(
      `SELECT id_menu_preparacion, id_categoria_menu FROM menu_preparacion
       WHERE id_menu = $1 AND (id_categoria_menu = $2 OR id_categoria_menu IS NULL) ORDER BY id_menu_preparacion`,
      [j.id_menu, cat.id_categoria_menu])).rows;
    if (!comps.some((x) => x.id_categoria_menu !== null)) throw new ApiError(409, `La categoría ${categoria} no tiene plato principal hoy.`);

    const vc = (await c.query(
      'INSERT INTO venta_combo (id_jornada, id_categoria_menu, id_usuario) VALUES ($1, $2, $3) RETURNING id_venta_combo, registrada_en',
      [j.id_jornada, cat.id_categoria_menu, id_usuario])).rows[0];
    for (const comp of comps) await movimiento(c, comp.id_menu_preparacion, 'venta', -1, id_usuario, vc.id_venta_combo);
    await sincronizarDisponibilidad(c, comps.map((x) => x.id_menu_preparacion), id_usuario);
    return { ...vc, categoria };
  });
  eventos.emitir();
  return resultado;
}

async function anularVenta({ id_venta_combo, id_usuario, id_sede }) {
  const resultado = await transaccion(async (c) => {
    const v = (await c.query(
      `SELECT vc.id_venta_combo, vc.anulada, j.estado AS jornada_estado
       FROM venta_combo vc JOIN jornada j ON j.id_jornada = vc.id_jornada JOIN menu m ON m.id_menu = j.id_menu
       WHERE vc.id_venta_combo = $1 AND m.id_sede = $2 FOR UPDATE OF vc, j`, [id_venta_combo, id_sede])).rows[0];
    if (!v) throw new ApiError(404, 'Venta no encontrada.');
    if (v.anulada) throw new ApiError(409, 'Esta venta ya fue anulada.');
    if (v.jornada_estado !== 'abierta') throw new ApiError(409, 'La jornada ya está cerrada: no se pueden anular ventas.');

    await c.query('UPDATE venta_combo SET anulada = TRUE, anulada_en = CURRENT_TIMESTAMP, anulada_por = $2 WHERE id_venta_combo = $1', [id_venta_combo, id_usuario]);
    const movs = (await c.query("SELECT id_menu_preparacion, delta FROM movimiento_stock WHERE id_venta_combo = $1 AND tipo = 'venta'", [id_venta_combo])).rows;
    for (const m of movs) await movimiento(c, m.id_menu_preparacion, 'anulacion', -m.delta, id_usuario, id_venta_combo, 'venta anulada');
    await sincronizarDisponibilidad(c, movs.map((m) => m.id_menu_preparacion), id_usuario);
    return { id_venta_combo };
  });
  eventos.emitir();
  return resultado;
}

async function ajustarStock({ id_menu_preparacion, accion, cantidad, observacion, id_usuario, id_sede }) {
  const resultado = await transaccion(async (c) => {
    const mp = (await c.query(
      `SELECT mp.id_menu_preparacion, mp.id_menu FROM menu_preparacion mp JOIN menu m ON m.id_menu = mp.id_menu
       WHERE mp.id_menu_preparacion = $1 AND m.id_sede = $2`, [id_menu_preparacion, id_sede])).rows[0];
    if (!mp) throw new ApiError(404, 'Componente no encontrado.');
    const j = (await c.query('SELECT * FROM jornada WHERE id_menu = $1 FOR UPDATE', [mp.id_menu])).rows[0];
    if (!j || j.estado !== 'abierta') throw new ApiError(409, 'La jornada no está abierta.');

    const n = Number(cantidad);
    const { restante } = await stockDe(c, id_menu_preparacion);
    let delta, tipo;
    if (accion === 'quedan') {
      if (!Number.isInteger(n) || n < 0) throw new ApiError(400, 'Indica cuántas porciones quedan (entero, 0 o más).');
      delta = n - restante; tipo = 'ajuste';
    } else if (accion === 'reposicion') {
      if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, 'La reposición debe ser un entero mayor a 0.');
      delta = n; tipo = 'reposicion';
    } else if (accion === 'ajuste') {
      if (!Number.isInteger(n) || n === 0) throw new ApiError(400, 'El ajuste debe ser un entero distinto de 0.');
      delta = n; tipo = 'ajuste';
    } else {
      throw new ApiError(400, 'accion debe ser "quedan", "reposicion" o "ajuste".');
    }
    if (delta === 0) return { id_menu_preparacion, restante, sin_cambios: true };
    await movimiento(c, id_menu_preparacion, tipo, delta, id_usuario, null, observacion ? String(observacion).slice(0, 200) : null);
    await sincronizarDisponibilidad(c, [id_menu_preparacion], id_usuario);
    return { id_menu_preparacion, restante: restante + delta };
  });
  eventos.emitir();
  return resultado;
}

module.exports = { estadoHoy, iniciar, cerrar, registrarVenta, anularVenta, ajustarStock, cerrarVencidas, HORA_CIERRE };
