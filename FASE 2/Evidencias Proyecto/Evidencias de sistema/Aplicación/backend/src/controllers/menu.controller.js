const menuModel = require('../models/menu.model');
const { ApiError } = require('../middleware/errorHandler');

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

module.exports = { hoy, planificarComponente, publicar, verPlanificacion };

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
