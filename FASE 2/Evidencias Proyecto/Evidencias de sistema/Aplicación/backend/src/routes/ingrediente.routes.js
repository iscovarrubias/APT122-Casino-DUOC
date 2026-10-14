const express = require('express');
const controller = require('../controllers/ingrediente.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const router = express.Router();

router.get('/categorias', controller.listarCategorias);

const SOLO_ADMIN = [autenticar, requiereRol('Administrador', 'Nutricionista')];

router.get('/', ...SOLO_ADMIN, controller.listar);
router.post('/', ...SOLO_ADMIN, controller.crear);
router.put('/:id', ...SOLO_ADMIN, controller.actualizar);
router.delete('/:id', ...SOLO_ADMIN, controller.eliminar);

module.exports = router;