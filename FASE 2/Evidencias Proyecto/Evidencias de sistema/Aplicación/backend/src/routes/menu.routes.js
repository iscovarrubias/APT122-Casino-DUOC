const express = require('express');
const controller = require('../controllers/menu.controller');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const eventos = require('../utils/eventos');

const router = express.Router();

const PERSONAL = [autenticar, requiereRol('Personal Casino', 'Administrador', 'Nutricionista')];

router.get('/eventos', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  res.write(': conectado\n\n');

  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 25000);

  const desuscribir = eventos.suscribir(() => {
    res.write('event: cambio\ndata: {}\n\n');
  });

  req.on('close', () => {
    clearInterval(keepAlive);
    desuscribir();
  });
});

router.get('/hoy', controller.hoy);
router.get('/historial', controller.verHistorialMenus);
router.get('/mes', ...PERSONAL, controller.verMes);
router.post('/copiar', ...PERSONAL, controller.copiar);
router.get('/planificacion', ...PERSONAL, controller.verPlanificacion);
router.post('/planificacion', ...PERSONAL, controller.planificarComponente);
router.patch('/componentes/:id', ...PERSONAL, controller.actualizarComponente);
router.delete('/componentes/:id', ...PERSONAL, controller.eliminarComponente);
router.patch('/:id/publicar', ...PERSONAL, controller.publicar);
router.patch('/:id/despublicar', ...PERSONAL, controller.despublicar);
router.patch('/componentes/:id/disponibilidad', ...PERSONAL, controller.actualizarDisponibilidad);
router.get('/componentes/:id/disponibilidad/historial', ...PERSONAL, controller.verHistorialDisponibilidad);

module.exports = router;
