const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');
const { ApiError } = require('../middleware/errorHandler');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Correo y contraseña son obligatorios.');
    }

    const usuario = await usuarioModel.buscarPorEmail(email);

    const MENSAJE_GENERICO = 'Correo o contraseña incorrectos.';

    if (!usuario) {
      return res.status(401).json({ error: MENSAJE_GENERICO });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ error: MENSAJE_GENERICO });
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol,
        id_sede: usuario.id_sede,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
