const menuModel = require('../models/menu.model');
const { ApiError } = require('../middleware/errorHandler');
const { hoyChile, haceDiasChile, esFechaISO } = require('../utils/fecha');

function fechaDe(valor, porDefecto) {
  const fecha = valor || porDefecto;
  if (!esFechaISO(fecha)) throw new ApiError(400, 'La fecha debe tener el formato AAAA-MM-DD.');
  return fecha;
}

function cantidadValida(valor) {
  return valor !== undefined && valor !== null && valor !== '' && Number.isInteger(Number(valor)) && Number(valor) >= 0;
}

// RF-07, RF-08: consulta pública del menú del día.
async function hoy(req, res, next) {
  try {
    const fecha = fechaDe(req.query.fecha, hoyChile());
    const categoria = req.query.categoria || null;
    const preparaciones = await menuModel.menuDelDia(fecha, categoria);
    res.json({ fecha, categoria: categoria || 'todas', preparaciones });
  } catch (err) {
    next(err);
  }
}

async function verHistorialMenus(req, res, next) {
  try {
    const desde = fechaDe(req.query.desde, haceDiasChile(30));
    const hasta = fechaDe(req.query.hasta, hoyChile());
    res.json({ desde, hasta, menus: await menuModel.historialMenus(desde, hasta) });
  } catch (err) {
    next(err);
  }
}

async function verPlanificacion(req, res, next) {
  try {
    const fecha = fechaDe(req.query.fecha, null);
    const [menu, componentes] = await Promise.all([
      menuModel.obtenerMenuPorFecha(fecha),
      menuModel.listarPorFecha(fecha),
    ]);
    res.json({ fecha, menu, componentes });
  } catch (err) {
    next(err);
  }
}

async function planificarComponente(req, res, next) {
  try {
    const { fecha, id_preparacion, tipo_componente, categoria, cantidad_planificada } = req.body;

    if (!esFechaISO(fecha)) throw new ApiError(400, 'La fecha es obligatoria (AAAA-MM-DD).');
    if (!id_preparacion) throw new ApiError(400, 'id_preparacion es obligatorio.');
    if (!tipo_componente) throw new ApiError(400, 'tipo_componente es obligatorio (Entrada, Plato Principal, Postre o Bebida).');
    if (!cantidadValida(cantidad_planificada)) {
      throw new ApiError(400, 'cantidad_planificada es obligatoria y debe ser un entero no negativo.');
    }

    const menu = await menuModel.obtenerOCrearMenu(fecha);
    const componente = await menuModel.agregarComponente(menu.id_menu, {
      id_preparacion, tipo_componente, categoria, cantidad_planificada,
    });
    res.status(201).json({ menu, componente });
  } catch (err) {
    next(err);
  }
}

async function actualizarComponente(req, res, next) {
  try {
    const { id_preparacion, cantidad_planificada } = req.body;
    if (id_preparacion === undefined && cantidad_planificada === undefined) {
      throw new ApiError(400, 'Envía id_preparacion o cantidad_planificada.');
    }
    if (cantidad_planificada !== undefined && !cantidadValida(cantidad_planificada)) {
      throw new ApiError(400, 'cantidad_planificada debe ser un entero no negativo.');
    }
    const componente = await menuModel.actualizarComponente(req.params.id, { id_preparacion, cantidad_planificada });
    if (!componente) throw new ApiError(404, 'Componente no encontrado.');
    res.json(componente);
  } catch (err) {
    next(err);
  }
}

async function eliminarComponente(req, res, next) {
  try {
    const eliminado = await menuModel.eliminarComponente(req.params.id);
    if (!eliminado) throw new ApiError(404, 'Componente no encontrado.');
    res.json({ mensaje: 'Componente quitado del menú.' });
  } catch (err) {
    next(err);
  }
}

async function publicar(req, res, next) {
  try {
    const menu = await menuModel.cambiarPublicacion(req.params.id, true);
    if (!menu) throw new ApiError(404, 'Menú no encontrado.');
    res.json({ mensaje: 'Menú publicado.', menu });
  } catch (err) {
    next(err);
  }
}

async function despublicar(req, res, next) {
  try {
    const menu = await menuModel.cambiarPublicacion(req.params.id, false);
    if (!menu) throw new ApiError(404, 'Menú no encontrado.');
    res.json({ mensaje: 'Menú despublicado.', menu });
  } catch (err) {
    next(err);
  }
}

async function actualizarDisponibilidad(req, res, next) {
  try {
    const { estado, observacion } = req.body;
    if (!estado) throw new ApiError(400, 'El estado es obligatorio.');
    const registro = await menuModel.actualizarDisponibilidad(req.params.id, {
      estado, observacion, id_usuario: req.user.id_usuario,
    });
    res.status(201).json(registro);
  } catch (err) {
    next(err);
  }
}

async function verHistorialDisponibilidad(req, res, next) {
  try {
    const historial = await menuModel.historialDisponibilidad(req.params.id);
    res.json({ id_menu_preparacion: Number(req.params.id), historial });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  hoy, verHistorialMenus, verPlanificacion, planificarComponente, actualizarComponente,
  eliminarComponente, publicar, despublicar, actualizarDisponibilidad, verHistorialDisponibilidad,
};
