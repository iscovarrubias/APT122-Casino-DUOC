const test = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, pool, ADMIN } = require('../soporte/servidor');

let s;
let admin;
let alumno;

test.before(async () => {
  s = await arrancar();
  admin = await s.entrar(ADMIN.email, ADMIN.password);
  alumno = (await s.crearEstudiante('robustez')).token;
});
test.after(async () => {
  await s.cerrar();
  await pool.end();
});

const RUTAS_CON_ID = [
  ['PATCH', '/usuarios/:id', { nombre: 'x' }],
  ['PUT', '/usuarios/:id/password', { password: '12345678' }],
  ['PUT', '/preparaciones/:id', { nombre: 'x' }],
  ['PATCH', '/preparaciones/:id/desactivar'],
  ['PATCH', '/preparaciones/:id/reactivar'],
  ['DELETE', '/preparaciones/:id'],
  ['PUT', '/preparaciones/:id/alergenos', { alergenos: [] }],
  ['PUT', '/preparaciones/:id/nutricion', {}],
  ['GET', '/preparaciones/:id/opiniones'],
  ['PUT', '/ingredientes/:id', { nombre: 'x' }],
  ['DELETE', '/ingredientes/:id'],
  ['PATCH', '/menu/:id/publicar'],
  ['PATCH', '/menu/:id/despublicar'],
  ['PATCH', '/menu/componentes/:id', { cantidad_planificada: 5 }],
  ['DELETE', '/menu/componentes/:id'],
  ['PATCH', '/menu/componentes/:id/disponibilidad', { estado: 'agotado' }],
  ['GET', '/menu/componentes/:id/disponibilidad/historial'],
  ['POST', '/jornada/ventas/:id/anular'],
  ['POST', '/jornada/componentes/:id/stock', { quedan: 3 }],
];

const RUTAS_ESTUDIANTE = [
  ['PUT', '/estudiante/favoritos/:id', {}],
  ['DELETE', '/estudiante/favoritos/:id'],
  ['PUT', '/estudiante/calificaciones/:id', { estrellas: 4 }],
  ['DELETE', '/estudiante/calificaciones/:id'],
];

const IDS_INVALIDOS = ['abc', '1.5', '-1', '0', '99999999999999999999', "1'; DROP TABLE menu;--", '%20', 'NaN', '1e3'];

function revisarRespuesta(r, contexto) {
  assert.ok(r.s < 500, `${contexto} respondió ${r.s}: ${r.texto}`);
  assert.ok(r.d && typeof r.d === 'object', `${contexto} no respondió JSON`);
  if (r.s >= 400) {
    assert.equal(typeof r.d.error, 'string', `${contexto} sin mensaje de error`);
    assert.doesNotMatch(r.texto, /at \/|node_modules|stack|SELECT |INSERT |syntax error at|relation "|column "/i, `${contexto} filtró detalles internos`);
  }
}

test('ROB-01 ningún identificador inválido en las rutas del personal provoca un error 500', async () => {
  let casos = 0;
  for (const [metodo, ruta, cuerpo] of RUTAS_CON_ID) {
    for (const id of IDS_INVALIDOS) {
      const r = await s.api(metodo, ruta.replace(':id', encodeURIComponent(id)), cuerpo ?? (metodo === 'GET' || metodo === 'DELETE' ? undefined : {}), admin);
      revisarRespuesta(r, `${metodo} ${ruta} id=${id}`);
      casos += 1;
    }
  }
  assert.equal(casos, RUTAS_CON_ID.length * IDS_INVALIDOS.length);
});

test('ROB-02 ningún identificador inválido en las rutas del estudiante provoca un error 500', async () => {
  for (const [metodo, ruta, cuerpo] of RUTAS_ESTUDIANTE) {
    for (const id of IDS_INVALIDOS) {
      const r = await s.api(metodo, ruta.replace(':id', encodeURIComponent(id)), cuerpo, alumno);
      revisarRespuesta(r, `${metodo} ${ruta} id=${id}`);
      if (!['1e3'].includes(id)) assert.equal(r.s, 400, `${metodo} ${ruta} id=${id}`);
    }
  }
});

test('ROB-03 un identificador válido que no existe responde 404 o 400, nunca 500', async () => {
  for (const [metodo, ruta, cuerpo] of RUTAS_CON_ID) {
    const r = await s.api(metodo, ruta.replace(':id', '987654'), cuerpo ?? (metodo === 'GET' || metodo === 'DELETE' ? undefined : {}), admin);
    revisarRespuesta(r, `${metodo} ${ruta} id=987654`);
  }
});

const FECHAS_IMPOSIBLES = ['2026-02-30', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '26-11-20', '2026/11/20', 'hoy', "2026-11-20' OR '1'='1"];

test('ROB-04 las fechas imposibles se rechazan con 400 en todas las consultas por fecha', async () => {
  const consultas = [
    (f) => ['GET', `/menu/hoy?fecha=${encodeURIComponent(f)}`, null],
    (f) => ['GET', `/menu/historial?desde=${encodeURIComponent(f)}&hasta=2026-11-30`, null],
    (f) => ['GET', `/menu/planificacion?fecha=${encodeURIComponent(f)}`, admin],
    (f) => ['GET', `/analisis/resumen?desde=${encodeURIComponent(f)}&hasta=2026-11-30`, admin],
    (f) => ['GET', `/analisis/detalle?desde=${encodeURIComponent(f)}&hasta=2026-11-30`, admin],
  ];
  for (const fecha of FECHAS_IMPOSIBLES) {
    for (const armar of consultas) {
      const [metodo, ruta, token] = armar(fecha);
      const r = await s.api(metodo, ruta, undefined, token);
      revisarRespuesta(r, ruta);
      assert.equal(r.s, 400, `${ruta} aceptó una fecha imposible`);
    }
  }
});

test('ROB-05 planificar en una fecha imposible se rechaza sin tocar la base', async () => {
  const antes = (await pool.query('SELECT COUNT(*)::int AS n FROM menu')).rows[0].n;
  for (const fecha of ['2026-02-30', '2027-02-29']) {
    const r = await s.api('POST', '/menu/planificacion', { fecha, id_preparacion: 1, tipo_componente: 'Pan', cantidad_planificada: 5 }, admin);
    assert.equal(r.s, 400, fecha);
  }
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM menu')).rows[0].n, antes);
});

test('ROB-06 los meses imposibles se rechazan con 400', async () => {
  for (const mes of ['2026-13', '2026-00', '2026-1', 'noviembre']) {
    revisarRespuesta(await s.api('GET', `/menu/mes?mes=${mes}`, undefined, admin), `mes ${mes}`);
    const r = await s.api('GET', `/analisis/mensual?mes=${mes}`, undefined, admin);
    revisarRespuesta(r, `análisis ${mes}`);
    assert.equal(r.s, 400, `análisis aceptó ${mes}`);
  }
});

test('ROB-07 los límites de paginación absurdos no rompen la consulta', async () => {
  for (const limite of ['-5', '0', 'abc', '1e9', '2.7']) {
    const r = await s.api('GET', `/usuarios?limite=${limite}`, undefined, admin);
    assert.equal(r.s, 200, `limite=${limite}`);
    assert.ok(r.d.length <= 500);
  }
});

test('ROB-08 cuerpos con tipos equivocados responden 400 y no 500', async () => {
  const casos = [
    ['POST', '/usuarios', { nombre: 123, email: true, password: [], rol: {} }],
    ['POST', '/usuarios', { nombre: 'x', email: 'x@duocuc.cl', password: '12345678', rol: 'Rey' }],
    ['PATCH', '/usuarios/1', { activo: 'si' }],
    ['POST', '/preparaciones', { nombre: '', tipo: 'Pan' }],
    ['POST', '/preparaciones', { nombre: 'Algo', tipo: 'Comida espacial' }],
    ['POST', '/preparaciones', { nombre: 'Algo', tipo: 'Pan', ingredientes: 'no es lista' }],
    ['POST', '/preparaciones', { nombre: 'Algo', tipo: 'Pan', id_preparacion_base: 'abc' }],
    ['POST', '/menu/planificacion', { fecha: '2026-11-20', id_preparacion: 'abc', tipo_componente: 'Pan', cantidad_planificada: -3 }],
    ['POST', '/menu/copiar', { copias: 'todas' }],
    ['POST', '/jornada/ventas', { categoria: { $ne: 1 } }],
  ];
  for (const [metodo, ruta, cuerpo] of casos) {
    const r = await s.api(metodo, ruta, cuerpo, admin);
    revisarRespuesta(r, `${metodo} ${ruta} ${JSON.stringify(cuerpo)}`);
    assert.ok(r.s >= 400, `${metodo} ${ruta} aceptó ${JSON.stringify(cuerpo)}`);
  }
});

test('ROB-09 JSON mal formado responde 400 con un mensaje claro', async () => {
  for (const cuerpo of ['{"email": "a@duocuc.cl",', '{email: a}', '[1,2', 'null']) {
    const r = await s.api('POST', '/auth/login', cuerpo);
    revisarRespuesta(r, `JSON ${cuerpo}`);
    assert.equal(r.s, 400);
  }
});

test('ROB-10 rutas y métodos inexistentes responden 404 en JSON', async () => {
  for (const [metodo, ruta] of [['GET', '/nada'], ['DELETE', '/usuarios'], ['PUT', '/menu/hoy'], ['GET', '/../../etc/passwd']]) {
    const r = await s.api(metodo, ruta, undefined, admin);
    assert.equal(r.s, 404, `${metodo} ${ruta}`);
    assert.equal(typeof r.d.error, 'string');
  }
});
