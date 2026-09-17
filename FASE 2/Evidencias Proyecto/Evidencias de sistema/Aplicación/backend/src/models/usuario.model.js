const pool = require('../config/db');

async function buscarPorEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.email, u.password_hash,
            r.nombre AS rol, u.id_sede
     FROM usuario u
     JOIN rol r ON r.id_rol = u.id_rol
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
}

module.exports = { buscarPorEmail };
