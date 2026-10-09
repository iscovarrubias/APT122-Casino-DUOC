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

module.exports = { resumen };
