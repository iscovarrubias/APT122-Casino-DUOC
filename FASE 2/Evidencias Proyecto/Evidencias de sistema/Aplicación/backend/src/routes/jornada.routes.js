const express = require('express');
const controller = require('../controllers/jornada.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const router = express.Router();
const PANEL = [autenticar, requiereRol('Cajero', 'Personal Casino', 'Administrador')];
const CAJA = [autenticar, requiereRol('Cajero', 'Personal Casino', 'Administrador')];
const COCINA = [autenticar, requiereRol('Personal Casino', 'Administrador')];

router.get('/hoy', ...PANEL, controller.hoy);
router.post('/iniciar', ...COCINA, controller.iniciar);
router.post('/cerrar', ...COCINA, controller.cerrar);
router.post('/ventas', ...CAJA, controller.venta);
router.post('/ventas/:id/anular', ...CAJA, controller.anularVenta);
router.post('/componentes/:id/stock', ...COCINA, controller.ajustarStock);

module.exports = router;