const express = require('express');
const controller = require('../controllers/analisis.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = express.Router();

router.get('/resumen', autenticar, requiereRol('Administrador', 'Nutricionista'), controller.resumen);
router.get('/detalle', autenticar, requiereRol('Administrador', 'Nutricionista'), controller.detalle);
router.get('/mensual', autenticar, requiereRol('Administrador', 'Nutricionista'), controller.mensual);

module.exports = router;
