const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se proporcionó un token de acceso.' });
  }

  let payload;
  try {
    payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.activo, u.id_sede, r.nombre AS rol
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [payload.id_usuario]
    );
    if (!rows[0] || !rows[0].activo) {
      return res.status(401).json({ error: 'La cuenta está desactivada o ya no existe.' });
    }
    req.user = { ...payload, rol: rows[0].rol, id_sede: rows[0].id_sede };
  } catch (err) {
    return next(err);
  }

  next();
}

module.exports = { autenticar };
