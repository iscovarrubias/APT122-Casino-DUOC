const express = require('express');
const controller = require('../controllers/menu.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = express.Router();

// Público: sin autenticar, tal como quedó definido para RF-08.
router.get('/hoy', controller.hoy);

// Gestión: solo Personal Casino o Administrador (HU-14 aplicado).
router.get('/planificacion', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.verPlanificacion);
router.post('/planificacion', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.planificarComponente);
router.patch('/:id/publicar', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.publicar);

module.exports = router;
