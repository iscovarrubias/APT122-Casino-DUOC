process.env.TOKEN_TAREAS = 'token-de-tareas-para-pruebas-0123456789';
process.env.CORREO_MODO = 'registro';
const test = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, pool, ADMIN } = require('../soporte/servidor');
const { ultimosRegistrados } = require('../../src/utils/correo');

const sumar = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
const base = sumar(new Date().toISOString().slice(0, 10), 70);
const DOMINGO = sumar(base, (7 - new Date(`${base}T12:00:00Z`).getUTCDay()) % 7);
const LUNES = sumar(DOMINGO, 1);
const MARTES = sumar(DOMINGO, 2);
const DIAS = [LUNES, MARTES, sumar(DOMINGO, 3)];
const TAREA = { headers: { Authorization: `Bearer ${process.env.TOKEN_TAREAS}` } };

let s;
let admin;
let idPastel;

async function limpiarFechas() {
  const fechas = [...DIAS];
  await pool.query('DELETE FROM correo_enviado WHERE clave = ANY($1)', [[LUNES, ...fechas]]);
  await pool.query('DELETE FROM menu_preparacion WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = ANY($1))', [fechas]);
  await pool.query('DELETE FROM menu WHERE fecha = ANY($1)', [fechas]);
}

async function publicar(fecha, nombrePlato) {
  const preps = (await s.api('GET', '/preparaciones/gestion', undefined, admin)).d;
  const id = (n) => preps.find((p) => p.nombre === n).id_preparacion;
  const plan = [
    [nombrePlato, 'Plato Principal', 'General'],
    ['Arroz con pollo', 'Plato Principal', 'JUNAEB'],
    ['Budín de zapallito italiano', 'Plato Principal', 'Vegetariano'],
    ['Pollo a la plancha con ensalada', 'Plato Principal', 'Hipocalórico'],
    ['Ensalada chilena', 'Ensalada'],
    ['Sopa de verduras', 'Sopa'],
    ['Pan amasado', 'Pan'],
    ['Flan de caramelo', 'Postre'],
    ['Manzana', 'Fruta'],
    ['Jugo de naranja', 'Bebida'],
  ];
  let idMenu;
  for (const [n, tipo, categoria] of plan) {
    const r = await s.api(
      'POST',
      '/menu/planificacion',
      { fecha, id_preparacion: id(n), tipo_componente: tipo, categoria, cantidad_planificada: 20 },
      admin
    );
    assert.equal(r.s, 201, r.texto);
    idMenu = r.d.menu.id_menu;
  }
  const p = await s.api('PATCH', `/menu/${idMenu}/publicar`, undefined, admin);
  assert.equal(p.s, 200, p.texto);
}

const enviados = async (id_usuario) =>
  (await pool.query('SELECT tipo, clave, asunto FROM correo_enviado WHERE id_usuario = $1 ORDER BY id_correo', [id_usuario])).rows;

test.before(async () => {
  s = await arrancar();
  admin = await s.entrar(ADMIN.email, ADMIN.password);
  await pool.query('UPDATE preferencia_correo SET menu_semanal = FALSE, avisos_favoritos = FALSE');
  await limpiarFechas();
  await publicar(DIAS[0], 'Pastel de choclo');
  await publicar(DIAS[1], 'Cazuela de vacuno');
  idPastel = (await s.api('GET', '/preparaciones/gestion', undefined, admin)).d.find((p) => p.nombre === 'Pastel de choclo').id_preparacion;
});
test.after(async () => {
  await limpiarFechas();
  await s.cerrar();
  await pool.end();
});

test('CRE-01 las preferencias vienen desactivadas y solo el estudiante las ve', async () => {
  const alumno = await s.crearEstudiante('alumno.cre1');
  const r = await s.api('GET', '/estudiante/correos', undefined, alumno.token);
  assert.equal(r.s, 200);
  assert.deepEqual(r.d, { menu_semanal: false, avisos_favoritos: false });
  assert.equal((await s.api('GET', '/estudiante/correos', undefined, admin)).s, 403);
  assert.equal((await s.api('GET', '/estudiante/correos')).s, 401);
});

test('CRE-02 guardar exige valores verdadero o falso', async () => {
  const alumno = await s.crearEstudiante('alumno.cre2');
  assert.equal((await s.api('PUT', '/estudiante/correos', { menu_semanal: 'si', avisos_favoritos: true }, alumno.token)).s, 400);
  assert.equal((await s.api('PUT', '/estudiante/correos', {}, alumno.token)).s, 400);
  const ok = await s.api('PUT', '/estudiante/correos', { menu_semanal: true, avisos_favoritos: false }, alumno.token);
  assert.equal(ok.s, 200);
  assert.deepEqual(ok.d, { menu_semanal: true, avisos_favoritos: false });
});

test('CRE-03 las tareas programadas exigen el token y no aceptan uno incorrecto', async () => {
  assert.equal((await s.api('POST', '/correos/tareas/semanal')).s, 401);
  assert.equal(
    (
      await s.api('POST', '/correos/tareas/semanal', {}, undefined, {
        headers: { Authorization: 'Bearer otro-token-que-no-es-el-correcto-123' },
      })
    ).s,
    401
  );
  assert.equal((await s.api('POST', '/correos/tareas/semanal', {}, admin)).s, 401);
  assert.equal((await s.api('POST', '/correos/tareas/diaria', { fecha: '2026-13-40' }, undefined, TAREA)).s, 400);
});

test('CRE-04 el envío semanal elige un solo correo por estudiante y no se repite', async () => {
  const ambos = await s.crearEstudiante('alumno.ambos');
  const soloFav = await s.crearEstudiante('alumno.solofav');
  const soloMenu = await s.crearEstudiante('alumno.solomenu');
  const favSinCoincidir = await s.crearEstudiante('alumno.sincoincidir');
  for (const a of [ambos, soloFav]) await s.api('PUT', `/estudiante/favoritos/${idPastel}`, undefined, a.token);
  await s.api('PUT', '/estudiante/correos', { menu_semanal: true, avisos_favoritos: true }, ambos.token);
  await s.api('PUT', '/estudiante/correos', { menu_semanal: false, avisos_favoritos: true }, soloFav.token);
  await s.api('PUT', '/estudiante/correos', { menu_semanal: true, avisos_favoritos: false }, soloMenu.token);
  await s.api('PUT', '/estudiante/correos', { menu_semanal: false, avisos_favoritos: true }, favSinCoincidir.token);

  const r = await s.api('POST', '/correos/tareas/semanal', { fecha: DOMINGO }, undefined, TAREA);
  assert.equal(r.s, 200, r.texto);
  assert.equal(r.d.clave, LUNES);
  assert.equal(r.d.modo, 'registro');

  assert.deepEqual(
    (await enviados(ambos.id_usuario)).map((e) => e.tipo),
    ['semanal']
  );
  assert.match((await enviados(ambos.id_usuario))[0].asunto, /incluye tus favoritos/);
  assert.deepEqual(
    (await enviados(soloFav.id_usuario)).map((e) => e.tipo),
    ['favoritos_semana']
  );
  assert.deepEqual(
    (await enviados(soloMenu.id_usuario)).map((e) => e.tipo),
    ['semanal']
  );
  assert.deepEqual(await enviados(favSinCoincidir.id_usuario), []);
  assert.ok(ultimosRegistrados().some((c) => c.para === ambos.email));

  const otra = await s.api('POST', '/correos/tareas/semanal', { fecha: DOMINGO }, undefined, TAREA);
  assert.equal(otra.d.enviados, 0);
  assert.ok(otra.d.repetidos >= 3);
  assert.equal((await enviados(ambos.id_usuario)).length, 1);
});

test('CRE-05 el aviso del día llega solo cuando el favorito se sirve ese día', async () => {
  const alumno = await s.crearEstudiante('alumno.diario');
  await s.api('PUT', `/estudiante/favoritos/${idPastel}`, undefined, alumno.token);
  await s.api('PUT', '/estudiante/correos', { menu_semanal: false, avisos_favoritos: true }, alumno.token);
  await s.api('POST', '/correos/tareas/diaria', { fecha: MARTES }, undefined, TAREA);
  assert.deepEqual(await enviados(alumno.id_usuario), []);
  const r = await s.api('POST', '/correos/tareas/diaria', { fecha: LUNES }, undefined, TAREA);
  assert.equal(r.s, 200);
  const lista = await enviados(alumno.id_usuario);
  assert.deepEqual(
    lista.map((e) => [e.tipo, e.clave]),
    [['favorito_dia', LUNES]]
  );
  assert.equal(lista[0].asunto, 'Hoy hay Pastel de choclo, tu favorito');
  await s.api('POST', '/correos/tareas/diaria', { fecha: LUNES }, undefined, TAREA);
  assert.equal((await enviados(alumno.id_usuario)).length, 1);
});

test('CRE-06 el fin de semana o sin menú publicado no se envía nada', async () => {
  const finde = await s.api('POST', '/correos/tareas/diaria', { fecha: DOMINGO }, undefined, TAREA);
  assert.equal(finde.d.enviados, 0);
  assert.match(finde.d.motivo, /fines de semana/);
  const sinMenu = await s.api('POST', '/correos/tareas/semanal', { fecha: '2030-01-06' }, undefined, TAREA);
  assert.equal(sinMenu.d.enviados, 0);
  assert.match(sinMenu.d.motivo, /No hay menú publicado/);
});

test('CRE-07 un estudiante desactivado no recibe correos', async () => {
  const alumno = await s.crearEstudiante('alumno.inactivo');
  await s.api('PUT', '/estudiante/correos', { menu_semanal: true, avisos_favoritos: false }, alumno.token);
  await pool.query('UPDATE usuario SET activo = FALSE WHERE id_usuario = $1', [alumno.id_usuario]);
  await pool.query("DELETE FROM correo_enviado WHERE clave = $1 AND tipo = 'semanal'", [LUNES]);
  await s.api('POST', '/correos/tareas/semanal', { fecha: DOMINGO }, undefined, TAREA);
  assert.deepEqual(await enviados(alumno.id_usuario), []);
});

test('CRE-08 el enlace de baja desactiva todo con un clic y uno inválido no hace nada', async () => {
  const alumno = await s.crearEstudiante('alumno.baja');
  await s.api('PUT', '/estudiante/correos', { menu_semanal: true, avisos_favoritos: true }, alumno.token);
  const token = (await pool.query('SELECT token_baja::text AS t FROM preferencia_correo WHERE id_usuario = $1', [alumno.id_usuario]))
    .rows[0].t;
  const r = await s.api('GET', `/correos/baja?token=${token}`);
  assert.equal(r.s, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.match(r.texto, /ya no recibirás correos/);
  assert.deepEqual((await s.api('GET', '/estudiante/correos', undefined, alumno.token)).d, {
    menu_semanal: false,
    avisos_favoritos: false,
  });
  assert.equal((await s.api('GET', '/correos/baja?token=00000000-0000-0000-0000-000000000000')).s, 404);
  assert.equal((await s.api('GET', "/correos/baja?token=' OR 1=1 --")).s, 404);
});
