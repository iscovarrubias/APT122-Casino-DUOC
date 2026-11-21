const express = require('express');
const controller = require('../controllers/correos.controller');

const router = express.Router();

router.get('/baja', controller.baja);
router.post('/tareas/semanal', controller.exigirTokenTareas, controller.tareaSemanal);
router.post('/tareas/diaria', controller.exigirTokenTareas, controller.tareaDiaria);

module.exports = router;
