const preparacionModel = require('../models/preparacion.model');
const { ApiError } = require('../middleware/errorHandler');

const URL_VALIDA = /^https?:\/\/\S+$/i;

function esNumeroValido(valor) {
  return valor !== null && valor !== '' && !isNaN(Number(valor)) && Number(valor) >= 0;
}

function validarIngredientes(ingredientes) {
  if (ingredientes !== undefined && !Array.isArray(ingredientes)) {
    throw new ApiError(400, 'ingredientes debe ser una lista de nombres.');
  }
}

function validarImagen(imagen_url) {
  if (imagen_url && !URL_VALIDA.test(imagen_url)) {
    throw new ApiError(400, 'imagen_url debe ser un enlace que empiece con http:// o https://.');
  }
}

async function listar(req, res, next) {
  try {
    res.json(await preparacionModel.listarActivas());
  } catch (err) {
    next(err);
  }
}

async function listarGestion(req, res, next) {
  try {
    res.json(await preparacionModel.listarGestion());
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, descripcion, precio, imagen_url, ingredientes, tipo } = req.body;

    if (typeof nombre !== 'string' || nombre.trim() === '') {
      throw new ApiError(400, 'El nombre de la preparación es obligatorio.');
    }
    if (precio !== undefined && precio !== null && precio !== '' && !esNumeroValido(precio)) {
      throw new ApiError(400, 'Si se indica un precio, debe ser un número no negativo.');
    }
    validarIngredientes(ingredientes);
    validarImagen(imagen_url);

        if (tipo !== undefined && tipo !== null && tipo !== '' && tipo !== 'Entrada' && tipo !== 'Postre' && tipo !== 'Bebida' && tipo !== 'Plato Principal') {
      throw new ApiError(400, 'tipo inválido. Debe ser Entrada, Postre, Bebida o Plato Principal.');
    }

    const preparacion = await preparacionModel.crear({ nombre: nombre.trim(), descripcion, precio, imagen_url, ingredientes, tipo });
    res.status(201).json(preparacion);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, descripcion, precio, imagen_url, ingredientes, tipo } = req.body;

    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim() === '')) {
      throw new ApiError(400, 'El nombre no puede quedar vacío.');
    }
    if (precio !== undefined && precio !== null && precio !== '' && !esNumeroValido(precio)) {
      throw new ApiError(400, 'Si se indica un precio, debe ser un número no negativo.');
    }
    validarIngredientes(ingredientes);
    validarImagen(imagen_url);
    if (tipo !== undefined && tipo !== null && tipo !== '' && tipo !== 'Entrada' && tipo !== 'Postre' && tipo !== 'Bebida' && tipo !== 'Plato Principal') {
      throw new ApiError(400, 'tipo inválido. Debe ser Entrada, Postre, Bebida o Plato Principal.');
    }

    const preparacion = await preparacionModel.actualizar(req.params.id, {
      nombre: nombre?.trim(), descripcion, precio, imagen_url, ingredientes, tipo,
    });
    if (!preparacion) throw new ApiError(404, 'Preparación no encontrada.');
    res.json(preparacion);
  } catch (err) {
    next(err);
  }
}

async function desactivar(req, res, next) {
  try {
    const preparacion = await preparacionModel.cambiarEstado(req.params.id, false);
    if (!preparacion) throw new ApiError(404, 'Preparación no encontrada.');
    res.json({ mensaje: 'Preparación desactivada.', preparacion });
  } catch (err) {
    next(err);
  }
}

async function reactivar(req, res, next) {
  try {
    const preparacion = await preparacionModel.cambiarEstado(req.params.id, true);
    if (!preparacion) throw new ApiError(404, 'Preparación no encontrada.');
    res.json({ mensaje: 'Preparación reactivada.', preparacion });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const resultado = await preparacionModel.eliminar(req.params.id);

    if (resultado.error === 'no_encontrada') throw new ApiError(404, 'Preparación no encontrada.');
    if (resultado.error === 'activa') {
      throw new ApiError(409, 'Solo se pueden borrar preparaciones desactivadas. Desactívala primero.');
    }
    if (resultado.error === 'en_uso') {
      throw new ApiError(
        409,
        `No se puede borrar: ya aparece en ${resultado.usos} menú(s) histórico(s). ` +
        'Déjala desactivada para conservar el registro de lo que se sirvió.'
      );
    }

    res.json({ mensaje: 'Preparación borrada.' });
  } catch (err) {
    next(err);
  }
}

async function listarAlergenos(req, res, next) {
  try {
    res.json(await preparacionModel.listarCatalogoAlergenos());
  } catch (err) {
    next(err);
  }
}

async function listarTipos(req, res, next) {
  try {
    res.json(await preparacionModel.listarTipos());
  } catch (err) {
    next(err);
  }
}

async function asignarAlergenos(req, res, next) {
  try {
    const { alergenos } = req.body;
    if (!Array.isArray(alergenos)) {
      throw new ApiError(400, 'alergenos debe ser una lista de nombres (puede ser vacía).');
    }
    const asignados = await preparacionModel.asignarAlergenos(req.params.id, alergenos);
    res.json({ id_preparacion: Number(req.params.id), alergenos: asignados });
  } catch (err) {
    next(err);
  }
}

async function actualizarNutricion(req, res, next) {
  try {
    const { calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado } = req.body;

    for (const [campo, valor] of Object.entries({ calorias, proteinas_g, carbohidratos_g, grasas_g })) {
      if (valor !== undefined && valor !== null && !esNumeroValido(valor)) {
        throw new ApiError(400, `El campo "${campo}" debe ser un número no negativo.`);
      }
    }
    if (validado === true && (calorias === undefined || calorias === null)) {
      throw new ApiError(400, 'No se puede marcar como validado sin al menos el dato de calorías.');
    }

    const nutricion = await preparacionModel.actualizarNutricion(req.params.id, {
      calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado,
    });
    res.json(nutricion);
  } catch (err) {
    next(err);
  }
}

async function subirImagen(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'No se recibió ningún archivo.');
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(201).json({ imagen_url: url });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar, listarGestion, crear, actualizar, desactivar, reactivar, eliminar,
  listarAlergenos, asignarAlergenos, actualizarNutricion, subirImagen, listarTipos,
};