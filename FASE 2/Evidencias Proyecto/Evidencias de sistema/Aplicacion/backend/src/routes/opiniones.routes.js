const express = require('express');
const controller = require('../controllers/estudiante.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const router = express.Router();


router.get('/detalle', autenticar, requiereRol('Administrador', 'Nutricionista'), controller.opinionesDetalle);
router.get('/favoritos', autenticar, requiereRol('Administrador', 'Nutricionista'), controller.favoritosDetalle);
router.get('/', autenticar, requiereRol('Administrador', 'Nutricionista'), controller.opiniones);

module.exports = router;
