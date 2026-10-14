const express = require('express');
const controller = require('../controllers/estudiante.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const router = express.Router();

router.use(autenticar, requiereRol('Estudiante'));

router.get('/perfil', controller.perfil);
router.put('/alergias', controller.alergias);
router.put('/categoria-preferida', controller.categoriaPreferida);
router.put('/favoritos/:id', controller.marcarFavorito);
router.delete('/favoritos/:id', controller.quitarFavorito);
router.put('/calificaciones/:id', controller.calificar);
router.delete('/calificaciones/:id', controller.quitarCalificacion);
router.get('/alertas', controller.alertas);

module.exports = router;
