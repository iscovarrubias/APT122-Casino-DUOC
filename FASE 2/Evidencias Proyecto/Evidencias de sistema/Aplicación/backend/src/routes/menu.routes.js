const express = require('express');
const controller = require('../controllers/menu.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = express.Router();

// Público: sin autenticar, tal como quedó definido para RF-08.
router.get('/hoy', controller.hoy);

// HU-05: historial de menús publicados, también público.
router.get('/historial', controller.verHistorialMenus);

// Gestión: solo Personal Casino o Administrador (HU-14 aplicado).
router.get('/planificacion', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.verPlanificacion);
router.post('/planificacion', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.planificarComponente);
router.patch('/:id/publicar', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.publicar);

// HU-06: cambiar disponibilidad de un componente (id_menu_preparacion).
router.patch('/componentes/:id/disponibilidad', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.actualizarDisponibilidad);

// Historial completo (gestión, para verificar que nada se sobrescribió).
router.get('/componentes/:id/disponibilidad/historial', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.verHistorialDisponibilidad);

module.exports = router;
