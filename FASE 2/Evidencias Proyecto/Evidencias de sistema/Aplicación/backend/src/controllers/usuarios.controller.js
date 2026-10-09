const bcrypt = require('bcrypt');
const usuarioModel = require('../models/usuario.model');
const { ApiError } = require('../middleware/errorHandler');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LARGO_MINIMO_CLAVE = 8;

function validarPassword(password) {
  if (typeof password !== 'string' || password.length < LARGO_MINIMO_CLAVE) {
    throw new ApiError(400, `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
  }
}

async function validarRol(rol) {
  const roles = await usuarioModel.listarRoles();
  if (!roles.includes(rol)) {
    throw new ApiError(400, `Rol inválido. Debe ser uno de: ${roles.join(', ')}.`);
  }
}

async function listar(req, res, next) {
  try {
    res.json(await usuarioModel.listar());
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, email, password, rol } = req.body;

    if (typeof nombre !== 'string' || !nombre.trim()) throw new ApiError(400, 'El nombre es obligatorio.');
    if (typeof email !== 'string' || !EMAIL_VALIDO.test(email.trim())) throw new ApiError(400, 'El correo no es válido.');
    validarPassword(password);
    await validarRol(rol);

    const usuario = await usuarioModel.crear({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      rol,
      id_sede: req.user.id_sede,
    });
    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { nombre, rol, activo } = req.body;

    if (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim())) {
      throw new ApiError(400, 'El nombre no puede quedar vacío.');
    }
    if (rol !== undefined) await validarRol(rol);
    if (activo !== undefined && typeof activo !== 'boolean') throw new ApiError(400, '"activo" debe ser verdadero o falso.');
    if (id === req.user.id_usuario && (activo === false || (rol !== undefined && rol !== 'Administrador'))) {
      throw new ApiError(400, 'No puedes desactivar tu propia cuenta ni quitarte el rol de administrador.');
    }

    const usuario = await usuarioModel.actualizar(id, { nombre: nombre?.trim(), rol, activo });
    if (!usuario) throw new ApiError(404, 'Usuario no encontrado.');
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

async function cambiarPassword(req, res, next) {
  try {
    validarPassword(req.body.password);
    const ok = await usuarioModel.cambiarPassword(Number(req.params.id), await bcrypt.hash(req.body.password, 10));
    if (!ok) throw new ApiError(404, 'Usuario no encontrado.');
    res.json({ mensaje: 'Contraseña actualizada.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, actualizar, cambiarPassword };
