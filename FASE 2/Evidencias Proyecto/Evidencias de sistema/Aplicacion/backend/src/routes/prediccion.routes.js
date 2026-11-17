const express = require('express');
const controller = require('../controllers/prediccion.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = express.Router();

router.get('/hoy', autenticar, requiereRol('Cajero', 'Personal Casino', 'Administrador'), controller.hoy);
router.get('/sugerencias', autenticar, requiereRol('Personal Casino', 'Administrador', 'Nutricionista'), controller.sugerencias);
router.get('/confiabilidad', autenticar, requiereRol('Administrador', 'Nutricionista'), controller.confiabilidad);

module.exports = router;
