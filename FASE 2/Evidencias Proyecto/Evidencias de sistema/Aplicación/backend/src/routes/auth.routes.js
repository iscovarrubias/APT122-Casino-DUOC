const express = require('express');
const { login, yo, loginDuoc, configPublica, identificar, microsoftInicio, microsoftCallback, microsoftCanje } = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth');
const { crearLimitadorDeFallos, crearLimitadorDeSolicitudes } = require('../middleware/limitador');

const router = express.Router();

const VENTANA_MS = 15 * 60 * 1000;
const MENSAJE = 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.';

const limitePorCuenta = crearLimitadorDeFallos({
  ventanaMs: VENTANA_MS,
  maximo: Number(process.env.LIMITE_LOGIN_POR_CUENTA) || 8,
  clave: (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`,
  mensaje: MENSAJE,
});

const limitePorIp = crearLimitadorDeFallos({
  ventanaMs: VENTANA_MS,
  maximo: Number(process.env.LIMITE_LOGIN_POR_IP) || 40,
  clave: (req) => req.ip,
  mensaje: MENSAJE,
});

const limiteIdentificar = crearLimitadorDeSolicitudes({
  ventanaMs: VENTANA_MS,
  maximo: Number(process.env.LIMITE_IDENTIFICAR_POR_IP) || 30,
  clave: (req) => req.ip,
  mensaje: 'Demasiadas consultas seguidas. Espera unos minutos antes de volver a intentar.',
});

router.post('/login', limitePorIp, limitePorCuenta, login);
router.post('/duoc', limitePorIp, loginDuoc);
router.post('/identificar', limiteIdentificar, identificar);
router.get('/microsoft/inicio', microsoftInicio);
router.get('/microsoft/callback', microsoftCallback);
router.post('/microsoft/canje', limitePorIp, microsoftCanje);
router.get('/config', configPublica);
router.get('/yo', autenticar, yo);

module.exports = router;
