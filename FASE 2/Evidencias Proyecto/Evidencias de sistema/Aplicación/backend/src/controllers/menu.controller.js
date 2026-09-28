const menuModel = require('../models/menu.model');
const { ApiError } = require('../middleware/errorHandler');

// RF-08, RF-07: consulta pública (sin sesión) del menú del día con la
// disponibilidad más reciente. Es el endpoint que el frontend estudiantil
// consulta por polling. Con ?categoria=Vegetariano devuelve el combo
// completo de esa categoría (su plato principal + los compartidos);
// sin categoría, devuelve todo (útil para el panel de gestión).
async function hoy(req, res, next) {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    const categoria = req.query.categoria || null;
    const menu = await menuModel.menuDelDia(fecha, categoria);
    res.json({ fecha, categoria: categoria || 'todas', preparaciones: menu });
  } catch (err) {
    next(err);
  }
}

module.exports = { hoy, planificarComponente, publicar, verPlanificacion, actualizarDisponibilidad, verHistorialDisponibilidad, verHistorialMenus };

// ---------------------------------------------------------------------
// HU-03: planificar el menú de una fecha, componente por componente.
// El frontend llama esto una vez por cada plato del día (4 principales
// + entrada + postre + bebida = hasta 7 llamadas para armar el día
// completo), en vez de un solo POST gigante.
// ---------------------------------------------------------------------
async function planificarComponente(req, res, next) {
  try {
    const { fecha, id_preparacion, tipo_componente, categoria, cantidad_planificada } = req.body;

    if (!fecha) throw new ApiError(400, 'La fecha es obligatoria.');
    if (!id_preparacion) throw new ApiError(400, 'id_preparacion es obligatorio.');
    if (!tipo_componente) throw new ApiError(400, 'tipo_componente es obligatorio (Entrada, Plato Principal, Postre o Bebida).');
    if (cantidad_planificada === undefined || isNaN(Number(cantidad_planificada)) || Number(cantidad_planificada) < 0) {
      throw new ApiError(400, 'cantidad_planificada es obligatoria y debe ser un número no negativo.');
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

// HU-04: publicar el menú del día para que sea visible a los estudiantes.
async function publicar(req, res, next) {
  try {
    const { id } = req.params;
    const menu = await menuModel.publicar(id);
    if (!menu) throw new ApiError(404, 'Menú no encontrado.');
    res.json({ mensaje: 'Menú publicado.', menu });
  } catch (err) {
    next(err);
  }
}

// Vista de gestión: ver la planificación completa de una fecha, publicada
// o no. Distinto de /hoy, que solo muestra lo ya publicado.
async function verPlanificacion(req, res, next) {
  try {
    const { fecha } = req.query;
    if (!fecha) throw new ApiError(400, 'El parámetro fecha es obligatorio.');
    const componentes = await menuModel.listarPorFecha(fecha);
    res.json({ fecha, componentes });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------
// HU-06: cambiar el estado de disponibilidad. req.user.id_usuario viene
// del token JWT (ver middleware/auth.js), así que el registro queda
// asociado a quien hizo el cambio sin que el cliente pueda mentir sobre
// eso mandando un id_usuario distinto en el cuerpo de la solicitud.
// ---------------------------------------------------------------------
async function actualizarDisponibilidad(req, res, next) {
  try {
    const { id } = req.params; // id_menu_preparacion
    const { estado, observacion } = req.body;

    if (!estado) throw new ApiError(400, 'El estado es obligatorio.');

    const registro = await menuModel.actualizarDisponibilidad(id, {
      estado, observacion, id_usuario: req.user.id_usuario,
    });
    res.status(201).json(registro);
  } catch (err) {
    next(err);
  }
}

// HU-06, criterio de aceptación: el historial no se sobrescribe.
async function verHistorialDisponibilidad(req, res, next) {
  try {
    const { id } = req.params;
    const historial = await menuModel.historialDisponibilidad(id);
    res.json({ id_menu_preparacion: Number(id), historial });
  } catch (err) {
    next(err);
  }
}

async function verHistorialMenus(req, res, next) {
  try {
    const hoyISO = new Date().toISOString().slice(0, 10);
    const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const desde = req.query.desde || hace30dias;
    const hasta = req.query.hasta || hoyISO;

    const historial = await menuModel.historialMenus(desde, hasta);
    res.json({ desde, hasta, menus: historial });
  } catch (err) {
    next(err);
  }
}
