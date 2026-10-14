const jornadaModel = require('../models/jornada.model');
const { ApiError } = require('../middleware/errorHandler');

async function hoy(req, res, next) {
  try {
    res.json(await jornadaModel.estadoHoy({ id_sede: req.user.id_sede }));
  } catch (err) {
    next(err);
  }
}

async function iniciar(req, res, next) {
  try {
    const { cantidades } = req.body || {};
    const jornada = await jornadaModel.iniciar({
      id_usuario: req.user.id_usuario,
      id_sede: req.user.id_sede,
      cantidades: cantidades || {},
    });
    res.json(jornada);
  } catch (err) {
    next(err);
  }
}

async function cerrar(req, res, next) {
  try {
    const { sobrantes } = req.body || {};
    res.json(await jornadaModel.cerrar({
      id_usuario: req.user.id_usuario,
      id_sede: req.user.id_sede,
      sobrantes: sobrantes || {},
    }));
  } catch (err) {
    next(err);
  }
}

async function venta(req, res, next) {
  try {
    const { categoria } = req.body || {};
    if (!categoria) throw new ApiError(400, 'Falta la categoría del combo.');
    const venta = await jornadaModel.registrarVenta({
      categoria,
      id_usuario: req.user.id_usuario,
      id_sede: req.user.id_sede,
    });
    res.status(201).json(venta);
  } catch (err) {
    next(err);
  }
}

async function anularVenta(req, res, next) {
  try {
    res.json(await jornadaModel.anularVenta({
      id_venta_combo: req.params.id,
      id_usuario: req.user.id_usuario,
      id_sede: req.user.id_sede,
    }));
  } catch (err) {
    next(err);
  }
}

async function ajustarStock(req, res, next) {
  try {
    const { accion, cantidad, observacion } = req.body || {};
    const resultado = await jornadaModel.ajustarStock({
      id_menu_preparacion: req.params.id,
      accion,
      cantidad,
      observacion,
      id_usuario: req.user.id_usuario,
      id_sede: req.user.id_sede,
    });
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { hoy, iniciar, cerrar, venta, anularVenta, ajustarStock };