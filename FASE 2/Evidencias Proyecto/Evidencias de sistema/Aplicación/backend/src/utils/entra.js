const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const ESTADO_MS = 10 * 60 * 1000;
const TICKET_MS = 60 * 1000;
const tickets = new Map();
let cacheClaves = { claves: null, hasta: 0 };

const lista = (texto) => texto.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

const config = () => ({
  tenant: process.env.ENTRA_TENANT_ID || '',
  clientId: process.env.ENTRA_CLIENT_ID || '',
  secreto: process.env.ENTRA_CLIENT_SECRET || '',
  redirectUri: process.env.ENTRA_REDIRECT_URI || '',
  frontend: (process.env.FRONTEND_URL || (process.env.CORS_ORIGIN || '').split(',')[0] || 'http://localhost:5173').replace(/\/$/, ''),
  estudiantes: lista(process.env.ENTRA_DOMINIOS_ESTUDIANTES || process.env.ENTRA_DOMINIOS || 'duocuc.cl'),
  personal: lista(process.env.ENTRA_DOMINIOS_PERSONAL || 'duoc.cl,profesor.duoc.cl'),
});

const habilitado = () => {
  const c = config();
  return Boolean(c.tenant && c.clientId && c.redirectUri);
};

function problemaDeConfiguracion() {
  const c = config();
  const definidas = [c.tenant, c.clientId, c.redirectUri].filter(Boolean).length;
  if (definidas === 0) return null;
  if (definidas < 3) return 'La configuración de Microsoft está incompleta: se necesitan ENTRA_TENANT_ID, ENTRA_CLIENT_ID y ENTRA_REDIRECT_URI.';
  if (process.env.NODE_ENV === 'production' && !process.env.ENTRA_AUTORIDAD && !c.redirectUri.startsWith('https://')) {
    return 'ENTRA_REDIRECT_URI debe usar https en producción.';
  }
  return null;
}

const AUTORIDAD = () => (process.env.ENTRA_AUTORIDAD || 'https://login.microsoftonline.com').replace(/\/$/, '');
const base = (c) => `${AUTORIDAD()}/${encodeURIComponent(c.tenant)}`;
const b64url = (buf) => buf.toString('base64url');

const dominioDe = (email) => String(email).split('@')[1]?.toLowerCase();
const esDominioEstudiante = (email) => config().estudiantes.includes(dominioDe(email));
const esDominioPersonal = (email) => config().personal.includes(dominioDe(email));
const esDominioPermitido = (email) => esDominioEstudiante(email) || esDominioPersonal(email);

function iniciar(loginHint) {
  const c = config();
  const verificador = b64url(crypto.randomBytes(48));
  const state = b64url(crypto.randomBytes(24));
  const nonce = b64url(crypto.randomBytes(24));
  const desafio = b64url(crypto.createHash('sha256').update(verificador).digest());
  const params = new URLSearchParams({
    client_id: c.clientId,
    response_type: 'code',
    redirect_uri: c.redirectUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state, nonce,
    code_challenge: desafio,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  if (loginHint) params.set('login_hint', loginHint);
  const cookie = jwt.sign({ v: verificador, s: state, n: nonce }, process.env.JWT_SECRET, { expiresIn: Math.floor(ESTADO_MS / 1000) });
  return { url: `${base(c)}/oauth2/v2.0/authorize?${params}`, cookie };
}

async function claves(c) {
  if (cacheClaves.claves && cacheClaves.hasta > Date.now()) return cacheClaves.claves;
  const r = await fetch(`${base(c)}/discovery/v2.0/keys`);
  if (!r.ok) throw new Error('No se pudieron obtener las claves de Microsoft.');
  const { keys } = await r.json();
  cacheClaves = { claves: keys, hasta: Date.now() + 60 * 60 * 1000 };
  return keys;
}

async function validarIdToken(idToken, nonce, c) {
  const { header } = jwt.decode(idToken, { complete: true }) || {};
  const jwk = (await claves(c)).find((k) => k.kid === header?.kid);
  if (!jwk) throw new Error('Clave de firma desconocida.');
  const pem = crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
  const datos = jwt.verify(idToken, pem, {
    algorithms: ['RS256'],
    audience: c.clientId,
    issuer: `${AUTORIDAD()}/${c.tenant}/v2.0`,
  });
  if (datos.nonce !== nonce) throw new Error('El nonce no coincide.');
  return datos;
}

async function completar({ code, state, cookie }) {
  const c = config();
  let guardado;
  try { guardado = jwt.verify(cookie || '', process.env.JWT_SECRET); } catch { throw new Error('La sesión de acceso expiró.'); }
  if (!state || state !== guardado.s) throw new Error('El estado no coincide.');

  const cuerpo = new URLSearchParams({
    client_id: c.clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: c.redirectUri,
    code_verifier: guardado.v,
  });
  if (c.secreto) cuerpo.set('client_secret', c.secreto);
  const r = await fetch(`${base(c)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.id_token) throw new Error(datos.error_description || 'Microsoft rechazó el código.');

  const claims = await validarIdToken(datos.id_token, guardado.n, c);
  const email = String(claims.email || claims.preferred_username || claims.upn || '').trim().toLowerCase();
  if (!email.includes('@')) throw new Error('Microsoft no entregó un correo.');
  return { email, nombre: claims.name || '' };
}

function crearTicket(sesion) {
  const id = b64url(crypto.randomBytes(24));
  tickets.set(id, { sesion, expira: Date.now() + TICKET_MS });
  for (const [k, t] of tickets) if (t.expira <= Date.now()) tickets.delete(k);
  return id;
}

function canjearTicket(id) {
  const t = tickets.get(id);
  tickets.delete(id);
  return t && t.expira > Date.now() ? t.sesion : null;
}

module.exports = { config, habilitado, problemaDeConfiguracion, iniciar, completar, esDominioPermitido, esDominioEstudiante, esDominioPersonal, crearTicket, canjearTicket };
