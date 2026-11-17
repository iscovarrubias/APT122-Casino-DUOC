const ingredienteModel = require('../models/ingrediente.model');
const { ApiError } = require('../middleware/errorHandler');

const NUTRIENTES = ['calorias_100g', 'proteinas_100g', 'carbohidratos_100g', 'grasas_100g'];
const MAXIMO = { calorias_100g: 1000, proteinas_100g: 100, carbohidratos_100g: 100, grasas_100g: 100 };

async function listar(req, res, next) {
  try {
    res.json(await ingredienteModel.listar());
  } catch (err) {
    next(err);
  }
}

async function listarCategorias(req, res, next) {
  try {
    res.json(await ingredienteModel.listarCategorias());
  } catch (err) {
    next(err);
  }
}

function validarPayload(body) {
  const { nombre } = body;

  if (typeof nombre !== 'string' || nombre.trim() === '') {
    throw new ApiError(400, 'El nombre es obligatorio.');
  }

  const llenos = NUTRIENTES.filter((c) => body[c] !== null && body[c] !== undefined && body[c] !== '');
  if (llenos.length > 0 && llenos.length < NUTRIENTES.length) {
    throw new ApiError(400, 'Completa los cuatro valores nutricionales o déjalos todos vacíos.');
  }
  for (const c of llenos) {
    const n = Number(body[c]);
    if (isNaN(n) || n < 0 || n > MAXIMO[c]) {
      throw new ApiError(400, `"${c}" debe ser un número entre 0 y ${MAXIMO[c]} (valor por 100 g).`);
    }
  }
  if (body.alergenos !== undefined && !Array.isArray(body.alergenos)) {
    throw new ApiError(400, 'alergenos debe ser una lista de nombres del catálogo.');
  }
}

function limpiar(body) {
  const datos = {};
  for (const c of NUTRIENTES) {
    if (body[c] !== undefined) datos[c] = body[c] === '' || body[c] === null ? null : Number(body[c]);
  }
  if (body.nombre !== undefined) datos.nombre = String(body.nombre).trim();
  if (body.id_categoria_ingrediente !== undefined) {
    datos.id_categoria_ingrediente = body.id_categoria_ingrediente === '' || body.id_categoria_ingrediente === null
      ? null : Number(body.id_categoria_ingrediente);
  }
  if (body.sin_cuantificar !== undefined) datos.sin_cuantificar = !!body.sin_cuantificar;
  if (body.alergenos !== undefined) datos.alergenos = body.alergenos;
  return datos;
}

async function crear(req, res, next) {
  try {
    validarPayload(req.body);
    res.status(201).json(await ingredienteModel.crear(limpiar(req.body)));
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    if (req.body.nombre !== undefined || NUTRIENTES.some((c) => req.body[c] !== undefined)) {
      validarPayload({ ...req.body, nombre: req.body.nombre ?? 'sin cambio' });
    }
    const resultado = await ingredienteModel.actualizar(req.params.id, limpiar(req.body));
    if (!resultado) throw new ApiError(404, 'Ingrediente no encontrado.');
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const ok = await ingredienteModel.eliminar(req.params.id);
    if (!ok) throw new ApiError(404, 'Ingrediente no encontrado.');
    res.json({ mensaje: 'Ingrediente borrado.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, listarCategorias, crear, actualizar, eliminar };
