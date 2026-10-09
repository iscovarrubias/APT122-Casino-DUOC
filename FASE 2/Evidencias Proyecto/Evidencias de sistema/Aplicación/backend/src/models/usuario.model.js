const pool = require('../config/db');

const COLUMNAS_PUBLICAS = `u.id_usuario, u.nombre, u.email, r.nombre AS rol, u.id_sede, u.activo, u.creado_en`;

async function buscarPorEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.email, u.password_hash, u.activo,
            r.nombre AS rol, u.id_sede
     FROM usuario u
     JOIN rol r ON r.id_rol = u.id_rol
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listar() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
     ORDER BY u.activo DESC, r.nombre, u.nombre`
  );
  return rows;
}

async function listarRoles() {
  const { rows } = await pool.query('SELECT nombre FROM rol ORDER BY id_rol');
  return rows.map((r) => r.nombre);
}

async function crear({ nombre, email, passwordHash, rol, id_sede }) {
  const { rows } = await pool.query(
    `INSERT INTO usuario (nombre, email, password_hash, id_rol, id_sede)
     VALUES ($1, $2, $3, (SELECT id_rol FROM rol WHERE nombre = $4), $5)
     RETURNING id_usuario`,
    [nombre, email, passwordHash, rol, id_sede]
  );
  return buscarPorId(rows[0].id_usuario);
}

async function actualizar(id, { nombre, rol, activo }) {
  const { rowCount } = await pool.query(
    `UPDATE usuario SET
       nombre = COALESCE($2, nombre),
       id_rol = COALESCE((SELECT id_rol FROM rol WHERE nombre = $3), id_rol),
       activo = COALESCE($4, activo)
     WHERE id_usuario = $1`,
    [id, nombre ?? null, rol ?? null, activo ?? null]
  );
  return rowCount ? buscarPorId(id) : null;
}

async function cambiarPassword(id, passwordHash) {
  const { rowCount } = await pool.query('UPDATE usuario SET password_hash = $2 WHERE id_usuario = $1', [id, passwordHash]);
  return rowCount > 0;
}

module.exports = { buscarPorEmail, buscarPorId, listar, listarRoles, crear, actualizar, cambiarPassword };
