const test = require('node:test');
const assert = require('node:assert/strict');
const { hoyChile, haceDiasChile, horaChile, esFechaISO } = require('../src/utils/fecha');
const { estadoPorStock } = require('../src/utils/stock');
const cache = require('../src/utils/cache');
const eventos = require('../src/utils/eventos');

test.describe('Fechas en hora de Chile', () => {
  test('UT-01 hoyChile entrega AAAA-MM-DD', () => {
    assert.match(hoyChile(), /^\d{4}-\d{2}-\d{2}$/);
  });

  test('UT-02 hoyChile usa la zona de Santiago y no la del servidor', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-21T02:30:00Z') });
    assert.equal(hoyChile(), '2026-11-20');
    assert.equal(horaChile(), '23:30');
  });

  test('UT-03 el cambio de horario de verano no corre la fecha', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-06T04:30:00Z') });
    assert.equal(hoyChile(), '2026-09-06');
  });

  test('UT-04 haceDiasChile retrocede días calendario', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-03-01T15:00:00Z') });
    assert.equal(haceDiasChile(1), '2026-02-28');
    assert.equal(haceDiasChile(7), '2026-02-22');
  });

  test('UT-05 horaChile entrega HH:MM en 24 horas', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-20T15:05:00Z') });
    assert.equal(horaChile(), '12:05');
  });

  test('UT-06 esFechaISO acepta fechas reales', () => {
    for (const f of ['2026-11-20', '2028-02-29', '2026-12-31', '2026-01-01']) assert.equal(esFechaISO(f), true, f);
  });

  test('UT-07 esFechaISO rechaza fechas imposibles que JavaScript acepta por defecto', () => {
    for (const f of ['2026-02-29', '2026-02-30', '2026-02-31', '2026-04-31', '2026-06-31', '2026-13-01', '2026-00-10', '2026-11-00']) {
      assert.equal(esFechaISO(f), false, f);
    }
  });

  test('UT-08 esFechaISO rechaza formatos y tipos incorrectos', () => {
    for (const f of ['20-11-2026', '2026/11/20', '2026-1-5', '', null, undefined, 20261120, {}, '2026-11-20T00:00:00Z', ' 2026-11-20']) {
      assert.equal(esFechaISO(f), false, String(f));
    }
  });
});

test.describe('Estado por stock', () => {
  test('UT-09 disponible, baja disponibilidad y agotado según lo que queda', () => {
    assert.equal(estadoPorStock({ restante: 10, total: 10 }), 'disponible');
    assert.equal(estadoPorStock({ restante: 4, total: 10 }), 'disponible');
    assert.equal(estadoPorStock({ restante: 3, total: 10 }), 'baja_disponibilidad');
    assert.equal(estadoPorStock({ restante: 1, total: 10 }), 'baja_disponibilidad');
    assert.equal(estadoPorStock({ restante: 0, total: 10 }), 'agotado');
    assert.equal(estadoPorStock({ restante: -2, total: 10 }), 'agotado');
  });

  test('UT-10 sin datos de stock no inventa un estado', () => {
    assert.equal(estadoPorStock({ restante: 0, total: 0 }), null);
    assert.equal(estadoPorStock({ restante: 'x', total: 10 }), null);
    assert.equal(estadoPorStock({ restante: undefined, total: undefined }), null);
  });

  test('UT-11 acepta números que llegan como texto desde PostgreSQL', () => {
    assert.equal(estadoPorStock({ restante: '2', total: '10' }), 'baja_disponibilidad');
  });
});

test.describe('Caché del menú', () => {
  test.beforeEach(() => cache.invalidar());

  test('UT-12 varias visitas simultáneas comparten una sola consulta', async () => {
    let llamadas = 0;
    const cargar = async () => {
      llamadas += 1;
      await new Promise((r) => setTimeout(r, 20));
      return { ok: true };
    };
    const resultados = await Promise.all(Array.from({ length: 50 }, () => cache.con('menu', 1000, cargar)));
    assert.equal(llamadas, 1);
    assert.ok(resultados.every((r) => r.ok));
  });

  test('UT-13 al vencer el tiempo vuelve a consultar', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    let llamadas = 0;
    const cargar = async () => ++llamadas;
    assert.equal(await cache.con('k', 2000, cargar), 1);
    t.mock.timers.tick(1999);
    assert.equal(await cache.con('k', 2000, cargar), 1);
    t.mock.timers.tick(2);
    assert.equal(await cache.con('k', 2000, cargar), 2);
  });

  test('UT-14 un error no queda guardado en la caché', async () => {
    let intento = 0;
    const cargar = async () => {
      intento += 1;
      if (intento === 1) throw new Error('caída');
      return 'bien';
    };
    await assert.rejects(cache.con('fallo', 5000, cargar));
    assert.equal(await cache.con('fallo', 5000, cargar), 'bien');
  });

  test('UT-15 invalidar borra todo para que la próxima visita vea el cambio', async () => {
    let n = 0;
    await cache.con('a', 60000, async () => ++n);
    cache.invalidar();
    assert.equal(await cache.con('a', 60000, async () => ++n), 2);
  });
});

test.describe('Eventos en tiempo real', () => {
  test('UT-16 emitir avisa a todos los suscritos y limpia la caché', async () => {
    let recibidos = 0;
    const bajas = Array.from({ length: 5 }, (_, i) =>
      eventos.suscribir(`10.0.0.${i}`, () => {
        recibidos += 1;
      })
    );
    let n = 0;
    await cache.con('menu', 60000, async () => ++n);
    eventos.emitir();
    assert.equal(recibidos, 5);
    assert.equal(await cache.con('menu', 60000, async () => ++n), 2);
    bajas.forEach((baja) => baja());
  });

  test('UT-17 desuscribir libera la conexión y es seguro llamarlo dos veces', () => {
    const antes = eventos.conexionesActivas();
    const baja = eventos.suscribir('10.1.1.1', () => {});
    assert.equal(eventos.conexionesActivas(), antes + 1);
    baja();
    baja();
    assert.equal(eventos.conexionesActivas(), antes);
  });

  test('UT-18 una sola IP no puede acaparar todas las conexiones', () => {
    const maximo = Number(process.env.EVENTOS_MAX_POR_IP) || 1500;
    const bajas = [];
    for (let i = 0; i < maximo; i += 1) bajas.push(eventos.suscribir('10.9.9.9', () => {}));
    assert.ok(bajas.every(Boolean));
    assert.equal(
      eventos.suscribir('10.9.9.9', () => {}),
      null
    );
    const otra = eventos.suscribir('10.9.9.8', () => {});
    assert.ok(otra);
    otra();
    bajas.forEach((b) => b());
  });
});
