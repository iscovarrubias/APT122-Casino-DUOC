const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'secreto-de-prueba-para-entra-123456789';
process.env.ENTRA_TENANT_ID = 'tenant-prueba';
process.env.ENTRA_CLIENT_ID = 'cliente-prueba';
process.env.ENTRA_REDIRECT_URI = 'http://localhost:3000/api/auth/microsoft/callback';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
let emitir = () => ({});
let servidor;

test.before(async () => {
  servidor = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url.endsWith('/discovery/v2.0/keys')) return res.end(JSON.stringify({ keys: [jwk] }));
    if (req.url.endsWith('/oauth2/v2.0/token')) {
      let cuerpo = '';
      req.on('data', (d) => { cuerpo += d; });
      req.on('end', () => {
        const p = new URLSearchParams(cuerpo);
        if (p.get('code') !== 'codigo-bueno' || !p.get('code_verifier')) { res.statusCode = 400; return res.end(JSON.stringify({ error_description: 'código inválido' })); }
        res.end(JSON.stringify({ id_token: emitir(p) }));
      });
      return;
    }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise((r) => servidor.listen(0, r));
  process.env.ENTRA_AUTORIDAD = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => servidor.close());

const entra = require('../src/utils/entra');
const firmar = (extra, opciones = {}) => jwt.sign(
  { email: 'ana@duocuc.cl', name: 'Ana', ...extra }, privateKey,
  { algorithm: 'RS256', keyid: 'k1', audience: 'cliente-prueba', issuer: `${process.env.ENTRA_AUTORIDAD}/tenant-prueba/v2.0`, ...opciones });

test('flujo completo: devuelve el correo verificado', async () => {
  const { url, cookie } = entra.iniciar('ana@duocuc.cl');
  const q = new URL(url).searchParams;
  assert.equal(q.get('code_challenge_method'), 'S256');
  assert.equal(q.get('login_hint'), 'ana@duocuc.cl');
  emitir = () => firmar({ nonce: q.get('nonce') });
  const r = await entra.completar({ code: 'codigo-bueno', state: q.get('state'), cookie });
  assert.equal(r.email, 'ana@duocuc.cl');
});

test('rechaza un state distinto', async () => {
  const { cookie } = entra.iniciar();
  await assert.rejects(entra.completar({ code: 'codigo-bueno', state: 'otro', cookie }), /estado/);
});

test('rechaza un nonce distinto', async () => {
  const { url, cookie } = entra.iniciar();
  const q = new URL(url).searchParams;
  emitir = () => firmar({ nonce: 'falso' });
  await assert.rejects(entra.completar({ code: 'codigo-bueno', state: q.get('state'), cookie }), /nonce/);
});

test('rechaza un token firmado con otra clave', async () => {
  const otra = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const { url, cookie } = entra.iniciar();
  const q = new URL(url).searchParams;
  emitir = () => jwt.sign({ email: 'x@duocuc.cl', nonce: q.get('nonce') }, otra, { algorithm: 'RS256', keyid: 'k1', audience: 'cliente-prueba', issuer: `${process.env.ENTRA_AUTORIDAD}/tenant-prueba/v2.0` });
  await assert.rejects(entra.completar({ code: 'codigo-bueno', state: q.get('state'), cookie }));
});

test('rechaza un token para otra aplicación', async () => {
  const { url, cookie } = entra.iniciar();
  const q = new URL(url).searchParams;
  emitir = () => firmar({ nonce: q.get('nonce') }, { audience: 'otra-app' });
  await assert.rejects(entra.completar({ code: 'codigo-bueno', state: q.get('state'), cookie }));
});

test('rechaza una cookie manipulada o ausente', async () => {
  await assert.rejects(entra.completar({ code: 'codigo-bueno', state: 'x', cookie: 'basura' }), /expiró/);
});

test('distingue alumnos, personal y desconocidos por dominio', () => {
  assert.equal(entra.esDominioEstudiante('a@duocuc.cl'), true);
  assert.equal(entra.esDominioEstudiante('a@duoc.cl'), false);
  assert.equal(entra.esDominioPersonal('ma.cobo@profesor.duoc.cl'), true);
  assert.equal(entra.esDominioPersonal('mlisboa@duoc.cl'), true);
  assert.equal(entra.esDominioPermitido('a@gmail.com'), false);
});
