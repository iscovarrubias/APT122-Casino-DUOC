const pool = require('../config/db');
async function menuDelDia(fecha, categoria) {
  const params = [fecha];
  let filtroCategoria = '';
  if (categoria) {
    filtroCategoria = 'AND (c.nombre = $2 OR mp.id_categoria_menu IS NULL)';
    params.push(categoria);
  }

  const { rows } = await pool.query(
    `SELECT
        mp.id_menu_preparacion,
        p.id_preparacion,
        p.nombre,
        p.descripcion,
        p.precio,
        c.nombre AS categoria,
        t.nombre AS componente,
        mp.cantidad_planificada,
        COALESCE(d.estado, 'disponible') AS disponibilidad,
        d.registrado_en AS disponibilidad_actualizada_en
     FROM menu m
     JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
     JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
     JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
     LEFT JOIN categoria_menu c ON c.id_categoria_menu = mp.id_categoria_menu
     LEFT JOIN LATERAL (
        SELECT estado, registrado_en FROM disponibilidad
        WHERE id_menu_preparacion = mp.id_menu_preparacion
        ORDER BY registrado_en DESC
        LIMIT 1
     ) d ON TRUE
     WHERE m.fecha = $1 AND m.publicado = TRUE
     ${filtroCategoria}
     ORDER BY t.id_tipo_componente`,
    params
  );
  return rows;
}

module.exports = { menuDelDia, obtenerOCrearMenu, agregarComponente, publicar, listarPorFecha };
async function obtenerOCrearMenu(fecha, id_sede = 1) {
  const existente = await pool.query(
    'SELECT id_menu, fecha, publicado FROM menu WHERE fecha = $1 AND id_sede = $2',
    [fecha, id_sede]
  );
  if (existente.rows[0]) return existente.rows[0];

  const { rows } = await pool.query(
    'INSERT INTO menu (id_sede, fecha, publicado) VALUES ($1, $2, FALSE) RETURNING id_menu, fecha, publicado',
    [id_sede, fecha]
  );
  return rows[0];
}

async function agregarComponente(id_menu, { id_preparacion, tipo_componente, categoria, cantidad_planificada }) {
  const tipoRes = await pool.query('SELECT id_tipo_componente FROM tipo_componente WHERE nombre = $1', [tipo_componente]);
  if (!tipoRes.rows[0]) {
    const err = new Error(`Tipo de componente "${tipo_componente}" no existe.`);
    err.status = 400;
    throw err;
  }
  const id_tipo_componente = tipoRes.rows[0].id_tipo_componente;

  const esPlatoPrincipal = tipo_componente === 'Plato Principal';
  if (esPlatoPrincipal && !categoria) {
    const err = new Error('El plato principal necesita una categoría de menú.');
    err.status = 400;
    throw err;
  }
  if (!esPlatoPrincipal && categoria) {
    const err = new Error('La entrada, el postre y la bebida son compartidos: no llevan categoría.');
    err.status = 400;
    throw err;
  }

  let id_categoria_menu = null;
  if (categoria) {
    const catRes = await pool.query('SELECT id_categoria_menu FROM categoria_menu WHERE nombre = $1', [categoria]);
    if (!catRes.rows[0]) {
      const err = new Error(`Categoría "${categoria}" no existe.`);
      err.status = 400;
      throw err;
    }
    id_categoria_menu = catRes.rows[0].id_categoria_menu;
  }

  const { rows } = await pool.query(
    `INSERT INTO menu_preparacion (id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_menu_preparacion, id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada`,
    [id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada]
  );
  return rows[0];
}

async function publicar(id_menu) {
  const { rows } = await pool.query(
    'UPDATE menu SET publicado = TRUE WHERE id_menu = $1 RETURNING id_menu, fecha, publicado',
    [id_menu]
  );
  return rows[0] || null;
}

async function listarPorFecha(fecha, id_sede = 1) {
  const { rows } = await pool.query(
    `SELECT mp.id_menu_preparacion, p.nombre AS preparacion, c.nombre AS categoria,
            t.nombre AS componente, mp.cantidad_planificada, m.publicado
     FROM menu m
     JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
     JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
     JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
     LEFT JOIN categoria_menu c ON c.id_categoria_menu = mp.id_categoria_menu
     WHERE m.fecha = $1 AND m.id_sede = $2
     ORDER BY t.id_tipo_componente, c.nombre NULLS FIRST`,
    [fecha, id_sede]
  );
  return rows;
}
