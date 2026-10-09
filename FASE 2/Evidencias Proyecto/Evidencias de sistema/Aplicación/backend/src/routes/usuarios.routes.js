const express = require('express');
const controller = require('../controllers/usuarios.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const router = express.Router();

router.use(autenticar, requiereRol('Administrador'));
router.get('/', controller.listar);
router.post('/', controller.crear);
router.patch('/:id', controller.actualizar);
router.put('/:id/password', controller.cambiarPassword);

module.exports = router;
