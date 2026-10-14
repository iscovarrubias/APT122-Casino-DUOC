const pool = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { hoyChile } = require('../utils/fecha');

async function perfil(id_usuario) {
  const alergias = (await pool.query(
    `SELECT a.nombre FROM preferencia_alergeno pa JOIN alergeno a ON a.id_alergeno = pa.id_alergeno
     WHERE pa.id_usuario = $1 ORDER BY a.nombre`, [id_usuario])).rows.map((r) => r.nombre);
  const favoritos = (await pool.query(
    `SELECT f.id_preparacion, p.nombre FROM favorito f JOIN preparacion p ON p.id_preparacion = f.id_preparacion
     WHERE f.id_usuario = $1 ORDER BY f.creado_en DESC`, [id_usuario])).rows;
  const calificaciones = (await pool.query(
    `SELECT c.id_preparacion, p.nombre, c.estrellas, c.comentario FROM calificacion c
     JOIN preparacion p ON p.id_preparacion = c.id_preparacion
     WHERE c.id_usuario = $1 ORDER BY c.actualizado_en DESC`, [id_usuario])).rows;
  const cat = (await pool.query(
    `SELECT cm.nombre FROM usuario u
     LEFT JOIN categoria_menu cm ON cm.id_categoria_menu = u.id_categoria_preferida
     WHERE u.id_usuario = $1`, [id_usuario])).rows[0];
  return { alergias, favoritos, calificaciones, categoria_preferida: cat?.nombre || null };
}

async function fijarAlergias(id_usuario, nombres) {
  const unicos = [...new Set(nombres)];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM preferencia_alergeno WHERE id_usuario = $1', [id_usuario]);
    if (unicos.length) {
      const r = await client.query(
        `INSERT INTO preferencia_alergeno (id_usuario, id_alergeno)
         SELECT $1, id_alergeno FROM alergeno WHERE nombre = ANY($2::text[])`, [id_usuario, unicos]);
      if (r.rowCount !== unicos.length) throw new ApiError(400, 'Algún alérgeno no está en el catálogo.');
    }
    await client.query('COMMIT');
    return unicos;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function asegurarPreparacion(id) {
  const { rows } = await pool.query('SELECT 1 FROM preparacion WHERE id_preparacion = $1', [id]);
  if (!rows[0]) throw new ApiError(404, 'Preparación no encontrada.');
}

async function marcarFavorito(id_usuario, id_preparacion) {
  await asegurarPreparacion(id_preparacion);
  await pool.query('INSERT INTO favorito (id_usuario, id_preparacion) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id_usuario, id_preparacion]);
}

async function quitarFavorito(id_usuario, id_preparacion) {
  await pool.query('DELETE FROM favorito WHERE id_usuario = $1 AND id_preparacion = $2', [id_usuario, id_preparacion]);
}

async function calificar(id_usuario, id_preparacion, estrellas, comentario) {
  await asegurarPreparacion(id_preparacion);
  const { rows } = await pool.query(
    `INSERT INTO calificacion (id_usuario, id_preparacion, estrellas, comentario) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id_usuario, id_preparacion) DO UPDATE
       SET estrellas = EXCLUDED.estrellas, comentario = EXCLUDED.comentario, actualizado_en = CURRENT_TIMESTAMP
     RETURNING id_preparacion, estrellas, comentario`,
    [id_usuario, id_preparacion, estrellas, comentario || null]);
  return rows[0];
}

async function quitarCalificacion(id_usuario, id_preparacion) {
  await pool.query('DELETE FROM calificacion WHERE id_usuario = $1 AND id_preparacion = $2', [id_usuario, id_preparacion]);
}

async function alertas(id_usuario, id_sede) {
  const { rows } = await pool.query(
    `SELECT p.id_preparacion, p.nombre, t.nombre AS componente, c.nombre AS categoria,
            COALESCE(d.estado, 'disponible') AS disponibilidad,
            CASE WHEN j.estado = 'abierta' THEN GREATEST(s.restante, 0) END AS cantidad_restante
     FROM favorito f
     JOIN preparacion p ON p.id_preparacion = f.id_preparacion
     JOIN menu_preparacion mp ON mp.id_preparacion = p.id_preparacion
     JOIN menu m ON m.id_menu = mp.id_menu AND m.fecha = $2 AND m.publicado = TRUE AND m.id_sede = $3
     JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
     LEFT JOIN categoria_menu c ON c.id_categoria_menu = mp.id_categoria_menu
     LEFT JOIN jornada j ON j.id_menu = m.id_menu
     LEFT JOIN LATERAL (SELECT COALESCE(SUM(delta), 0)::int AS restante FROM movimiento_stock
                        WHERE id_menu_preparacion = mp.id_menu_preparacion) s ON TRUE
     LEFT JOIN LATERAL (SELECT estado FROM disponibilidad WHERE id_menu_preparacion = mp.id_menu_preparacion
                        ORDER BY registrado_en DESC, id_disponibilidad DESC LIMIT 1) d ON TRUE
     WHERE f.id_usuario = $1
     ORDER BY t.id_tipo_componente, p.nombre`,
    [id_usuario, hoyChile(), id_sede]);
  return rows;
}

async function resumenOpiniones() {
  const promedios = (await pool.query(
    `SELECT p.id_preparacion, p.nombre, COUNT(*)::int AS total, ROUND(AVG(c.estrellas), 1)::float8 AS promedio
     FROM calificacion c JOIN preparacion p ON p.id_preparacion = c.id_preparacion
     GROUP BY p.id_preparacion, p.nombre ORDER BY promedio DESC, total DESC, p.nombre`)).rows;
  const favoritos = (await pool.query(
    `SELECT p.id_preparacion, p.nombre, COUNT(*)::int AS total
     FROM favorito f JOIN preparacion p ON p.id_preparacion = f.id_preparacion
     GROUP BY p.id_preparacion, p.nombre ORDER BY total DESC, p.nombre LIMIT 10`)).rows;
  const comentarios = (await pool.query(
    `SELECT p.nombre, c.estrellas, c.comentario, c.actualizado_en
     FROM calificacion c JOIN preparacion p ON p.id_preparacion = c.id_preparacion
     WHERE c.comentario IS NOT NULL AND c.comentario <> '' ORDER BY c.actualizado_en DESC LIMIT 20`)).rows;
  return { promedios, favoritos, comentarios };
}

async function fijarCategoriaPreferida(id_usuario, nombre) {
  if (nombre == null || nombre === '') {
    await pool.query('UPDATE usuario SET id_categoria_preferida = NULL WHERE id_usuario = $1', [id_usuario]);
    return null;
  }
  const cat = (await pool.query('SELECT id_categoria_menu, nombre FROM categoria_menu WHERE nombre = $1', [nombre])).rows[0];
  if (!cat) throw new ApiError(400, `Categoría "${nombre}" no existe.`);
  await pool.query('UPDATE usuario SET id_categoria_preferida = $2 WHERE id_usuario = $1', [id_usuario, cat.id_categoria_menu]);
  return cat.nombre;
}

async function opinionesDePreparacion(id_preparacion) {
  const { rows } = await pool.query(
    `SELECT c.id_calificacion, c.estrellas, c.comentario, c.actualizado_en,
            u.nombre AS autor
     FROM calificacion c
     JOIN usuario u ON u.id_usuario = c.id_usuario
     WHERE c.id_preparacion = $1 AND (c.comentario IS NOT NULL AND c.comentario <> '')
     ORDER BY c.actualizado_en DESC`,
    [id_preparacion]
  );
  return rows;
}

module.exports = { perfil, fijarAlergias, fijarCategoriaPreferida, marcarFavorito, quitarFavorito, calificar, quitarCalificacion, alertas, resumenOpiniones, opinionesDePreparacion };