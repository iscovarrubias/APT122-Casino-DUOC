const imagenModel = require('../models/imagen.model');
const { ApiError } = require('../middleware/errorHandler');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ver(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID.test(id)) throw new ApiError(404, 'Imagen no encontrada.');
    const img = await imagenModel.obtener(id);
    if (!img) throw new ApiError(404, 'Imagen no encontrada.');
    res.set({
      'Content-Type': img.tipo_mime,
      'Content-Length': String(img.datos.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.end(img.datos);
  } catch (err) {
    next(err);
  }
}

module.exports = { ver };
