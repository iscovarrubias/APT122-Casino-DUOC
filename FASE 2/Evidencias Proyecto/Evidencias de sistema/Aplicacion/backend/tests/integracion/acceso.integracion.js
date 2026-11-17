require('../soporte/entorno');
process.env.SSO_SIMULADO = 'true';
process.env.ENTRA_TENANT_ID = '';
process.env.ENTRA_CLIENT_ID = '';
process.env.ENTRA_REDIRECT_URI = '';
process.env.LIMITE_IDENTIFICAR_POR_IP = '8';
const assert = require('node:assert/strict');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const entra = require('../../src/utils/entra');

const PUERTO = 3059;
const URL = `http://localhost:${PUERTO}/api`;
const llamar = async (m, p, body) => {
  const r = await fetch(URL + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) };
};
const ok = (n) => console.log('OK  ', n);

const servidor = app.listen(PUERTO, async () => {
  try {
    const sesion = { token: 't', kiosco: false, usuario: { id_usuario: 1, rol: 'Estudiante' } };

    const ticket = await entra.crearTicket(sesion);
    assert.deepEqual(await entra.canjearTicket(ticket), sesion);
    assert.equal(await entra.canjearTicket(ticket), null); ok('un ticket de acceso se puede canjear una sola vez');

    await pool.query("INSERT INTO ticket_acceso (id, sesion, expira_en) VALUES ('vencido', '{}', NOW() - INTERVAL '1 minute')");
    assert.equal(await entra.canjearTicket('vencido'), null); ok('un ticket vencido no sirve');

    const t2 = await entra.crearTicket(sesion);
    const canje = await llamar('POST', '/auth/microsoft/canje', { ticket: t2 });
    assert.equal(canje.s, 200); assert.equal(canje.d.usuario.rol, 'Estudiante');
    assert.equal((await llamar('POST', '/auth/microsoft/canje', { ticket: t2 })).s, 401);
    assert.equal((await llamar('POST', '/auth/microsoft/canje', { ticket: 'x'.repeat(200) })).s, 401);
    assert.equal((await llamar('POST', '/auth/microsoft/canje', {})).s, 401); ok('el canje por la API entrega la sesión una vez y rechaza tickets inválidos');

    assert.equal((await llamar('POST', '/auth/identificar', { email: 'admin@duocuc.cl' })).d.metodo, 'clave');
    assert.equal((await llamar('POST', '/auth/identificar', { email: 'alumno.nuevo@duocuc.cl' })).d.metodo, 'duoc');
    assert.equal((await llamar('POST', '/auth/identificar', { email: 'alguien@gmail.com' })).s, 400);
    assert.equal((await llamar('POST', '/auth/identificar', { email: 'no-es-correo' })).s, 400); ok('el correo define el método de acceso y se rechazan los correos ajenos');

    let bloqueo = null;
    for (let i = 0; i < 10 && !bloqueo; i++) {
      const r = await llamar('POST', '/auth/identificar', { email: `prueba${i}@duocuc.cl` });
      if (r.s === 429) bloqueo = i;
    }
    assert.notEqual(bloqueo, null); ok('consultar demasiados correos seguidos se bloquea (429)');

    await pool.query("DELETE FROM ticket_acceso WHERE id = 'vencido'");
    console.log('\nTODO OK');
  } catch (e) { console.error('FALLO:', e.stack || e.message); process.exitCode = 1; }
  servidor.close(); await pool.end(); setTimeout(() => process.exit(), 200);
});
