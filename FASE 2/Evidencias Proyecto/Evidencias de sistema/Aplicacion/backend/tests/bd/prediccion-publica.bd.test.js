const test = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, pool, ADMIN, limpiarHoy, prepararJornadaHoy } = require('../soporte/servidor');

let s;
let admin;

test.before(async () => {
  s = await arrancar();
  admin = await s.entrar(ADMIN.email, ADMIN.password);
});
test.after(async () => {
  await limpiarHoy();
  await s.cerrar();
  await pool.end();
});

test('PPU-01 sin jornada abierta la estimación pública viene vacía y no pide sesión', async () => {
  await limpiarHoy();
  const r = await s.api('GET', '/prediccion/publica');
  assert.equal(r.s, 200);
  assert.deepEqual(r.d.categorias, []);
});

test('PPU-02 con la jornada abierta entrega una estimación por categoría sin datos internos', async () => {
  await prepararJornadaHoy(s.api, admin, { porciones: 40, iniciar: true });
  for (let i = 0; i < 6; i += 1) {
    const v = await s.api('POST', '/jornada/ventas', { categoria: 'JUNAEB' }, admin);
    assert.equal(v.s, 201, v.texto);
  }
  const r = await s.api('GET', '/prediccion/publica');
  assert.equal(r.s, 200);
  assert.ok(r.d.categorias.length > 0);
  for (const c of r.d.categorias) {
    assert.ok(['se_agota', 'alcanza', 'agotado'].includes(c.estado), JSON.stringify(c));
    if (c.estado === 'se_agota') assert.match(c.hora, /^\d{2}:[0-5][05]$/);
    assert.equal('vendidas' in c, false);
    assert.equal('restante' in c, false);
  }
});

test('PPU-03 un plato agotado aparece como agotado en la estimación pública', async () => {
  const estado = (await s.api('GET', '/jornada/hoy', undefined, admin)).d;
  const junaeb = estado.componentes.find((c) => c.categoria === 'JUNAEB' && c.componente === 'Plato Principal');
  const ajuste = await s.api('POST', `/jornada/componentes/${junaeb.id_menu_preparacion}/stock`, { accion: 'quedan', cantidad: 0 }, admin);
  assert.equal(ajuste.s, 200, ajuste.texto);
  const r = await s.api('GET', '/prediccion/publica');
  assert.equal(r.d.categorias.find((c) => c.categoria === 'JUNAEB')?.estado, 'agotado');
});
