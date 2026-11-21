const crypto = require('node:crypto');
const correoModel = require('../models/correo.model');
const avisos = require('../utils/avisosCorreo');
const { ApiError } = require('../middleware/errorHandler');
const { esFechaISO } = require('../utils/fecha');

const envolver = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    next(err);
  }
};

function urlsDe(req) {
  const api = (process.env.API_URL_PUBLICA || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const sitio = (process.env.FRONTEND_URL || (process.env.CORS_ORIGIN || '').split(',')[0] || 'http://localhost:5173').replace(/\/$/, '');
  return { api, sitio };
}

function tokenValido(req) {
  const esperado = process.env.TOKEN_TAREAS || '';
  const recibido = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (esperado.length < 20 || recibido.length !== esperado.length) return false;
  return crypto.timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado));
}

function exigirTokenTareas(req, res, next) {
  if (!process.env.TOKEN_TAREAS) return next(new ApiError(503, 'Las tareas programadas no están configuradas.'));
  if (!tokenValido(req)) return next(new ApiError(401, 'Token de tareas inválido.'));
  next();
}

const fechaDe = (req) => {
  const fecha = req.body?.fecha ?? req.query.fecha;
  if (fecha === undefined) return undefined;
  if (!esFechaISO(fecha)) throw new ApiError(400, 'La fecha debe tener el formato AAAA-MM-DD.');
  return fecha;
};

const preferencias = envolver((req) => correoModel.preferencias(req.user.id_usuario));

const guardarPreferencias = envolver(async (req) => {
  const { menu_semanal, avisos_favoritos } = req.body || {};
  if (typeof menu_semanal !== 'boolean' || typeof avisos_favoritos !== 'boolean') {
    throw new ApiError(400, 'menu_semanal y avisos_favoritos deben ser verdadero o falso.');
  }
  return correoModel.guardarPreferencias(req.user.id_usuario, { menu_semanal, avisos_favoritos });
});

const tareaSemanal = envolver((req) => avisos.enviarSemanal({ hoy: fechaDe(req), urls: urlsDe(req) }));
const tareaDiaria = envolver((req) => avisos.enviarDiario({ hoy: fechaDe(req), urls: urlsDe(req) }));

const PAGINA = (
  titulo,
  texto,
  sitio
) => `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${titulo}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;margin:0;padding:40px 16px;color:#1f2937;">
<main style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;">
<h1 style="margin:0 0 10px;font-size:20px;color:#1e3a5f;">${titulo}</h1><p style="line-height:1.5;">${texto}</p>
<p><a href="${sitio}" style="color:#1e3a5f;font-weight:bold;">Ir a Casinos DUOC UC</a></p></main></body></html>`;

async function baja(req, res, next) {
  try {
    const token = String(req.query.token || '');
    const { sitio } = urlsDe(req);
    const valido = /^[0-9a-f-]{36}$/i.test(token) && (await correoModel.darDeBaja(token));
    res
      .status(valido ? 200 : 404)
      .type('html')
      .send(
        valido
          ? PAGINA(
              'Listo, ya no recibirás correos',
              'Desactivamos el menú semanal y los avisos de favoritos. Puedes volver a activarlos cuando quieras desde «Mi perfil».',
              sitio
            )
          : PAGINA(
              'Enlace no válido',
              'Este enlace no corresponde a ninguna suscripción. Puedes revisar tus avisos desde «Mi perfil».',
              sitio
            )
      );
  } catch (err) {
    next(err);
  }
}

module.exports = { preferencias, guardarPreferencias, tareaSemanal, tareaDiaria, baja, exigirTokenTareas };
