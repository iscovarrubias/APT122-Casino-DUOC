const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const consultas = [];
let filasMenus = [];
let filasJornadas = [];
let filasPrincipales = [];
const poolFalso = {
  query: async (sql, params) => {
    consultas.push({ sql, params });
    if (/FROM menu m\s+WHERE m\.fecha/.test(sql)) return { rows: filasMenus };
    if (/FROM jornada j JOIN menu m/.test(sql)) return { rows: filasJornadas };
    if (/Plato Principal/.test(sql)) return { rows: filasPrincipales };
    return { rows: [] };
  },
};
const iniciadas = [];
const ventas = [];
let fallarVentaCon = null;
const jornadaFalsa = {
  HORA_CIERRE: '15:30',
  iniciar: async ({ id_sede }) => {
    if (id_sede === 99) throw Object.assign(new Error('ya iniciada'), { status: 409 });
    iniciadas.push(id_sede);
  },
  registrarVenta: async (venta) => {
    if (fallarVentaCon && venta.opcion) throw Object.assign(new Error('x'), { status: fallarVentaCon });
    ventas.push(venta);
  },
};

const src = path.join(__dirname, '../src');
require.cache[require.resolve(path.join(src, 'config/db'))] = { exports: poolFalso, loaded: true, id: 'db' };
require.cache[require.resolve(path.join(src, 'models/jornada.model'))] = { exports: jornadaFalsa, loaded: true, id: 'jm' };
const demo = require('../src/utils/demo');

test.beforeEach(() => {
  consultas.length = 0;
  iniciadas.length = 0;
  ventas.length = 0;
  filasMenus = [];
  filasJornadas = [];
  filasPrincipales = [];
  fallarVentaCon = null;
  delete process.env.HORA_INICIO_AUTOMATICO;
  delete process.env.DEMO_VENTAS_SIMULADAS;
  delete process.env.DEMO_VENTAS_POR_MINUTO;
});

test.describe('Configuración de la automatización', () => {
  test('UT-40 sin variables no hay automatización', () => {
    assert.deepEqual(demo.config(), { horaInicio: null, simular: false, ritmo: 0.7 });
  });

  test('UT-41 solo acepta horas válidas en formato HH:MM', () => {
    for (const [valor, esperado] of [
      ['12:00', '12:00'],
      ['07:30', '07:30'],
      ['23:59', '23:59'],
      ['24:00', null],
      ['12:60', null],
      ['9:00', null],
      ['mediodía', null],
    ]) {
      process.env.HORA_INICIO_AUTOMATICO = valor;
      assert.equal(demo.config().horaInicio, esperado, valor);
    }
  });

  test('UT-42 el ritmo de ventas simuladas ignora valores inválidos', () => {
    for (const [valor, esperado] of [
      ['2', 2],
      ['0.5', 0.5],
      ['0', 0.7],
      ['-3', 0.7],
      ['rapido', 0.7],
    ]) {
      process.env.DEMO_VENTAS_POR_MINUTO = valor;
      assert.equal(demo.config().ritmo, esperado, valor);
    }
  });

  test('UT-43 sin automatización activa no se crea el reloj', () => {
    assert.equal(demo.iniciarReloj(1000), null);
  });
});

test.describe('Inicio automático de la jornada', () => {
  test('UT-44 antes de la hora configurada no inicia nada ni consulta la base', async () => {
    assert.equal(await demo.iniciarSiCorresponde('12:00', '11:59'), 0);
    assert.equal(consultas.length, 0);
  });

  test('UT-45 después del cierre tampoco inicia', async () => {
    assert.equal(await demo.iniciarSiCorresponde('12:00', '15:30'), 0);
    assert.equal(consultas.length, 0);
  });

  test('UT-46 a la hora configurada inicia la jornada de cada sede con menú publicado', async () => {
    filasMenus = [{ id_sede: 1 }, { id_sede: 2 }];
    assert.equal(await demo.iniciarSiCorresponde('12:00', '12:00'), 2);
    assert.deepEqual(iniciadas, [1, 2]);
  });

  test('UT-47 si otra persona ya la inició (409) no falla ni la cuenta', async () => {
    filasMenus = [{ id_sede: 99 }, { id_sede: 3 }];
    assert.equal(await demo.iniciarSiCorresponde('12:00', '13:10'), 1);
    assert.deepEqual(iniciadas, [3]);
  });

  test('UT-48 la consulta solo considera menús publicados, sin jornada y con preparaciones', async () => {
    await demo.iniciarSiCorresponde('12:00', '12:30');
    const sql = consultas[0].sql;
    assert.match(sql, /m\.publicado/);
    assert.match(sql, /NOT EXISTS \(SELECT 1 FROM jornada/);
    assert.match(sql, /EXISTS \(SELECT 1 FROM menu_preparacion/);
  });
});

test.describe('Ventas simuladas para la demostración', () => {
  test('UT-49 vende según los minutos transcurridos menos lo ya simulado', async () => {
    filasJornadas = [{ id_jornada: 1, id_menu: 1, id_sede: 1, minutos: 10, simuladas: 3 }];
    filasPrincipales = [{ categoria: 'General', restante: 50 }];
    assert.equal(await demo.simularVentas(1), 7);
    assert.ok(ventas.every((v) => v.id_usuario === null && v.tipo_venta === 'combo'));
  });

  test('UT-50 nunca vende más de 25 por ronda', async () => {
    filasJornadas = [{ id_jornada: 1, id_menu: 1, id_sede: 1, minutos: 600, simuladas: 0 }];
    filasPrincipales = [{ categoria: 'General', restante: 500 }];
    assert.equal(await demo.simularVentas(1), 25);
  });

  test('UT-51 no vende categorías agotadas', async () => {
    filasJornadas = [{ id_jornada: 1, id_menu: 1, id_sede: 1, minutos: 30, simuladas: 0 }];
    filasPrincipales = [
      { categoria: 'General', restante: 0 },
      { categoria: 'JUNAEB', restante: 40 },
    ];
    await demo.simularVentas(1);
    assert.ok(ventas.length > 0);
    assert.ok(ventas.every((v) => v.categoria === 'JUNAEB'));
  });

  test('UT-52 si todo está agotado se detiene', async () => {
    filasJornadas = [{ id_jornada: 1, id_menu: 1, id_sede: 1, minutos: 30, simuladas: 0 }];
    filasPrincipales = [{ categoria: 'General', restante: 0 }];
    assert.equal(await demo.simularVentas(1), 0);
  });

  test('UT-53 si la categoría no admite postre o fruta, reintenta la venta sin opción', async () => {
    filasJornadas = [{ id_jornada: 1, id_menu: 1, id_sede: 1, minutos: 2, simuladas: 0 }];
    filasPrincipales = [{ categoria: 'JUNAEB', restante: 10 }];
    fallarVentaCon = 400;
    assert.equal(await demo.simularVentas(1), 2);
    assert.ok(ventas.every((v) => v.opcion === undefined));
  });

  test('UT-54 si la jornada se cerró a mitad de la ronda (409) se detiene sin error', async () => {
    filasJornadas = [{ id_jornada: 1, id_menu: 1, id_sede: 1, minutos: 10, simuladas: 0 }];
    filasPrincipales = [{ categoria: 'General', restante: 10 }];
    fallarVentaCon = 409;
    assert.equal(await demo.simularVentas(1), 0);
  });
});
