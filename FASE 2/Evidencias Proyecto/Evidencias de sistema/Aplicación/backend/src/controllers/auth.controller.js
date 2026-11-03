const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');
const { ApiError } = require('../middleware/errorHandler');
const { randomBytes } = require('node:crypto');
const pool = require('../config/db');
const entra = require('../utils/entra');

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
      ? process.env.JWT_EXPIRES_IN_KIOSCO || '7d'
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
    if (process.env.SSO_SIMULADO !== 'true') throw new ApiError(404, 'El inicio de sesión con cuenta DUOC no está disponible.');
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@duocuc\.cl$/.test(email)) throw new ApiError(400, 'Usa tu correo institucional (@duocuc.cl).');

    let usuario = await usuarioModel.buscarPorEmail(email);
    if (usuario && usuario.rol !== 'Estudiante') throw new ApiError(403, 'Esa cuenta es del personal: ingresa por el acceso del personal.');
    if (usuario && !usuario.activo) throw new ApiError(401, 'La cuenta está desactivada.');
    if (!usuario) {
      const sede = (await pool.query('SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1')).rows[0];
      await usuarioModel.crear({
        nombre: nombreDeCorreo(email), email,
        passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
        rol: 'Estudiante', id_sede: sede.id_sede,
      });
      usuario = await usuarioModel.buscarPorEmail(email);
    }

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol, id_sede: usuario.id_sede },
      process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
  } catch (err) {
    next(err);
  }
}

const correoValido = (valor) => typeof valor === 'string' ? valor.trim().toLowerCase() : '';

async function identificar(req, res, next) {
  try {
    const email = correoValido(req.body?.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Escribe un correo válido.');

    const usuario = await usuarioModel.buscarPorEmail(email);
    if (usuario && usuario.rol !== 'Estudiante') {
      return res.json({ metodo: entra.habilitado() && entra.esDominioPermitido(email) ? 'microsoft' : 'clave' });
    }

    if (!usuario && entra.habilitado() && entra.esDominioPersonal(email) && !entra.esDominioEstudiante(email)) {
      throw new ApiError(403, 'Tu cuenta no tiene acceso al sistema del casino. Si eres parte del personal, pide al administrador que te registre.');
    }
    if (!usuario && !entra.esDominioEstudiante(email) && !/@duocuc\.cl$/.test(email)) {
      throw new ApiError(400, 'Usa tu correo institucional (@duocuc.cl).');
    }
    if (entra.habilitado()) return res.json({ metodo: 'microsoft' });
    if (process.env.SSO_SIMULADO === 'true') {
      if (!/@duocuc\.cl$/.test(email)) throw new ApiError(400, 'Usa tu correo institucional (@duocuc.cl).');
      return res.json({ metodo: 'duoc' });
    }
    throw new ApiError(404, 'El acceso con cuenta DUOC no está disponible.');
  } catch (err) {
    next(err);
  }
}

function configPublica(req, res) {
  res.json({
    sso_habilitado: process.env.SSO_SIMULADO === 'true' || entra.habilitado(),
    microsoft_habilitado: entra.habilitado(),
  });
}

const NOMBRE_COOKIE = 'entra_estado';
const RUTA_COOKIE = '/api/auth/microsoft';

function leerCookie(req, nombre) {
  const par = String(req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : '';
}

function microsoftInicio(req, res) {
  if (!entra.habilitado()) return res.status(404).json({ error: 'El acceso con Microsoft no está disponible.' });
  const hint = correoValido(req.query.login_hint);
  const { url, cookie } = entra.iniciar(/^[^\s@]+@[^\s@]+$/.test(hint) ? hint : '');
  res.cookie(NOMBRE_COOKIE, cookie, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, path: RUTA_COOKIE,
  });
  res.redirect(url);
}

async function cuentaDesdeCorreo(email) {
  let usuario = await usuarioModel.buscarPorEmail(email);
  if (!usuario) {
    if (!entra.esDominioEstudiante(email)) throw new ApiError(403, entra.esDominioPersonal(email) ? 'sin_acceso' : 'cuenta_no_permitida');
    const sede = (await pool.query('SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1')).rows[0];
    await usuarioModel.crear({
      nombre: nombreDeCorreo(email), email,
      passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
      rol: 'Estudiante', id_sede: sede.id_sede,
    });
    usuario = await usuarioModel.buscarPorEmail(email);
  }
  if (!usuario.activo) throw new ApiError(403, 'cuenta_desactivada');
  return usuario;
}

async function microsoftCallback(req, res) {
  const { frontend } = entra.config();
  const volver = (codigo) => res.redirect(`${frontend}/#/acceso?error=${codigo}`);
  res.clearCookie(NOMBRE_COOKIE, { path: RUTA_COOKIE });
  if (!entra.habilitado()) return volver('no_disponible');
  if (req.query.error) return volver(req.query.error === 'access_denied' ? 'cancelado' : 'fallo');
  if (typeof req.query.code !== 'string' || !req.query.code) return volver('fallo');

  try {
    const { email } = await entra.completar({ code: req.query.code, state: req.query.state, cookie: leerCookie(req, NOMBRE_COOKIE) });
    const usuario = await cuentaDesdeCorreo(email);
    const sesionLarga = usuario.rol === 'Cajero';
    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol, id_sede: usuario.id_sede },
      process.env.JWT_SECRET, { expiresIn: sesionLarga ? (process.env.JWT_EXPIRES_IN_KIOSCO || '7d') : (process.env.JWT_EXPIRES_IN || '8h') });
    const ticket = entra.crearTicket({
      token, kiosco: sesionLarga,
      usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
    res.redirect(`${frontend}/#/acceso?ticket=${ticket}`);
  } catch (err) {
    if (err instanceof ApiError) return volver(err.message);
    console.error('Error en el acceso con Microsoft:', err.message);
    volver('fallo');
  }
}

function microsoftCanje(req, res, next) {
  try {
    const sesion = typeof req.body?.ticket === 'string' ? entra.canjearTicket(req.body.ticket) : null;
    if (!sesion) throw new ApiError(401, 'El acceso expiró. Vuelve a intentarlo.');
    res.json(sesion);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, yo, loginDuoc, configPublica, identificar, microsoftInicio, microsoftCallback, microsoftCanje };
