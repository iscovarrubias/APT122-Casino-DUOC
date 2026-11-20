const pool = require('../config/db');
const { hoyChile, horaChile } = require('./fecha');
const jornadaModel = require('../models/jornada.model');

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_VENTAS_POR_RONDA = 25;
const ESPERA_ENTRE_RONDAS_MS = 20000;
const OPCIONES_POSTRE = ['Postre', 'Fruta'];

const config = () => ({
  horaInicio: HORA_VALIDA.test(process.env.HORA_INICIO_AUTOMATICO || '') ? process.env.HORA_INICIO_AUTOMATICO : null,
  simular: process.env.DEMO_VENTAS_SIMULADAS === 'true',
  ritmo: Number(process.env.DEMO_VENTAS_POR_MINUTO) > 0 ? Number(process.env.DEMO_VENTAS_POR_MINUTO) : 0.7,
});

const activa = () => {
  const c = config();
  return Boolean(c.horaInicio || c.simular);
};

async function iniciarSiCorresponde(horaInicio, hora = horaChile()) {
  if (!horaInicio || hora < horaInicio || hora >= jornadaModel.HORA_CIERRE) return 0;
  const { rows } = await pool.query(
    `SELECT m.id_sede FROM menu m
     WHERE m.fecha = $1 AND m.publicado
       AND NOT EXISTS (SELECT 1 FROM jornada j WHERE j.id_menu = m.id_menu)
       AND EXISTS (SELECT 1 FROM menu_preparacion mp WHERE mp.id_menu = m.id_menu)`,
    [hoyChile()]
  );
  let iniciadas = 0;
  for (const { id_sede } of rows) {
    try {
      await jornadaModel.iniciar({ id_usuario: null, id_sede });
      iniciadas += 1;
    } catch (err) {
      if (err.status !== 409) throw err;
    }
  }
  return iniciadas;
}

const elegirPonderado = (opciones) => {
  const total = opciones.reduce((s, o) => s + o.peso, 0);
  let r = Math.random() * total;
  for (const o of opciones) {
    r -= o.peso;
    if (r < 0) return o;
  }
  return opciones[opciones.length - 1];
};

async function simularVentas(ritmo) {
  const { rows: jornadas } = await pool.query(
    `SELECT j.id_jornada, j.id_menu, m.id_sede,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - j.iniciada_en)) / 60 AS minutos,
            (SELECT COUNT(*) FROM venta_combo vc
              WHERE vc.id_jornada = j.id_jornada AND vc.id_usuario IS NULL)::int AS simuladas
     FROM jornada j JOIN menu m ON m.id_menu = j.id_menu
     WHERE m.fecha = $1 AND j.estado = 'abierta'`,
    [hoyChile()]
  );

  let registradas = 0;
  for (const j of jornadas) {
    const objetivo = Math.floor(Number(j.minutos) * ritmo);
    let faltan = Math.min(objetivo - j.simuladas, MAX_VENTAS_POR_RONDA);
    while (faltan > 0) {
      const { rows: principales } = await pool.query(
        `SELECT c.nombre AS categoria, COALESCE(SUM(ms.delta), 0)::int AS restante
         FROM menu_preparacion mp
         JOIN tipo_componente t ON t.id_tipo_componente = mp.id_tipo_componente AND t.nombre = 'Plato Principal'
         JOIN categoria_menu c ON c.id_categoria_menu = mp.id_categoria_menu
         LEFT JOIN movimiento_stock ms ON ms.id_menu_preparacion = mp.id_menu_preparacion
         WHERE mp.id_menu = $1
         GROUP BY c.nombre`,
        [j.id_menu]
      );
      const conStock = principales.filter((p) => p.restante > 0).map((p) => ({ ...p, peso: p.restante }));
      if (!conStock.length) break;

      const { categoria } = elegirPonderado(conStock);
      const opcion = OPCIONES_POSTRE[Math.floor(Math.random() * OPCIONES_POSTRE.length)];
      try {
        await jornadaModel.registrarVenta({ categoria, opcion, tipo_venta: 'combo', id_usuario: null, id_sede: j.id_sede });
      } catch (err) {
        if (err.status === 400) {
          await jornadaModel.registrarVenta({ categoria, tipo_venta: 'combo', id_usuario: null, id_sede: j.id_sede });
        } else if (err.status === 409) {
          break;
        } else {
          throw err;
        }
      }
      registradas += 1;
      faltan -= 1;
    }
  }
  return registradas;
}

let enCurso = null;
let ultimaRonda = 0;

function ponerAlDia({ forzar = false } = {}) {
  if (!activa()) return Promise.resolve();
  if (enCurso) return enCurso;
  if (!forzar && Date.now() - ultimaRonda < ESPERA_ENTRE_RONDAS_MS) return Promise.resolve();
  ultimaRonda = Date.now();
  const { horaInicio, simular, ritmo } = config();
  enCurso = (async () => {
    try {
      await iniciarSiCorresponde(horaInicio);
      if (simular) await simularVentas(ritmo);
    } catch (err) {
      console.error('Automatización de la jornada:', err.message);
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

function iniciarReloj(intervaloMs = 60000) {
  if (!activa()) return null;
  const reloj = setInterval(() => ponerAlDia(), intervaloMs);
  reloj.unref();
  return reloj;
}

module.exports = { ponerAlDia, iniciarReloj, iniciarSiCorresponde, simularVentas, config };
