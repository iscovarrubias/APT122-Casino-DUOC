const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('../src/utils/prediccion');

const obs = (fecha, vendidas, extra = {}) => ({ fecha, dow: p.diaSemana(fecha), vendidas, agoto: false, planificado: 50, ...extra });
const sumarDias = (fecha, n) => new Date(new Date(`${fecha}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

test('CP-29 el día de la semana es ISO (lunes = 1, domingo = 7)', () => {
  assert.equal(p.diaSemana('2026-10-12'), 1);
  assert.equal(p.diaSemana('2026-10-13'), 2);
  assert.equal(p.diaSemana('2026-10-18'), 7);
});

test('CP-30 estima la demanda con los últimos 4 mismos días, dando más peso a lo reciente', () => {
  const martes = ['2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06'];
  const historia = [...martes.map((f, i) => obs(f, 40 + i * 2)), obs('2026-09-16', 99)];
  const e = p.estimarDemanda(historia, '2026-10-13');
  assert.equal(e.base, 'mismo_dia');
  assert.equal(e.n, 4);
  assert.equal(e.media, 44);
  assert.equal(e.sugerido, 50);
  assert.equal(e.minimo, 41);
  assert.equal(e.maximo, 47);
});

test('CP-31 un día en que se agotó se corrige al alza (la demanda real fue mayor)', () => {
  const e = p.estimarDemanda([obs('2026-10-06', 40, { agoto: true }), obs('2026-09-29', 46)], '2026-10-13');
  assert.equal(e.censuradas, 1);
  assert.equal(e.media, 46);
});

test('CP-32 sin suficientes mismos días usa la historia general', () => {
  const e = p.estimarDemanda([obs('2026-10-07', 30), obs('2026-10-08', 34), obs('2026-10-09', 32)], '2026-10-13');
  assert.equal(e.base, 'general');
  assert.equal(e.n, 3);
});

test('CP-33 con menos de 2 días de historia no inventa una estimación', () => {
  assert.equal(p.estimarDemanda([obs('2026-10-06', 40)], '2026-10-13'), null);
  assert.equal(p.estimarDemanda([], '2026-10-13'), null);
});

test('CP-34 no usa días posteriores a la fecha estimada', () => {
  const e = p.estimarDemanda([obs('2026-10-06', 40), obs('2026-09-29', 40), obs('2026-10-20', 999)], '2026-10-13');
  assert.equal(e.media, 40);
});

test('CP-35 backtest: con demanda constante el modelo no se equivoca y sobra menos que lo planificado', () => {
  let f = '2026-09-01';
  const dias = [];
  for (let i = 0; i < 10; i++) { dias.push(obs(f, 40)); f = sumarDias(f, 1); }
  const r = p.backtestDemanda(dias);
  assert.equal(r.dias, 6);
  assert.equal(r.mae_modelo, 0);
  assert.equal(r.cobertura_sugerencia, 100);
  assert.equal(r.sobrante_sugerencia, 0);
  assert.equal(r.sobrante_planificado, 10);
});

test('CP-36 backtest: los días con agotamiento bajan la cobertura de lo planificado', () => {
  let f = '2026-09-01';
  const dias = [];
  for (let i = 0; i < 10; i++) { dias.push(obs(f, 50, { agoto: i % 2 === 0, planificado: 50 })); f = sumarDias(f, 1); }
  const r = p.backtestDemanda(dias);
  assert.ok(r.cobertura_planificado < 100);
  assert.ok(r.cobertura_sugerencia >= r.cobertura_planificado);
});

const curvaPlana = [];
for (let b = 720; b < 840; b += 5) curvaPlana.push({ bin: b, unidades: 2 });

test('CP-37 estima la hora de agotamiento con la curva histórica', () => {
  const r = p.estimarAgotamiento({ curva: curvaPlana, restante: 20, vendidasHoy: 24, ahora: 780, cierre: 960 });
  assert.equal(r.agotaria, true);
  assert.equal(r.hora, '13:50');
  assert.equal(r.minutos_restantes, 50);
});

test('CP-38 si hoy se vende más rápido, se agota antes (la escala se acota en 2)', () => {
  const rapido = p.estimarAgotamiento({ curva: curvaPlana, restante: 20, vendidasHoy: 48, ahora: 780, cierre: 960 });
  assert.equal(rapido.hora, '13:25');
  assert.equal(rapido.escala, 2);
  const muyRapido = p.estimarAgotamiento({ curva: curvaPlana, restante: 20, vendidasHoy: 480, ahora: 780, cierre: 960 });
  assert.equal(muyRapido.escala, 2);
});

test('CP-39 si lo que queda alcanza hasta el cierre, no se agotaría', () => {
  const r = p.estimarAgotamiento({ curva: curvaPlana, restante: 500, vendidasHoy: 24, ahora: 780, cierre: 960 });
  assert.equal(r.agotaria, false);
});

test('CP-40 sin stock ya está agotado y sin curva no hay estimación', () => {
  assert.equal(p.estimarAgotamiento({ curva: curvaPlana, restante: 0, vendidasHoy: 40, ahora: 780, cierre: 960 }).estado, 'agotado');
  assert.equal(p.estimarAgotamiento({ curva: null, restante: 10, vendidasHoy: 0, ahora: 780, cierre: 960 }), null);
});

test('CP-41 backtest de agotamiento: con un patrón estable el error es de pocos minutos', () => {
  let f = '2026-09-01';
  const dias = [];
  for (let i = 0; i < 8; i++) {
    const bins = [];
    for (let b = 720; b < 820; b += 5) bins.push({ bin: b, unidades: 2 });
    dias.push({ fecha: f, dow: p.diaSemana(f), planificado: 40, vendidas: 40, agoto: true, hora_agotado: 818, bins });
    f = sumarDias(f, 1);
  }
  const r = p.backtestAgotamiento(dias);
  assert.equal(r.dias, 4);
  assert.ok(r.mae_modelo_min <= 5);
  assert.equal(r.dentro_15_min_pct, 100);
});

test('CP-42 combinar resultados suma acumulados en vez de promediar promedios', () => {
  let f = '2026-09-01';
  const a = [];
  for (let i = 0; i < 10; i++) { a.push(obs(f, 40)); f = sumarDias(f, 1); }
  const r1 = p.backtestDemanda(a);
  const global = p.combinarDemanda([r1, r1]);
  assert.equal(global.dias, r1.dias * 2);
  assert.equal(global.mae_modelo, r1.mae_modelo);
});
