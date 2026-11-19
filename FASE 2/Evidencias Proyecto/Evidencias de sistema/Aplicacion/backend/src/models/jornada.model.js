const pool = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { estadoPorStock } = require('../utils/stock');
const { hoyChile, horaChile } = require('../utils/fecha');
const eventos = require('../utils/eventos');
const menuModel = require('./menu.model');
const HORA_CIERRE = process.env.HORA_CIERRE_AUTOMATICO || '15:00';

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
            CASE WHEN COALESCE(MAX(mp.precio), 0) > 0 THEN MAX(mp.precio) WHEN COALESCE(MAX(p.precio), 0) > 0 THEN MAX(p.precio) END AS precio,
            COALESCE(SUM(ms.delta), 0)::int AS restante,
            COALESCE(SUM(ms.delta) FILTER (WHERE ms.tipo IN ('inicio','reposicion')), 0)::int AS total_disponible,
            COALESCE(-SUM(ms.delta) FILTER (WHERE ms.tipo IN ('venta','anulacion')), 0)::int AS vendidas,
            COALESCE(SUM(ms.delta) FILTER (WHERE ms.tipo = 'cierre'), 0)::int AS ajuste_cierre,
            COALESCE(SUM(ms.delta) FILTER (WHERE ms.tipo = 'correccion'), 0)::int AS ajuste_correccion,
            COALESCE(BOOL_OR(ms.tipo = 'correccion'), FALSE) AS corregido,
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
  const composicion = await menuModel.composicionPorCategoria();
  if (!jornada) return { ...base, componentes, composicion };

  const ventas_por_categoria = (await pool.query(
    `SELECT cat.nombre AS categoria, COUNT(*) FILTER (WHERE NOT vc.anulada)::int AS ventas
     FROM venta_combo vc JOIN categoria_menu cat ON cat.id_categoria_menu = vc.id_categoria_menu
     WHERE vc.id_jornada = $1 GROUP BY cat.nombre, cat.id_categoria_menu ORDER BY cat.id_categoria_menu`, [jornada.id_jornada])).rows;
  const ventas_recientes = (await pool.query(
    `SELECT vc.id_venta_combo, cat.nombre AS categoria, vc.tipo_venta, vc.registrada_en, vc.anulada, u.nombre AS registrada_por
     FROM venta_combo vc JOIN categoria_menu cat ON cat.id_categoria_menu = vc.id_categoria_menu
     LEFT JOIN usuario u ON u.id_usuario = vc.id_usuario
     WHERE vc.id_jornada = $1 ORDER BY vc.registrada_en DESC, vc.id_venta_combo DESC LIMIT 12`, [jornada.id_jornada])).rows;
  return { ...base, jornada, componentes, ventas_por_categoria, ventas_recientes, composicion };
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

async function reabrir({ id_usuario, id_sede }) {
  const resultado = await transaccion(async (c) => {
    const j = await jornadaDeHoy(c, id_sede, true);
    if (!j) throw new ApiError(409, 'No hay una jornada para reabrir.');
    if (j.estado !== 'cerrada') throw new ApiError(409, 'La jornada ya está abierta.');
    if (j.cierre_automatico) {
      throw new ApiError(409, 'La jornada se cerró automáticamente al terminar el día y no se puede reabrir.');
    }

    const movsCierre = (await c.query(
      `SELECT id_menu_preparacion, delta FROM movimiento_stock
       WHERE tipo IN ('cierre', 'correccion')
         AND id_menu_preparacion IN (SELECT id_menu_preparacion FROM menu_preparacion WHERE id_menu = $1)`,
      [j.id_menu]
    )).rows;

    for (const m of movsCierre) {
      await movimiento(c, m.id_menu_preparacion, 'ajuste', -m.delta, id_usuario, null, 'reapertura de jornada');
    }

    await c.query(
      `UPDATE jornada
       SET estado = 'abierta', cerrada_en = NULL, cerrada_por = NULL,
           cierre_automatico = FALSE, sobrante_contado = FALSE
       WHERE id_jornada = $1`,
      [j.id_jornada]
    );

    if (movsCierre.length) {
      await sincronizarDisponibilidad(c, movsCierre.map((m) => m.id_menu_preparacion), id_usuario);
    }
    return { id_jornada: j.id_jornada };
  });
  eventos.emitir();
  return resultado;
}

async function corregirCierre({ sobrantes, id_usuario, id_sede }) {
  const resultado = await transaccion(async (c) => {
    const j = await jornadaDeHoy(c, id_sede, true);
    if (!j) throw new ApiError(409, 'No hay una jornada para corregir.');
    if (j.estado !== 'cerrada') throw new ApiError(409, 'La jornada sigue abierta: corrige el stock desde el panel o ciérrala primero.');
    if (!sobrantes || typeof sobrantes !== 'object' || !Object.keys(sobrantes).length) {
      throw new ApiError(400, 'Indica al menos un conteo para corregir.');
    }
    let corregidos = 0;
    for (const [id, valor] of Object.entries(sobrantes)) {
      if (valor === '' || valor === null || valor === undefined) continue;
      const n = Number(valor);
      if (!Number.isInteger(n) || n < 0) throw new ApiError(400, 'Los conteos deben ser enteros mayores o iguales a 0.');
      const mp = (await c.query('SELECT 1 FROM menu_preparacion WHERE id_menu_preparacion = $1 AND id_menu = $2', [id, j.id_menu])).rows[0];
      if (!mp) throw new ApiError(400, `El componente ${id} no pertenece a esta jornada.`);
      const { restante } = await stockDe(c, id);
      if (n === restante) continue;
      await movimiento(c, id, 'correccion', n - restante, id_usuario, null, 'correccion tras el cierre');
      corregidos += 1;
    }
    if (corregidos) await c.query('UPDATE jornada SET sobrante_contado = TRUE WHERE id_jornada = $1', [j.id_jornada]);
    return { id_jornada: j.id_jornada, corregidos };
  });
  if (resultado.corregidos) eventos.emitir();
  return resultado;
}

const TIPOS_VENTA = ['combo', 'solo_plato', 'completo_maquina'];

async function registrarVenta({ categoria, opcion = null, tipo_venta = 'combo', id_usuario, id_sede }) {
  if (!TIPOS_VENTA.includes(tipo_venta)) throw new ApiError(400, `tipo_venta debe ser: ${TIPOS_VENTA.join(', ')}.`);
  if (tipo_venta !== 'combo' && categoria === 'JUNAEB') throw new ApiError(400, 'JUNAEB solo puede comprar su menú completo.');

  const resultado = await transaccion(async (c) => {
    const j = await jornadaDeHoy(c, id_sede, true);
    if (!j || j.estado !== 'abierta') throw new ApiError(409, 'No hay una jornada abierta. Inicia la jornada primero.');
    const cat = (await c.query('SELECT id_categoria_menu FROM categoria_menu WHERE nombre = $1', [categoria])).rows[0];
    if (!cat) throw new ApiError(400, `Categoría "${categoria}" no existe.`);

    const composicion = (await c.query(
      `SELECT t.nombre AS tipo, cc.grupo_opcion
       FROM composicion_combo cc
       JOIN tipo_componente t ON t.id_tipo_componente = cc.id_tipo_componente
       WHERE cc.id_categoria_menu = $1`,
      [cat.id_categoria_menu]
    )).rows;

    let incluidos;
    if (tipo_venta === 'solo_plato') incluidos = new Set(['Plato Principal']);
    else if (tipo_venta === 'completo_maquina') incluidos = new Set(['Plato Principal', ...composicion.map((r) => r.tipo).filter((t) => t !== 'Bebida')]);
    else incluidos = new Set(['Plato Principal', ...composicion.map((r) => r.tipo)]);

    const todosComps = (await c.query(
      `SELECT mp.id_menu_preparacion, mp.id_categoria_menu, t.nombre AS tipo
       FROM menu_preparacion mp
       JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
       WHERE mp.id_menu = $1 AND (mp.id_categoria_menu = $2 OR mp.id_categoria_menu IS NULL)
       ORDER BY mp.id_menu_preparacion`,
      [j.id_menu, cat.id_categoria_menu]
    )).rows;

    const compPorTipo = new Map();
    for (const comp of todosComps) {
      if (!incluidos.has(comp.tipo)) continue;
      const existente = compPorTipo.get(comp.tipo);
      if (!existente || (comp.id_categoria_menu !== null && existente.id_categoria_menu === null)) {
        compPorTipo.set(comp.tipo, comp);
      }
    }

    if (!compPorTipo.has('Plato Principal')) {
      throw new ApiError(409, `La categoría ${categoria} no tiene plato principal hoy.`);
    }

    const grupos = {};
    if (tipo_venta !== 'solo_plato') {
      for (const r of composicion) {
        if (r.grupo_opcion !== null && incluidos.has(r.tipo)) (grupos[r.grupo_opcion] = grupos[r.grupo_opcion] || []).push(r.tipo);
      }
    }

    let tipoOpcion = null;
    for (const tiposDelGrupo of Object.values(grupos)) {
      const disponibles = tiposDelGrupo.filter((tipo) => compPorTipo.has(tipo));
      if (disponibles.length === 0) continue;
      if (disponibles.length === 1) {
        tipoOpcion = disponibles[0];
      } else {
        if (!opcion) throw new ApiError(400, `Elige la opción para esta categoría: ${disponibles.join(' o ')}.`);
        if (!disponibles.includes(opcion)) throw new ApiError(400, `Opción inválida. Debe ser: ${disponibles.join(' o ')}.`);
        tipoOpcion = opcion;
      }
    }

    const tiposEnGrupos = new Set(Object.values(grupos).flat());
    const aDescontar = [];
    for (const [tipo, comp] of compPorTipo) {
      if (!tiposEnGrupos.has(tipo)) aDescontar.push(comp);
      else if (tipoOpcion && tipo === tipoOpcion) aDescontar.push(comp);
    }

    const idTipoOpcion = tipoOpcion
      ? (await c.query('SELECT id_tipo_componente FROM tipo_componente WHERE nombre = $1', [tipoOpcion])).rows[0].id_tipo_componente
      : null;

    const vc = (await c.query(
      `INSERT INTO venta_combo (id_jornada, id_categoria_menu, id_usuario, id_tipo_opcion, tipo_venta)
       VALUES ($1, $2, $3, $4, $5) RETURNING id_venta_combo, registrada_en`,
      [j.id_jornada, cat.id_categoria_menu, id_usuario, idTipoOpcion, tipo_venta]
    )).rows[0];

    for (const comp of aDescontar) {
      await movimiento(c, comp.id_menu_preparacion, 'venta', -1, id_usuario, vc.id_venta_combo);
    }
    await sincronizarDisponibilidad(c, aDescontar.map((x) => x.id_menu_preparacion), id_usuario);
    return { ...vc, categoria, opcion: tipoOpcion, tipo_venta };
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

module.exports = { estadoHoy, iniciar, cerrar, reabrir, corregirCierre, registrarVenta, anularVenta, ajustarStock, cerrarVencidas, HORA_CIERRE };
