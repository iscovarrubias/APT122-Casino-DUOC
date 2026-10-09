const express = require('express');
const controller = require('../controllers/preparaciones.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const { subirImagen } = require('../middleware/subida');
const router = express.Router();

const PERSONAL = [autenticar, requiereRol('Personal Casino', 'Administrador')];
const SOLO_ADMIN = [autenticar, requiereRol('Administrador')];

router.get('/', controller.listar);
router.get('/alergenos', controller.listarAlergenos);
router.get('/tipos', controller.listarTipos);
router.get('/gestion', ...PERSONAL, controller.listarGestion);
router.post('/imagen', ...SOLO_ADMIN, subirImagen.single('imagen'), controller.subirImagen);
router.post('/', ...SOLO_ADMIN, controller.crear);
router.put('/:id', ...SOLO_ADMIN, controller.actualizar);
router.patch('/:id/desactivar', ...SOLO_ADMIN, controller.desactivar);
router.patch('/:id/reactivar', ...SOLO_ADMIN, controller.reactivar);
router.delete('/:id', ...SOLO_ADMIN, controller.eliminar);
router.put('/:id/alergenos', ...SOLO_ADMIN, controller.asignarAlergenos);
router.put('/:id/nutricion', ...SOLO_ADMIN, controller.actualizarNutricion);

module.exports = router;
