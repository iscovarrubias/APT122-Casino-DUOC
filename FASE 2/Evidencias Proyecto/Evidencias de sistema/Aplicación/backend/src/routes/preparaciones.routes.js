const express = require('express');
const controller = require('../controllers/preparaciones.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = express.Router();

// RF-08 (actualizado): la consulta de menú es pública, no requiere sesión.
// La preferencia de compartir un mockup mostró que preferencias, opiniones
// y notificaciones (RF-18 a RF-20) sí necesitarán cuenta más adelante,
// condicionado a la integración con DUOC Microsoft, pero la consulta base
// no debe depender de eso.
router.get('/', controller.listar);

// HU-01 y HU-02: solo personal del casino o administrador pueden gestionar
// el catálogo de preparaciones. Esto es HU-14 aplicado en la práctica.
router.post('/', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.crear);
router.put('/:id', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.actualizar);
router.patch('/:id/desactivar', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.desactivar);

// HU-12: alérgenos desde catálogo fijo.
router.get('/alergenos', controller.listarAlergenos); // público, útil para armar un selector en el frontend
router.put('/:id/alergenos', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.asignarAlergenos);

// HU-13: información nutricional, marcada explícitamente como validada.
router.put('/:id/nutricion', autenticar, requiereRol('Personal Casino', 'Administrador'), controller.actualizarNutricion);

module.exports = router;
