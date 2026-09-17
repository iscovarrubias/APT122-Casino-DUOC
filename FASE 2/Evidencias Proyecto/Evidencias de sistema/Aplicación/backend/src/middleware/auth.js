// Verifica que la solicitud traiga un token JWT válido y adjunta el usuario
// autenticado a req.user, para que las rutas y controladores lo usen sin
// tener que volver a consultar la base de datos.
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se proporcionó un token de acceso.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id_usuario, email, rol, id_sede }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { autenticar };
