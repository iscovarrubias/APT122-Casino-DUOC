const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');
const { ApiError } = require('../middleware/errorHandler');

const ROLES_PANEL = ['Personal Casino', 'Administrador'];
const HASH_RELLENO = bcrypt.hashSync('relleno-para-igualar-tiempos', 10);

async function login(req, res, next) {
  try {
    const { email, password, kiosco } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new ApiError(400, 'Correo y contraseña son obligatorios.');
    }

    const usuario = await usuarioModel.buscarPorEmail(email.trim());
    const passwordValido = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_RELLENO);

    if (!usuario || !passwordValido || !usuario.activo) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const sesionLarga = kiosco === true && ROLES_PANEL.includes(usuario.rol);
    const expiresIn = sesionLarga
      ? process.env.JWT_EXPIRES_IN_KIOSCO || '30d'
      : process.env.JWT_EXPIRES_IN || '8h';

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol, id_sede: usuario.id_sede },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.json({
      token,
      kiosco: sesionLarga,
      usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
  } catch (err) {
    next(err);
  }
}

async function yo(req, res, next) {
  try {
    const usuario = await usuarioModel.buscarPorId(req.user.id_usuario);
    if (!usuario) throw new ApiError(401, 'La cuenta ya no existe.');
    res.json({ usuario });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, yo };
