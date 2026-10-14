const express = require('express');
const controller = require('../controllers/analisis.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = express.Router();

router.get('/resumen', autenticar, requiereRol('Administrador'), controller.resumen);
router.get('/mensual', autenticar, requiereRol('Administrador'), controller.mensual);

module.exports = router;
