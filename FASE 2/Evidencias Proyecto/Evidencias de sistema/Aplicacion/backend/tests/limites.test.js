process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://nadie@127.0.0.1:1/ninguna';
process.env.JWT_SECRET = 'secreto-exclusivo-para-pruebas-automatizadas';
process.env.NODE_ENV = 'test';
process.env.SSO_SIMULADO = 'false';
process.env.LIMITE_API_POR_MINUTO = '5';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const { esCorreoValido } = require('../src/utils/validarCorreo');

let servidor;
let base;
test.before(async () => {
  servidor = http.createServer(app);
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => new Promise((r) => servidor.close(r)));

test('el límite general de la API responde 429 al superar las solicitudes por minuto', async () => {
  const estados = [];
  for (let i = 0; i < 6; i++) estados.push((await fetch(`${base}/api/health`)).status);
  assert.deepEqual(estados.slice(0, 5), [200, 200, 200, 200, 200]);
  assert.equal(estados[5], 429);
  const r = await fetch(`${base}/api/health`);
  assert.ok(r.headers.get('retry-after'));
  assert.ok((await r.json()).error);
});

test('esCorreoValido acepta correos normales', () => {
  for (const c of ['ana@duocuc.cl', 'j.perez@profesor.duoc.cl', 'a+b@sub.dominio.com']) assert.equal(esCorreoValido(c), true, c);
});

test('esCorreoValido rechaza correos mal formados', () => {
  for (const c of ['', 'sin-arroba', 'a@b', 'a@b.', 'a@.cl', 'a@b..cl', 'a b@c.cl', 'a@@b.cl', null, 42])
    assert.equal(esCorreoValido(c), false, String(c));
});

test('esCorreoValido rechaza al instante un texto malicioso muy largo', () => {
  const ataque = 'a@' + 'a.'.repeat(50000) + '!';
  const inicio = process.hrtime.bigint();
  assert.equal(esCorreoValido(ataque), false);
  assert.equal(esCorreoValido('a@' + 'b'.repeat(250) + '.cl'), false);
  assert.ok(Number(process.hrtime.bigint() - inicio) / 1e6 < 50);
});
