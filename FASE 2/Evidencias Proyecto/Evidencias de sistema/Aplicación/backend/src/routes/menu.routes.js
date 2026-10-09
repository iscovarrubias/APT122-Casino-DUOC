const express = require('express');
const controller = require('../controllers/menu.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = express.Router();

const PERSONAL = [autenticar, requiereRol('Personal Casino', 'Administrador')];

router.get('/hoy', controller.hoy);
router.get('/historial', controller.verHistorialMenus);
router.get('/planificacion', ...PERSONAL, controller.verPlanificacion);
router.post('/planificacion', ...PERSONAL, controller.planificarComponente);
router.patch('/componentes/:id', ...PERSONAL, controller.actualizarComponente);
router.delete('/componentes/:id', ...PERSONAL, controller.eliminarComponente);
router.patch('/:id/publicar', ...PERSONAL, controller.publicar);
router.patch('/:id/despublicar', ...PERSONAL, controller.despublicar);
router.patch('/componentes/:id/disponibilidad', ...PERSONAL, controller.actualizarDisponibilidad);
router.get('/componentes/:id/disponibilidad/historial', ...PERSONAL, controller.verHistorialDisponibilidad);

module.exports = router;
