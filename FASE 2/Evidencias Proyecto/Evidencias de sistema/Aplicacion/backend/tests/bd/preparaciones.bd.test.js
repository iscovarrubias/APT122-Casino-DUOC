const test = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, pool, ADMIN } = require('../soporte/servidor');

let s;
let admin;
const creadas = [];
const sufijo = `${Date.now()}`;

test.before(async () => {
  s = await arrancar();
  admin = await s.entrar(ADMIN.email, ADMIN.password);
});
test.after(async () => {
  for (const id of creadas.reverse()) await pool.query('DELETE FROM preparacion WHERE id_preparacion = $1', [id]).catch(() => {});
  await s.cerrar();
  await pool.end();
});

async function crear(datos) {
  const r = await s.api('POST', '/preparaciones', datos, admin);
  if (r.s === 201) creadas.push(r.d.id_preparacion);
  return r;
}

const gestion = async () => (await s.api('GET', '/preparaciones/gestion', undefined, admin)).d;

test('PRE-01 se pueden crear preparaciones de los 8 tipos del menú', async () => {
  for (const tipo of ['Plato Principal', 'Entrada', 'Ensalada', 'Sopa', 'Pan', 'Postre', 'Fruta', 'Bebida']) {
    const r = await crear({ nombre: `${tipo} ${sufijo}`, tipo, ingredientes: ['Sal'] });
    assert.equal(r.s, 201, `${tipo}: ${r.texto}`);
  }
});

test('PRE-02 un tipo que no existe se rechaza con la lista de tipos válidos', async () => {
  const r = await crear({ nombre: `Raro ${sufijo}`, tipo: 'Snack' });
  assert.equal(r.s, 400);
  assert.match(r.d.error, /Plato Principal/);
});

test('PRE-03 una variación queda enlazada a su receta original y la original no cambia', async () => {
  const original = await crear({
    nombre: `Cazuela ${sufijo}`, tipo: 'Plato Principal', porciones_receta: 10,
    ingredientes: ['Zapallo', 'Papa', 'Choclo'],
  });
  assert.equal(original.s, 201, original.texto);
  const antes = (await gestion()).find((p) => p.id_preparacion === original.d.id_preparacion);

  const variacion = await crear({
    nombre: `Cazuela ${sufijo} (variación)`, tipo: 'Plato Principal', porciones_receta: 10,
    ingredientes: ['Zapallo', 'Papa', 'Arroz'], id_preparacion_base: original.d.id_preparacion,
  });
  assert.equal(variacion.s, 201, variacion.texto);

  const lista = await gestion();
  const v = lista.find((p) => p.id_preparacion === variacion.d.id_preparacion);
  const o = lista.find((p) => p.id_preparacion === original.d.id_preparacion);
  assert.equal(v.id_preparacion_base, original.d.id_preparacion);
  assert.equal(v.base_nombre, `Cazuela ${sufijo}`);
  assert.ok(v.ingredientes.some((i) => /arroz/i.test(i.nombre ?? i)));
  assert.deepEqual(o.ingredientes, antes.ingredientes);
  assert.equal(o.id_preparacion_base, null);
});

test('PRE-04 se puede crear una variación de otra variación', async () => {
  const raiz = await crear({ nombre: `Porotos ${sufijo}`, tipo: 'Plato Principal' });
  const hija = await crear({ nombre: `Porotos ${sufijo} sin longaniza`, tipo: 'Plato Principal', id_preparacion_base: raiz.d.id_preparacion });
  const nieta = await crear({ nombre: `Porotos ${sufijo} sin longaniza con riendas`, tipo: 'Plato Principal', id_preparacion_base: hija.d.id_preparacion });
  assert.equal(nieta.s, 201, nieta.texto);
  const n = (await gestion()).find((p) => p.id_preparacion === nieta.d.id_preparacion);
  assert.equal(n.id_preparacion_base, hija.d.id_preparacion);
});

test('PRE-05 una variación de una receta que no existe se rechaza y no se crea nada', async () => {
  const antes = (await pool.query('SELECT COUNT(*)::int AS n FROM preparacion')).rows[0].n;
  const r = await crear({ nombre: `Huérfana ${sufijo}`, tipo: 'Postre', id_preparacion_base: 987654 });
  assert.equal(r.s, 400);
  assert.match(r.d.error, /original/i);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM preparacion')).rows[0].n, antes);
});

test('PRE-06 identificadores de receta original inválidos se rechazan con 400', async () => {
  for (const id of ['abc', 0, -3, 1.5]) {
    const r = await crear({ nombre: `Inválida ${sufijo} ${id}`, tipo: 'Postre', id_preparacion_base: id });
    assert.equal(r.s, 400, `id_preparacion_base=${id}`);
  }
});

test('PRE-07 si se borra la receta original, la variación sigue existiendo sin enlace', async () => {
  const base = await crear({ nombre: `Base borrable ${sufijo}`, tipo: 'Postre' });
  const hija = await crear({ nombre: `Hija ${sufijo}`, tipo: 'Postre', id_preparacion_base: base.d.id_preparacion });
  await pool.query('DELETE FROM preparacion WHERE id_preparacion = $1', [base.d.id_preparacion]);
  const h = (await gestion()).find((p) => p.id_preparacion === hija.d.id_preparacion);
  assert.ok(h, 'la variación desapareció');
  assert.equal(h.id_preparacion_base, null);
});

test('PRE-08 los gramos por ingrediente quedan guardados en la receta', async () => {
  const ingrediente = (await pool.query('SELECT id_ingrediente FROM ingrediente ORDER BY id_ingrediente LIMIT 1')).rows[0];
  const r = await crear({
    nombre: `Con gramos ${sufijo}`, tipo: 'Ensalada', porciones_receta: 4,
    ingredientes: [{ id_ingrediente: ingrediente.id_ingrediente, cantidad_g: 250 }],
  });
  assert.equal(r.s, 201, r.texto);
  const p = (await gestion()).find((x) => x.id_preparacion === r.d.id_preparacion);
  const detalle = p.ingredientes_detalle.find((d) => d.id_ingrediente === ingrediente.id_ingrediente);
  assert.equal(Number(detalle.cantidad_g), 250);
});

test('PRE-09 una foto subida se guarda en la base y se sirve con su tipo y cabeceras seguras', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c40000000049454e44ae426082', 'hex');
  const formulario = new FormData();
  formulario.append('imagen', new Blob([png], { type: 'image/png' }), 'pixel.png');
  const subida = await s.api('POST', '/preparaciones/imagen', formulario, admin);
  assert.equal(subida.s, 201, subida.texto);
  assert.match(subida.d.imagen_url, /^\/api\/imagenes\/[0-9a-f-]{36}$/);

  const r = await fetch(s.base.replace(/\/api$/, '') + subida.d.imagen_url);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  assert.match(r.headers.get('content-security-policy'), /sandbox/);
  assert.match(r.headers.get('cache-control'), /immutable/);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), png);
  await pool.query('DELETE FROM imagen WHERE id_imagen = $1', [subida.d.imagen_url.split('/').pop()]).catch(() => {});
});

test('PRE-10 pedir una imagen con un id inventado o malicioso responde 404', async () => {
  for (const id of ['no-existe', '00000000-0000-0000-0000-000000000000', '../../etc/passwd', "1' OR '1'='1"]) {
    const r = await s.api('GET', `/imagenes/${encodeURIComponent(id)}`);
    assert.equal(r.s, 404, id);
  }
});
