const preparacionModel = require('../models/preparacion.model');
const { ApiError } = require('../middleware/errorHandler');

async function listar(req, res, next) {
  try {
    const preparaciones = await preparacionModel.listarActivas();
    res.json(preparaciones);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, descripcion, precio, ingredientes } = req.body;

    if (!nombre || nombre.trim() === '') {
      throw new ApiError(400, 'El nombre de la preparación es obligatorio.');
    }
    if (precio === undefined || precio === null || isNaN(Number(precio)) || Number(precio) < 0) {
      throw new ApiError(400, 'El precio es obligatorio, debe ser un número, y no puede ser negativo.');
    }

    const preparacion = await preparacionModel.crear({
      nombre: nombre.trim(),
      descripcion,
      precio,
      ingredientes,
    });

    res.status(201).json(preparacion);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio } = req.body;

    if (precio !== undefined && (isNaN(Number(precio)) || Number(precio) < 0)) {
      throw new ApiError(400, 'El precio debe ser un número y no puede ser negativo.');
    }

    const preparacion = await preparacionModel.actualizar(id, { nombre, descripcion, precio });
    if (!preparacion) {
      throw new ApiError(404, 'Preparación no encontrada.');
    }
    res.json(preparacion);
  } catch (err) {
    next(err);
  }
}

async function desactivar(req, res, next) {
  try {
    const { id } = req.params;
    const preparacion = await preparacionModel.desactivar(id);
    if (!preparacion) {
      throw new ApiError(404, 'Preparación no encontrada.');
    }
    res.json({ mensaje: 'Preparación desactivada.', preparacion });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar, crear, actualizar, desactivar,
  listarAlergenos, asignarAlergenos,
  actualizarNutricion,
};


async function listarAlergenos(req, res, next) {
  try {
    const catalogo = await preparacionModel.listarCatalogoAlergenos();
    res.json(catalogo);
  } catch (err) {
    next(err);
  }
}

async function asignarAlergenos(req, res, next) {
  try {
    const { id } = req.params;
    const { alergenos } = req.body;

    if (!Array.isArray(alergenos)) {
      throw new ApiError(400, 'alergenos debe ser una lista de nombres (puede ser vacía).');
    }

    const asignados = await preparacionModel.asignarAlergenos(id, alergenos);
    res.json({ id_preparacion: Number(id), alergenos: asignados });
  } catch (err) {
    next(err);
  }
}


async function actualizarNutricion(req, res, next) {
  try {
    const { id } = req.params;
    const { calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado } = req.body;

    const numeros = { calorias, proteinas_g, carbohidratos_g, grasas_g };
    for (const [campo, valor] of Object.entries(numeros)) {
      if (valor !== undefined && valor !== null && isNaN(Number(valor))) {
        throw new ApiError(400, `El campo "${campo}" debe ser un número.`);
      }
    }
    if (validado === true && (calorias === undefined || calorias === null)) {
      throw new ApiError(400, 'No se puede marcar como validado sin al menos el dato de calorías.');
    }

    const nutricion = await preparacionModel.actualizarNutricion(id, {
      calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado,
    });
    res.json(nutricion);
  } catch (err) {
    next(err);
  }
}
