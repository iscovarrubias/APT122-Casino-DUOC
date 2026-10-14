const express = require('express');
const controller = require('../controllers/estudiante.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const router = express.Router();


router.get('/', autenticar, requiereRol('Administrador', 'Nutricionista'), controller.opiniones);

module.exports = router;
