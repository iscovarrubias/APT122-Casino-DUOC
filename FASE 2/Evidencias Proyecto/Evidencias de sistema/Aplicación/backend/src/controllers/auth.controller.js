const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');
const { ApiError } = require('../middleware/errorHandler');
const { randomBytes } = require('node:crypto');
const pool = require('../config/db');

const ROLES_PANEL = ['Personal Casino', 'Administrador', 'Cajero', 'Nutricionista'];
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

    const sesionLarga = ROLES_PANEL.includes(usuario.rol) && (kiosco === true || usuario.rol === 'Cajero');
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

const nombreDeCorreo = (email) => email.split('@')[0].split(/[._-]/).filter(Boolean)
  .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

async function loginDuoc(req, res, next) {
  try {
    if (process.env.SSO_SIMULADO !== 'true') throw new ApiError(404, 'El inicio de sesión DUOC simulado no está habilitado.');
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@duocuc\.cl$/.test(email)) throw new ApiError(400, 'Usa tu correo institucional (@duocuc.cl).');

    let usuario = await usuarioModel.buscarPorEmail(email);
    if (usuario && usuario.rol !== 'Estudiante') throw new ApiError(403, 'Esa cuenta es del personal: ingresa por el acceso del personal.');
    if (usuario && !usuario.activo) throw new ApiError(401, 'La cuenta está desactivada.');
    if (!usuario) {
      const sede = (await pool.query('SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1')).rows[0];
      await usuarioModel.crear({
        nombre: nombreDeCorreo(email), email,
        passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10), // sin contraseña utilizable
        rol: 'Estudiante', id_sede: sede.id_sede,
      });
      usuario = await usuarioModel.buscarPorEmail(email);
    }

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol, id_sede: usuario.id_sede },
      process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, simulado: true, usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
  } catch (err) {
    next(err);
  }
}

function configPublica(req, res) {
  res.json({ sso_simulado: process.env.SSO_SIMULADO === 'true' });
}

module.exports = { login, yo, loginDuoc, configPublica };
