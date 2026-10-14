const model = require('../models/prediccion.model');
const { ApiError } = require('../middleware/errorHandler');
const { hoyChile, esFechaISO } = require('../utils/fecha');

const envolver = (fn) => async (req, res, next) => {
  try { res.json(await fn(req)); } catch (err) { next(err); }
};

const sugerencias = envolver((req) => {
  const fecha = req.query.fecha || hoyChile();
  if (!esFechaISO(fecha)) throw new ApiError(400, 'La fecha debe tener el formato AAAA-MM-DD.');
  return model.sugerencias(fecha, req.user.id_sede);
});
const hoy = envolver((req) => model.hoy(req.user.id_sede));
const confiabilidad = envolver((req) => model.confiabilidad(req.user.id_sede));

module.exports = { sugerencias, hoy, confiabilidad };
