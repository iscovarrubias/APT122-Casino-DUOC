process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://nadie@127.0.0.1:1/ninguna';
process.env.JWT_SECRET = 'secreto-exclusivo-para-pruebas-automatizadas';
process.env.NODE_ENV = 'test';
process.env.SSO_SIMULADO = 'false';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const app = require('../src/app');
const { crearLimitadorDeFallos } = require('../src/middleware/limitador');

let servidor; let base;
test.before(async () => {
  servidor = http.createServer(app);
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => new Promise((r) => servidor.close(r)));

test('CP-40 la API responde y envía encabezados de seguridad', async () => {
  const r = await fetch(`${base}/api/health`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('CP-41 una ruta desconocida devuelve 404 en JSON', async () => {
  const r = await fetch(`${base}/api/no-existe`);
  assert.equal(r.status, 404);
  assert.ok((await r.json()).error);
});

test('CP-42 las rutas del personal exigen sesión', async () => {
  for (const ruta of ['/api/usuarios', '/api/preparaciones/gestion', '/api/jornada/hoy', '/api/analisis/mensual']) {
    const r = await fetch(base + ruta);
    assert.equal(r.status, 401, ruta);
  }
});

test('CP-43 un token inválido o manipulado se rechaza', async () => {
  const r = await fetch(`${base}/api/usuarios`, { headers: { Authorization: 'Bearer abc.def.ghi' } });
  assert.equal(r.status, 401);
});

test('CP-44 el inicio de sesión rechaza cuerpos vacíos sin romperse', async () => {
  const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.ok([400, 401].includes(r.status));
});

test('CP-45 el inicio de sesión DUOC está apagado si no se habilita', async () => {
  const r = await fetch(`${base}/api/auth/duoc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x@duocuc.cl' }) });
  assert.equal(r.status, 404);
});

test('CP-46 el limitador bloquea tras demasiados fallos y se libera con un acierto', () => {
  const limitador = crearLimitadorDeFallos({ ventanaMs: 60000, maximo: 2, clave: () => 'k', mensaje: 'bloqueado' });
  const llamar = (status) => {
    let corte = null; let fin;
    const res = { statusCode: status, set() {}, status(c) { corte = c; return this; }, json() { return this; }, on(ev, fn) { if (ev === 'finish') fin = fn; } };
    let siguio = false;
    limitador({}, res, () => { siguio = true; });
    if (siguio && fin) fin();
    return corte;
  };
  assert.equal(llamar(401), null);
  assert.equal(llamar(401), null);
  assert.equal(llamar(401), 429);
});

function arrancar(env) {
  return spawnSync(process.execPath, [path.join(__dirname, '../src/app.js')], {
    cwd: require('node:os').tmpdir(), env: { PATH: process.env.PATH, ...env }, encoding: 'utf8', timeout: 8000,
  });
}

test('CP-47 en producción no arranca con SSO simulado, secreto corto o sin CORS', () => {
  const buenos = { NODE_ENV: 'production', DATABASE_URL: 'postgres://x@127.0.0.1:1/x', JWT_SECRET: 'a'.repeat(40), CORS_ORIGIN: 'https://casino.example' };
  const sso = arrancar({ ...buenos, SSO_SIMULADO: 'true' });
  assert.equal(sso.status, 1);
  assert.match(sso.stderr, /SSO_SIMULADO/);
  const corto = arrancar({ ...buenos, JWT_SECRET: 'corto' });
  assert.equal(corto.status, 1);
  assert.match(corto.stderr, /32 caracteres/);
  const sinCors = arrancar({ ...buenos, CORS_ORIGIN: '' });
  assert.equal(sinCors.status, 1);
  assert.match(sinCors.stderr, /CORS_ORIGIN/);
});

test('CP-48 sin JWT_SECRET el servidor no arranca', () => {
  const r = arrancar({ DATABASE_URL: 'postgres://x@127.0.0.1:1/x' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /JWT_SECRET/);
});
