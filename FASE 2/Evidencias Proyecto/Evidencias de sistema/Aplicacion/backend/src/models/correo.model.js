const pool = require('../config/db');

const SEDE_PUBLICA = 1;

async function preferencias(id_usuario) {
  const { rows } = await pool.query('SELECT menu_semanal, avisos_favoritos FROM preferencia_correo WHERE id_usuario = $1', [id_usuario]);
  return rows[0] || { menu_semanal: false, avisos_favoritos: false };
}

async function guardarPreferencias(id_usuario, { menu_semanal, avisos_favoritos }) {
  const { rows } = await pool.query(
    `INSERT INTO preferencia_correo (id_usuario, menu_semanal, avisos_favoritos)
     VALUES ($1, $2, $3)
     ON CONFLICT (id_usuario) DO UPDATE
       SET menu_semanal = EXCLUDED.menu_semanal, avisos_favoritos = EXCLUDED.avisos_favoritos, actualizado_en = CURRENT_TIMESTAMP
     RETURNING menu_semanal, avisos_favoritos`,
    [id_usuario, menu_semanal, avisos_favoritos]
  );
  return rows[0];
}

async function darDeBaja(token) {
  const { rowCount } = await pool.query(
    `UPDATE preferencia_correo SET menu_semanal = FALSE, avisos_favoritos = FALSE, actualizado_en = CURRENT_TIMESTAMP
     WHERE token_baja = $1`,
    [token]
  );
  return rowCount > 0;
}

async function destinatarios() {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.email, pc.menu_semanal, pc.avisos_favoritos, pc.token_baja::text AS token_baja,
            COALESCE(array_agg(f.id_preparacion) FILTER (WHERE f.id_preparacion IS NOT NULL), '{}') AS favoritos
     FROM preferencia_correo pc
     JOIN usuario u ON u.id_usuario = pc.id_usuario AND u.activo = TRUE
     JOIN rol r ON r.id_rol = u.id_rol AND r.nombre = 'Estudiante'
     LEFT JOIN favorito f ON f.id_usuario = u.id_usuario
     WHERE pc.menu_semanal OR pc.avisos_favoritos
     GROUP BY u.id_usuario, u.nombre, u.email, pc.menu_semanal, pc.avisos_favoritos, pc.token_baja
     ORDER BY u.id_usuario`
  );
  return rows;
}

async function menuPublicado(desde, hasta) {
  const { rows } = await pool.query(
    `SELECT m.fecha::text AS fecha, cat.nombre AS categoria, t.nombre AS componente, p.id_preparacion, p.nombre
     FROM menu m
     JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
     JOIN preparacion p ON p.id_preparacion = mp.id_preparacion
     JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente
     LEFT JOIN categoria_menu cat ON cat.id_categoria_menu = mp.id_categoria_menu
     WHERE m.id_sede = $3 AND m.publicado = TRUE AND m.fecha BETWEEN $1 AND $2
     ORDER BY m.fecha, t.id_tipo_componente, cat.id_categoria_menu NULLS FIRST, p.nombre`,
    [desde, hasta, SEDE_PUBLICA]
  );
  return rows;
}

async function reservarEnvio(id_usuario, tipo, clave, asunto, modo) {
  const { rows } = await pool.query(
    `INSERT INTO correo_enviado (id_usuario, tipo, clave, asunto, modo) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id_usuario, tipo, clave) DO NOTHING RETURNING id_correo`,
    [id_usuario, tipo, clave, asunto, modo]
  );
  return rows[0]?.id_correo ?? null;
}

async function liberarEnvio(id_correo) {
  await pool.query('DELETE FROM correo_enviado WHERE id_correo = $1', [id_correo]);
}

module.exports = { preferencias, guardarPreferencias, darDeBaja, destinatarios, menuPublicado, reservarEnvio, liberarEnvio };
