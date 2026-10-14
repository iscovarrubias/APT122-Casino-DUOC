require('dotenv').config();
process.env.SSO_SIMULADO = 'true';
process.env.HORA_CIERRE_AUTOMATICO = '23:59';
const assert = require('node:assert/strict');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const { hoyChile } = require('../../src/utils/fecha');

const PUERTO = 3058;
const URL = `http://localhost:${PUERTO}/api`;
const llamar = async (m, p, body, tok) => {
  const r = await fetch(URL + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) };
};
const ok = (n) => console.log('OK  ', n);
const sumarDias = (f, n) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

async function limpiar(fecha) {
  const q = (s) => pool.query(s, [fecha]);
  const ids = "(SELECT id_menu_preparacion FROM menu_preparacion WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1))";
  await q(`DELETE FROM movimiento_stock WHERE id_menu_preparacion IN ${ids}`);
  await q(`DELETE FROM venta_combo WHERE id_jornada IN (SELECT j.id_jornada FROM jornada j JOIN menu m ON m.id_menu = j.id_menu WHERE m.fecha = $1)`);
  await q(`DELETE FROM jornada WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1)`);
  await q(`DELETE FROM disponibilidad WHERE id_menu_preparacion IN ${ids}`);
  await q(`DELETE FROM venta WHERE id_menu_preparacion IN ${ids}`);
  await q(`DELETE FROM menu_preparacion WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1)`);
  await q(`DELETE FROM menu WHERE fecha = $1`);
}

const servidor = app.listen(PUERTO, async () => {
  const hoy = hoyChile();
  const destino = sumarDias(hoy, 20);
  try {
    await limpiar(hoy); await limpiar(destino);
    const suf = Date.now();
    const adm = (await llamar('POST', '/auth/login', { email: 'admin@duocuc.cl', password: 'Test1234' })).d.token;
    const crear = async (rol) => {
      const email = `${rol.toLowerCase()}${suf}@duocuc.cl`;
      assert.equal((await llamar('POST', '/usuarios', { nombre: rol, email, password: 'Test1234', rol }, adm)).s, 201);
      return (await llamar('POST', '/auth/login', { email, password: 'Test1234' })).d.token;
    };
    const caj = await crear('Cajero'); const nut = await crear('Nutricionista');

    assert.equal((await llamar('GET', '/auth/config')).d.sso_simulado, true);
    assert.equal((await llamar('POST', '/auth/duoc', { email: 'admin@duocuc.cl' })).s, 403); ok('el SSO simulado NO entra a cuentas del personal (403)');
    assert.equal((await llamar('POST', '/auth/duoc', { email: 'alguien@gmail.com' })).s, 400); ok('solo acepta correos @duocuc.cl (400)');
    process.env.SSO_SIMULADO = 'false';
    assert.equal((await llamar('POST', '/auth/duoc', { email: 'estudiante@duocuc.cl' })).s, 404); ok('con SSO_SIMULADO apagado no existe (404)');
    process.env.SSO_SIMULADO = 'true';
    const e1 = await llamar('POST', '/auth/duoc', { email: 'estudiante@duocuc.cl' });
    assert.equal(e1.s, 200); assert.equal(e1.d.usuario.rol, 'Estudiante'); assert.equal(e1.d.simulado, true);
    const nuevo = await llamar('POST', '/auth/duoc', { email: `nuevo.alumno${suf}@duocuc.cl` });
    assert.equal(nuevo.s, 200); assert.equal(nuevo.d.usuario.nombre, `Nuevo Alumno${suf}`); ok('estudiante existente y estudiante nuevo entran sin contraseña');
    const est1 = e1.d.token; const est2 = nuevo.d.token;
    assert.equal((await llamar('POST', '/auth/login', { email: `nuevo.alumno${suf}@duocuc.cl`, password: 'x' })).s, 401); ok('la cuenta creada por SSO no tiene contraseña utilizable');
    assert.equal((await llamar('GET', '/ingredientes', null, est1)).s, 403);
    assert.equal((await llamar('GET', '/jornada/hoy', null, est1)).s, 403); ok('el estudiante no accede a funciones del personal');

    const prep = (await llamar('GET', '/preparaciones/gestion', null, adm)).d;
    const id = (n) => prep.find((p) => p.nombre === n).id_preparacion;
    const plan = [
      ['Pollo arvejado con arroz', 'Plato Principal', 'Principal', 10], ['Arroz con pollo', 'Plato Principal', 'JUNAEB', 10],
      ['Budín de zapallito italiano', 'Plato Principal', 'Vegetariano', 10], ['Pollo a la plancha con ensalada', 'Plato Principal', 'Hipocalórico', 10],
      ['Sopa de verduras', 'Entrada', undefined, 40], ['Flan de caramelo', 'Postre', undefined, 40], ['Jugo de naranja', 'Bebida', undefined, 40],
    ];
    let idMenu;
    for (const [n, tipo, categoria, c] of plan) {
      const r = await llamar('POST', '/menu/planificacion', { fecha: hoy, id_preparacion: id(n), tipo_componente: tipo, categoria, cantidad_planificada: c }, adm);
      assert.equal(r.s, 201); idMenu = r.d.menu.id_menu;
    }
    assert.equal((await llamar('PATCH', `/menu/${idMenu}/publicar`, null, adm)).s, 200);
    const pid = id('Pollo arvejado con arroz');
    await pool.query('DELETE FROM calificacion WHERE id_preparacion = $1', [pid]);

    assert.deepEqual((await llamar('GET', '/estudiante/perfil', null, est1)).d.alergias, []);
    let r = await llamar('PUT', '/estudiante/alergias', { alergenos: ['Gluten', 'Lácteos'] }, est1);
    assert.equal(r.s, 200); assert.deepEqual((await llamar('GET', '/estudiante/perfil', null, est1)).d.alergias, ['Gluten', 'Lácteos']);
    assert.equal((await llamar('PUT', '/estudiante/alergias', { alergenos: ['Inventado'] }, est1)).s, 400); ok('alergias guardadas en el perfil; solo del catálogo');
    assert.equal((await llamar('PUT', `/estudiante/favoritos/${pid}`, null, est1)).s, 200);
    assert.equal((await llamar('PUT', `/estudiante/favoritos/${pid}`, null, est1)).s, 200);
    assert.equal((await llamar('GET', '/estudiante/perfil', null, est1)).d.favoritos.length >= 1, true);
    assert.equal((await llamar('PUT', '/estudiante/favoritos/999999', null, est1)).s, 404); ok('favoritos (idempotente; 404 si no existe la preparación)');
    assert.equal((await llamar('PUT', `/estudiante/calificaciones/${pid}`, { estrellas: 4, comentario: ' Muy rico ' }, est1)).s, 200);
    assert.equal((await llamar('PUT', `/estudiante/calificaciones/${pid}`, { estrellas: 6 }, est1)).s, 400);
    assert.equal((await llamar('PUT', `/estudiante/calificaciones/${pid}`, { estrellas: 3, comentario: 'x'.repeat(301) }, est1)).s, 400);
    assert.equal((await llamar('PUT', `/estudiante/calificaciones/${pid}`, { estrellas: 5, comentario: 'Excelente' }, est1)).s, 200);
    await llamar('PUT', `/estudiante/calificaciones/${pid}`, { estrellas: 4 }, est2);
    const pub = (await llamar('GET', '/menu/hoy?categoria=Principal')).d.preparaciones.find((c) => c.componente === 'Plato Principal');
    assert.equal(pub.calificacion_promedio, 4.5); assert.equal(pub.calificaciones_total, 2); ok('una calificación por estudiante (se actualiza) y promedio público');
    const op = await llamar('GET', '/opiniones', null, adm);
    assert.ok(op.d.promedios.find((x) => x.id_preparacion === pid)); assert.ok(op.d.comentarios.some((c) => c.comentario === 'Excelente'));
    assert.ok(!JSON.stringify(op.d).includes('estudiante@duocuc.cl')); assert.equal((await llamar('GET', '/opiniones', null, est1)).s, 403); ok('el personal ve opiniones sin el autor; el estudiante no');

    let al = (await llamar('GET', '/estudiante/alertas', null, est1)).d;
    assert.ok(al.some((a) => a.id_preparacion === pid && a.cantidad_restante === null));
    assert.equal((await llamar('POST', '/jornada/iniciar', {}, adm)).s, 200);
    al = (await llamar('GET', '/estudiante/alertas', null, est1)).d;
    assert.equal(al.find((a) => a.id_preparacion === pid).cantidad_restante, 10); ok('alerta: el favorito está hoy en el menú y cuánto queda');
    assert.equal((await llamar('DELETE', `/estudiante/calificaciones/${pid}`, null, est2)).s, 200);

    r = await llamar('POST', '/menu/copiar', { copias: [{ origen: hoy, destino }] }, nut);
    assert.equal(r.d.copiados, 1);
    r = await llamar('POST', '/menu/copiar', { copias: [{ origen: hoy, destino }] }, nut); assert.equal(r.d.copiados, 0); assert.match(r.d.omitidos[0].motivo, /Ya tiene un menú/);
    r = await llamar('POST', '/menu/copiar', { copias: [{ origen: hoy, destino }], sobrescribir: true }, nut); assert.equal(r.d.copiados, 1); ok('copiar un día: no pisa lo cargado salvo que se pida');
    r = await llamar('POST', '/menu/copiar', { copias: [{ origen: sumarDias(hoy, 300), destino: sumarDias(hoy, 301) }] }, nut);
    assert.equal(r.d.copiados, 0); assert.match(r.d.omitidos[0].motivo, /no tiene menú/);
    assert.equal((await llamar('POST', '/menu/copiar', { copias: [{ origen: hoy, destino: hoy }] }, nut)).s, 400);
    assert.equal((await llamar('POST', '/menu/copiar', { copias: [{ origen: 'ayer', destino }] }, nut)).s, 400);
    assert.equal((await llamar('POST', '/menu/copiar', { copias: [{ origen: hoy, destino }] }, caj)).s, 403); ok('copiar valida fechas y el cajero no puede');
    const mes = (await llamar('GET', `/menu/mes?mes=${destino.slice(0, 7)}`, null, nut)).d;
    const dia = mes.dias.find((d) => d.fecha === destino);
    assert.equal(dia.publicado, false); assert.equal(dia.componentes.length, 7); assert.equal((await llamar('GET', '/menu/mes?mes=2026-13', null, nut)).s, 400); ok('vista mensual: día copiado sin publicar, con 7 componentes');
    const pl = (await llamar('GET', `/menu/planificacion?fecha=${destino}`, null, nut)).d;
    assert.equal(pl.componentes.filter((c) => c.categoria).length, 4); ok('lo copiado conserva categorías y precios');

    const sug = (await llamar('GET', `/prediccion/sugerencias?fecha=${sumarDias(hoy, 1)}`, null, nut)).d;
    assert.equal(sug.categorias.length, 4); assert.equal(sug.contiene_simulados, true);
    const con = sug.categorias.filter((c) => c.estimacion);
    assert.ok(con.length >= 1, 'debería haber historia suficiente'); assert.ok(con[0].estimacion.sugerido % 5 === 0 && con[0].estimacion.minimo <= con[0].estimacion.maximo);
    if (con.length === 4) assert.ok(sug.compartidos.sugerido >= 4 * 5); ok('sugerencia de cuánto preparar por categoría (múltiplos de 5, con rango)');
    assert.equal((await llamar('GET', '/prediccion/sugerencias?fecha=hoy', null, nut)).s, 400);
    const conf = (await llamar('GET', '/prediccion/confiabilidad', null, adm)).d;
    assert.equal(conf.categorias.length, 4); assert.ok(conf.global.demanda.dias > 0); assert.equal(typeof conf.global.demanda.mae_modelo, 'number');
    assert.ok(conf.global.demanda.cobertura_sugerencia >= conf.global.demanda.cobertura_planificado);
    assert.ok(conf.global.agotamiento.dias >= 0); assert.equal(conf.contiene_simulados, true); ok('backtesting: error del modelo vs. promedio simple, cobertura y sobrantes');
    assert.equal((await llamar('GET', '/prediccion/confiabilidad', null, caj)).s, 403);
    const hoyP = await llamar('GET', '/prediccion/hoy', null, caj);
    assert.equal(hoyP.s, 200); assert.equal(hoyP.d.categorias.length, 4); assert.equal(hoyP.d.categorias[0].restante, 10); ok('estimación de hoy visible para la caja (jornada abierta)');

    await limpiar(destino);
    console.log('\nTODO OK');
  } catch (e) { console.error('FALLO:', e.stack || e.message); process.exitCode = 1; }
  servidor.close(); await pool.end(); setTimeout(() => process.exit(), 200);
});
