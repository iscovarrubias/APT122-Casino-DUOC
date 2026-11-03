const analisisModel = require('../models/analisis.model');
const { ApiError } = require('../middleware/errorHandler');
const { hoyChile, haceDiasChile, esFechaISO } = require('../utils/fecha');

async function resumen(req, res, next) {
  try {
    const desde = req.query.desde || haceDiasChile(30);
    const hasta = req.query.hasta || hoyChile();
    if (!esFechaISO(desde) || !esFechaISO(hasta)) throw new ApiError(400, 'Las fechas deben tener el formato AAAA-MM-DD.');
    if (desde > hasta) throw new ApiError(400, 'La fecha "desde" no puede ser posterior a "hasta".');

    const sede = req.user.id_sede;
    const [agotamientos, ventas_por_hora, mas_vendidas, origenes] = await Promise.all([
      analisisModel.agotamientos(desde, hasta, sede),
      analisisModel.ventasPorHora(desde, hasta, sede),
      analisisModel.masVendidas(desde, hasta, sede),
      analisisModel.origenes(desde, hasta, sede),
    ]);

    res.json({ desde, hasta, origenes, agotamientos, ventas_por_hora, mas_vendidas });
  } catch (err) {
    next(err);
  }
}

async function detalle(req, res, next) {
  try {
    const desde = req.query.desde || haceDiasChile(30);
    const hasta = req.query.hasta || hoyChile();
    if (!esFechaISO(desde) || !esFechaISO(hasta)) throw new ApiError(400, 'Las fechas deben tener el formato AAAA-MM-DD.');
    if (desde > hasta) throw new ApiError(400, 'La fecha "desde" no puede ser posterior a "hasta".');
    let id_preparacion = null;
    if (req.query.id_preparacion) {
      id_preparacion = Number(req.query.id_preparacion);
      if (!Number.isInteger(id_preparacion) || id_preparacion <= 0) throw new ApiError(400, 'id_preparacion inválido.');
    }
    const categoria = typeof req.query.categoria === 'string' && req.query.categoria ? req.query.categoria.slice(0, 50) : null;
    res.json({ desde, hasta, id_preparacion, categoria, ...(await analisisModel.detalle(desde, hasta, req.user.id_sede, { id_preparacion, categoria })) });
  } catch (err) {
    next(err);
  }
}

function validarMes(mes) {
  if (typeof mes !== 'string' || !/^\d{4}-\d{2}$/.test(mes)) {
    throw new ApiError(400, 'El mes debe tener el formato AAAA-MM.');
  }
  const m = Number(mes.slice(5, 7));
  if (m < 1 || m > 12) throw new ApiError(400, 'El mes debe estar entre 01 y 12.');
  return mes;
}

async function mensual(req, res, next) {
  try {
    if (req.query.desde || req.query.hasta) {
      const desde = req.query.desde || haceDiasChile(30);
      const hasta = req.query.hasta || hoyChile();
      if (!esFechaISO(desde) || !esFechaISO(hasta)) throw new ApiError(400, 'Las fechas deben tener el formato AAAA-MM-DD.');
      if (desde > hasta) throw new ApiError(400, 'La fecha "desde" no puede ser posterior a "hasta".');
      return res.json(await analisisModel.rankingPeriodo(desde, hasta));
    }
    const mes = validarMes(req.query.mes);
    res.json(await analisisModel.rankingMensual(mes));
  } catch (err) {
    next(err);
  }
}

module.exports = { resumen, detalle, mensual };
