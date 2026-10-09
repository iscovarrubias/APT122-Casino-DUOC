const pool = require('../config/db');

function error(status, mensaje) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

async function menuDelDia(fecha, categoria) {
  const params = [fecha];
  let filtroCategoria = '';
  if (categoria) {
    filtroCategoria = 'AND (c.nombre = $2 OR mp.id_categoria_menu IS NULL)';
    params.push(categoria);
  }

  const { rows } = await pool.query(
    `SELECT
        mp.id_menu_preparacion, p.id_preparacion, p.nombre, p.descripcion, p.precio, p.imagen_url,
        c.nombre AS categoria, t.nombre AS componente, mp.cantidad_planificada,
        COALESCE(d.estado, 'disponible') AS disponibilidad,
        d.registrado_en AS disponibilidad_actualizada_en,
        COALESCE(ing.lista, '[]') AS ingredientes,
        COALESCE(al.lista, '[]') AS alergenos,
        CASE WHEN n.validado THEN
          json_build_object('calorias', n.calorias, 'proteinas_g', n.proteinas_g,
                            'carbohidratos_g', n.carbohidratos_g, 'grasas_g', n.grasas_g, 'fuente', n.fuente)
        ELSE NULL END AS informacion_nutricional
     FROM menu m
     JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
     JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
     JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
     LEFT JOIN categoria_menu c ON c.id_categoria_menu = mp.id_categoria_menu
     LEFT JOIN LATERAL (
        SELECT estado, registrado_en FROM disponibilidad
        WHERE id_menu_preparacion = mp.id_menu_preparacion
        ORDER BY registrado_en DESC, id_disponibilidad DESC LIMIT 1
     ) d ON TRUE
     LEFT JOIN LATERAL (
        SELECT json_agg(i.nombre) AS lista
        FROM preparacion_ingrediente pi JOIN ingrediente i ON i.id_ingrediente = pi.id_ingrediente
        WHERE pi.id_preparacion = p.id_preparacion
     ) ing ON TRUE
     LEFT JOIN LATERAL (
        SELECT json_agg(a.nombre) AS lista
        FROM preparacion_alergeno pa JOIN alergeno a ON a.id_alergeno = pa.id_alergeno
        WHERE pa.id_preparacion = p.id_preparacion
     ) al ON TRUE
     LEFT JOIN informacion_nutricional n ON n.id_preparacion = p.id_preparacion
     WHERE m.fecha = $1 AND m.publicado = TRUE
     ${filtroCategoria}
     ORDER BY t.id_tipo_componente`,
    params
  );
  return rows;
}

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

async function obtenerMenuPorFecha(fecha, id_sede = 1) {
  const { rows } = await pool.query(
    'SELECT id_menu, fecha, publicado FROM menu WHERE fecha = $1 AND id_sede = $2',
    [fecha, id_sede]
  );
  return rows[0] || null;
}

async function agregarComponente(id_menu, { id_preparacion, tipo_componente, categoria, cantidad_planificada }) {
  const tipoRes = await pool.query('SELECT id_tipo_componente FROM tipo_componente WHERE nombre = $1', [tipo_componente]);
  if (!tipoRes.rows[0]) throw error(400, `Tipo de componente "${tipo_componente}" no existe.`);

  const esPlatoPrincipal = tipo_componente === 'Plato Principal';
  if (esPlatoPrincipal && !categoria) throw error(400, 'El plato principal necesita una categoría de menú.');
  if (!esPlatoPrincipal && categoria) throw error(400, 'La entrada, el postre y la bebida son compartidos: no llevan categoría.');

  const prep = await pool.query('SELECT activa FROM preparacion WHERE id_preparacion = $1', [id_preparacion]);
  if (!prep.rows[0]) throw error(400, 'La preparación indicada no existe.');
  if (!prep.rows[0].activa) throw error(400, 'La preparación está desactivada. Reactívala antes de planificarla.');

  let id_categoria_menu = null;
  if (categoria) {
    const catRes = await pool.query('SELECT id_categoria_menu FROM categoria_menu WHERE nombre = $1', [categoria]);
    if (!catRes.rows[0]) throw error(400, `Categoría "${categoria}" no existe.`);
    id_categoria_menu = catRes.rows[0].id_categoria_menu;
  }

  const { rows } = await pool.query(
    `INSERT INTO menu_preparacion (id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_menu_preparacion, id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada`,
    [id_menu, id_preparacion, id_categoria_menu, tipoRes.rows[0].id_tipo_componente, cantidad_planificada]
  );
  return rows[0];
}

async function actualizarComponente(id_menu_preparacion, { id_preparacion, cantidad_planificada }) {
  if (id_preparacion !== undefined) {
    const prep = await pool.query('SELECT activa FROM preparacion WHERE id_preparacion = $1', [id_preparacion]);
    if (!prep.rows[0]) throw error(400, 'La preparación indicada no existe.');
    if (!prep.rows[0].activa) throw error(400, 'La preparación está desactivada. Reactívala antes de planificarla.');
  }
  const { rows } = await pool.query(
    `UPDATE menu_preparacion SET
       id_preparacion = COALESCE($2, id_preparacion),
       cantidad_planificada = COALESCE($3, cantidad_planificada)
     WHERE id_menu_preparacion = $1
     RETURNING id_menu_preparacion, id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada`,
    [id_menu_preparacion, id_preparacion ?? null, cantidad_planificada ?? null]
  );
  return rows[0] || null;
}

async function eliminarComponente(id_menu_preparacion) {
  try {
    const { rows } = await pool.query(
      'DELETE FROM menu_preparacion WHERE id_menu_preparacion = $1 RETURNING id_menu_preparacion',
      [id_menu_preparacion]
    );
    return rows[0] || null;
  } catch (err) {
    if (err.code === '23503') throw error(409, 'No se puede quitar: el componente ya tiene ventas registradas.');
    throw err;
  }
}

async function cambiarPublicacion(id_menu, publicado) {
  if (publicado) {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM menu_preparacion WHERE id_menu = $1', [id_menu]);
    if (rows[0].n === 0) throw error(400, 'No se puede publicar un menú sin componentes.');
  }
  const { rows } = await pool.query(
    'UPDATE menu SET publicado = $2 WHERE id_menu = $1 RETURNING id_menu, fecha, publicado',
    [id_menu, publicado]
  );
  return rows[0] || null;
}

async function listarPorFecha(fecha, id_sede = 1) {
  const { rows } = await pool.query(
    `SELECT mp.id_menu_preparacion, mp.id_menu, p.id_preparacion, p.nombre AS preparacion,
            c.nombre AS categoria, t.nombre AS componente, mp.cantidad_planificada, m.publicado,
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
        ORDER BY registrado_en DESC, id_disponibilidad DESC LIMIT 1
     ) d ON TRUE
     WHERE m.fecha = $1 AND m.id_sede = $2
     ORDER BY t.id_tipo_componente, c.nombre NULLS FIRST`,
    [fecha, id_sede]
  );
  return rows;
}

const ESTADOS_VALIDOS = ['disponible', 'baja_disponibilidad', 'agotado'];

async function actualizarDisponibilidad(id_menu_preparacion, { estado, observacion, id_usuario }) {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw error(400, `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}.`);
  }
  const existe = await pool.query('SELECT 1 FROM menu_preparacion WHERE id_menu_preparacion = $1', [id_menu_preparacion]);
  if (!existe.rows[0]) throw error(404, 'El componente de menú indicado no existe.');

  const { rows } = await pool.query(
    `INSERT INTO disponibilidad (id_menu_preparacion, estado, observacion, id_usuario)
     VALUES ($1, $2, $3, $4)
     RETURNING id_disponibilidad, id_menu_preparacion, estado, observacion, registrado_en, id_usuario`,
    [id_menu_preparacion, estado, observacion || null, id_usuario || null]
  );
  return rows[0];
}

async function historialDisponibilidad(id_menu_preparacion) {
  const { rows } = await pool.query(
    `SELECT d.id_disponibilidad, d.estado, d.observacion, d.registrado_en, u.nombre AS actualizado_por
     FROM disponibilidad d
     LEFT JOIN usuario u ON u.id_usuario = d.id_usuario
     WHERE d.id_menu_preparacion = $1
     ORDER BY d.registrado_en DESC, d.id_disponibilidad DESC`,
    [id_menu_preparacion]
  );
  return rows;
}

async function historialMenus(desde, hasta, id_sede = 1) {
  const { rows } = await pool.query(
    `SELECT m.id_menu, m.fecha,
            json_agg(
              json_build_object('componente', t.nombre, 'categoria', c.nombre, 'preparacion', p.nombre)
              ORDER BY t.id_tipo_componente, c.nombre NULLS FIRST
            ) AS componentes
     FROM menu m
     JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
     JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
     JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
     LEFT JOIN categoria_menu c ON c.id_categoria_menu = mp.id_categoria_menu
     WHERE m.publicado = TRUE AND m.id_sede = $3 AND m.fecha BETWEEN $1 AND $2
     GROUP BY m.id_menu, m.fecha
     ORDER BY m.fecha DESC`,
    [desde, hasta, id_sede]
  );
  return rows;
}

module.exports = {
  menuDelDia, obtenerOCrearMenu, obtenerMenuPorFecha, agregarComponente, actualizarComponente,
  eliminarComponente, cambiarPublicacion, listarPorFecha,
  actualizarDisponibilidad, historialDisponibilidad, historialMenus,
};
