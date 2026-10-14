require('dotenv').config();
process.env.HORA_CIERRE_AUTOMATICO = '23:59';
const http = require('node:http');
const assert = require('node:assert/strict');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const jornadaModel = require('../../src/models/jornada.model');
const { hoyChile, haceDiasChile } = require('../../src/utils/fecha');

const PUERTO = 3057;
const URL = `http://localhost:${PUERTO}/api`;
const llamar = async (m, p, body, tok) => {
  const r = await fetch(URL + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) };
};
const ok = (n) => console.log('OK  ', n);

async function limpiarHoy() {
  const q = (s) => pool.query(s, [hoyChile()]);
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
  try {
    await limpiarHoy();
    const sufijo = Date.now();
    const adm = (await llamar('POST', '/auth/login', { email: 'admin@duocuc.cl', password: 'Test1234' })).d.token;
    const crearUsuario = async (rol) => {
      const email = `${rol.toLowerCase()}${sufijo}@duocuc.cl`;
      assert.equal((await llamar('POST', '/usuarios', { nombre: rol, email, password: 'Test1234', rol }, adm)).s, 201);
      return (await llamar('POST', '/auth/login', { email, password: 'Test1234' })).d;
    };
    const caj = await crearUsuario('Cajero'); const nut = await crearUsuario('Nutricionista');
    assert.equal(caj.kiosco, true); ok('cajero y nutricionista creados; sesión larga para cajero');

    const prep = (await llamar('GET', '/preparaciones/gestion', null, adm)).d;
    const id = (n) => prep.find((p) => p.nombre === n).id_preparacion;
    const plan = [
      ['Pollo arvejado con arroz', 'Plato Principal', 'Principal', 10], ['Arroz con pollo', 'Plato Principal', 'JUNAEB', 10],
      ['Budín de zapallito italiano', 'Plato Principal', 'Vegetariano', 10], ['Pollo a la plancha con ensalada', 'Plato Principal', 'Hipocalórico', 10],
      ['Sopa de verduras', 'Entrada', undefined, 40], ['Flan de caramelo', 'Postre', undefined, 40], ['Jugo de naranja', 'Bebida', undefined, 40],
    ];
    let idMenu;
    for (const [n, tipo, categoria, c] of plan) {
      const r = await llamar('POST', '/menu/planificacion', { fecha: hoyChile(), id_preparacion: id(n), tipo_componente: tipo, categoria, cantidad_planificada: c }, adm);
      assert.equal(r.s, 201); idMenu = r.d.menu.id_menu;
    }
    assert.equal((await llamar('PATCH', `/menu/${idMenu}/publicar`, null, adm)).s, 200);

    let hoy = (await llamar('GET', '/jornada/hoy', null, caj.token)).d;
    assert.equal(hoy.jornada, null);
    assert.equal((await llamar('POST', '/jornada/ventas', { categoria: 'Principal' }, caj.token)).s, 409); ok('sin jornada no se puede vender (409)');
    assert.equal((await llamar('POST', '/jornada/iniciar', { cantidades: { [hoy.componentes[0].id_menu_preparacion]: 1 } }, adm)).s, 200);
    assert.equal((await llamar('POST', '/jornada/iniciar', {}, caj.token)).s, 403); ok('el cajero no puede iniciar la jornada (403)');
    assert.equal((await llamar('POST', '/jornada/iniciar', {}, adm)).s, 409); ok('la jornada se inicia una sola vez (409)');
    hoy = (await llamar('GET', '/jornada/hoy', null, caj.token)).d;
    const comp = (cat, tipo) => hoy.componentes.find((c) => c.componente === tipo && (c.categoria || null) === (cat || null));
    assert.equal(comp('Principal', 'Plato Principal').restante, 10); assert.equal(comp(null, 'Bebida').restante, 40);

    const evento = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('no llegó el evento en tiempo real')), 4000);
      http.get(`${URL}/menu/eventos`, (res) => res.on('data', (b) => { if (b.toString().includes('event: cambio')) { clearTimeout(t); res.destroy(); resolve(); } }));
    });
    await new Promise((r) => setTimeout(r, 200));

    const par = await Promise.all(Array.from({ length: 5 }, () => llamar('POST', '/jornada/ventas', { categoria: 'Principal' }, caj.token)));
    assert.ok(par.every((r) => r.s === 201), JSON.stringify(par.map((r) => [r.s, r.d]))); await evento; ok('5 ventas simultáneas + evento en tiempo real (SSE)');
    hoy = (await llamar('GET', '/jornada/hoy', null, caj.token)).d;
    assert.equal(comp('Principal', 'Plato Principal').restante, 5);
    assert.equal(comp(null, 'Bebida').restante, 35); assert.equal(comp('JUNAEB', 'Plato Principal').restante, 10); ok('stock exacto: principal -5, compartidos -5, otras categorías intactas');

    for (let i = 0; i < 3; i++) await llamar('POST', '/jornada/ventas', { categoria: 'Principal' }, caj.token);
    hoy = (await llamar('GET', '/jornada/hoy', null, caj.token)).d;
    assert.equal(comp('Principal', 'Plato Principal').disponibilidad, 'baja_disponibilidad'); ok('quedan 2 de 10 -> baja disponibilidad automática');
    for (let i = 0; i < 2; i++) await llamar('POST', '/jornada/ventas', { categoria: 'Principal' }, caj.token);
    let pub = (await llamar('GET', '/menu/hoy?categoria=Principal')).d.preparaciones;
    const pPub = pub.find((c) => c.componente === 'Plato Principal');
    assert.equal(pPub.disponibilidad, 'agotado'); assert.equal(pPub.cantidad_restante, 0); assert.ok(pPub.stock_actualizado_en);
    assert.equal(pub.find((c) => c.componente === 'Bebida').cantidad_restante, 30); ok('vista pública: agotado, quedan 0, compartidos con cantidad');

    const extra = await llamar('POST', '/jornada/ventas', { categoria: 'Principal' }, caj.token);
    assert.equal(extra.s, 201); hoy = (await llamar('GET', '/jornada/hoy', null, caj.token)).d;
    assert.equal(comp('Principal', 'Plato Principal').restante, -1); ok('una venta con stock 0 no se bloquea (queda -1 para corregir en el cierre)');
    const anul = await llamar('POST', `/jornada/ventas/${extra.d.id_venta_combo}/anular`, null, caj.token);
    assert.equal(anul.s, 200); assert.equal((await llamar('POST', `/jornada/ventas/${extra.d.id_venta_combo}/anular`, null, caj.token)).s, 409);
    hoy = (await llamar('GET', '/jornada/hoy', null, caj.token)).d; assert.equal(comp('Principal', 'Plato Principal').restante, 0); ok('anular = movimiento contrario; no se puede anular dos veces');

    assert.equal((await llamar('POST', `/jornada/componentes/${comp('Principal', 'Plato Principal').id_menu_preparacion}/stock`, { accion: 'quedan', cantidad: 5 }, caj.token)).s, 403); ok('el cajero no puede ajustar stock (403)');
    const mp = comp('Principal', 'Plato Principal').id_menu_preparacion;
    let r = await llamar('POST', `/jornada/componentes/${mp}/stock`, { accion: 'quedan', cantidad: 5 }, adm); assert.equal(r.d.restante, 5);
    r = await llamar('POST', `/jornada/componentes/${mp}/stock`, { accion: 'reposicion', cantidad: 10 }, adm); assert.equal(r.d.restante, 15);
    assert.equal((await llamar('POST', `/jornada/componentes/${mp}/stock`, { accion: 'quedan', cantidad: -2 }, adm)).s, 400);
    assert.equal((await llamar('POST', `/jornada/componentes/${mp}/stock`, { accion: 'reposicion', cantidad: 0 }, adm)).s, 400); ok('cocina: fijar "quedan", reponer y validaciones');
    hoy = (await llamar('GET', '/jornada/hoy', null, caj.token)).d; assert.equal(comp('Principal', 'Plato Principal').disponibilidad, 'disponible');

    const an = (await llamar('GET', `/analisis/resumen?desde=${hoyChile()}&hasta=${hoyChile()}`, null, adm)).d;
    assert.equal(an.origenes.ventas.registrado, 40); ok('el análisis usa las ventas registradas en caja (vista venta_efectiva)');

    r = await llamar('POST', '/jornada/cerrar', { sobrantes: { [mp]: 3 } }, adm); assert.equal(r.s, 200);
    hoy = (await llamar('GET', '/jornada/hoy', null, adm)).d;
    assert.equal(comp('Principal', 'Plato Principal').restante, 3); assert.equal(hoy.jornada.sobrante_contado, true); assert.equal(hoy.jornada.cierre_automatico, false);
    assert.equal((await llamar('POST', '/jornada/ventas', { categoria: 'Principal' }, caj.token)).s, 409); ok('cierre con conteo real; jornada cerrada no admite ventas');

    const men = (await llamar('GET', `/analisis/mensual?mes=${hoyChile().slice(0, 7)}`, null, adm)).d;
    const fila = men.platos.find((p) => p.nombre === 'Pollo arvejado con arroz');
    assert.ok(fila.jornadas >= 1); assert.ok(fila.minutos_hasta_agotarse >= 0); assert.ok(men.resumen.jornadas_cerradas >= 1);
    assert.equal((await llamar('GET', '/analisis/mensual?mes=2026-13', null, adm)).s, 400); ok('informe mensual con ranking normalizado');

    const ayer = haceDiasChile(1);
    const m = (await pool.query(`INSERT INTO menu (id_sede, fecha, publicado) VALUES (1, $1, TRUE) ON CONFLICT (id_sede, fecha) DO UPDATE SET publicado = TRUE RETURNING id_menu`, [ayer])).rows[0];
    await pool.query('DELETE FROM jornada WHERE id_menu = $1', [m.id_menu]);
    await pool.query('INSERT INTO jornada (id_menu) VALUES ($1)', [m.id_menu]);
    await jornadaModel.cerrarVencidas();
    const cv = (await pool.query('SELECT estado, cierre_automatico FROM jornada WHERE id_menu = $1', [m.id_menu])).rows[0];
    assert.deepEqual(cv, { estado: 'cerrada', cierre_automatico: true }); ok('jornada olvidada se cierra sola (cierre automático)');

    assert.equal((await llamar('GET', '/ingredientes', null, caj.token)).s, 403);
    assert.equal((await llamar('GET', '/ingredientes', null, nut.token)).s, 200); ok('cajero sin acceso a ingredientes; nutricionista sí');
    const pub2 = async (pid) => (await llamar('GET', '/preparaciones')).d.find((p) => p.id_preparacion === pid);
    const pid = id('Ensalada chilena');
    r = await llamar('PUT', `/preparaciones/${pid}/nutricion`, { calorias: 90, proteinas_g: 2, carbohidratos_g: 10, grasas_g: 4, origen: 'manual' }, nut.token);
    assert.equal(r.s, 200); assert.equal(Number((await pub2(pid)).informacion_nutricional.calorias), 90); ok('lo que guarda la nutricionista se publica de inmediato');
    await llamar('PUT', `/preparaciones/${pid}/nutricion`, { proteinas_g: 2, origen: 'manual' }, nut.token);
    assert.equal((await pub2(pid)).informacion_nutricional, null); ok('sin calorías no se publica ("No disponible")');

    const ing = await llamar('POST', '/ingredientes', { nombre: `Ing prueba ${sufijo}`, id_categoria_ingrediente: 3, calorias_100g: 100, proteinas_100g: 2, carbohidratos_100g: 20, grasas_100g: 1 }, nut.token);
    assert.equal(ing.s, 201);
    const rec = await llamar('POST', '/preparaciones', { nombre: `Receta prueba ${sufijo}`, porciones_receta: 2, ingredientes: [{ id_ingrediente: ing.d.id_ingrediente, cantidad_g: 400 }] }, nut.token);
    assert.equal(rec.s, 201);
    r = await llamar('POST', '/preparaciones/calcular-nutricion', { porciones_receta: 2, ingredientes: [{ id_ingrediente: ing.d.id_ingrediente, cantidad_g: 400 }] }, nut.token);
    assert.equal(r.d.completo, true); assert.equal(r.d.por_porcion.calorias, 200);
    await llamar('PUT', `/preparaciones/${rec.d.id_preparacion}/nutricion`, { ...r.d.por_porcion, origen: 'calculada' }, nut.token);
    assert.equal(Number((await pub2(rec.d.id_preparacion)).informacion_nutricional.calorias), 200); ok('calcula y publica sin pasos extra (sin fuente ni validación)');
    r = await llamar('PUT', `/ingredientes/${ing.d.id_ingrediente}`, { calorias_100g: 110, proteinas_100g: 2, carbohidratos_100g: 20, grasas_100g: 1 }, nut.token);
    assert.equal(r.d.recalculadas, 1); assert.equal(Number((await pub2(rec.d.id_preparacion)).informacion_nutricional.calorias), 220); ok('cambiar un ingrediente recalcula lo publicado');
    r = await llamar('PUT', `/ingredientes/${ing.d.id_ingrediente}`, { calorias_100g: null, proteinas_100g: null, carbohidratos_100g: null, grasas_100g: null }, nut.token);
    assert.equal(r.d.sin_datos, 1); assert.equal((await pub2(rec.d.id_preparacion)).informacion_nutricional, null); ok('si el ingrediente pierde sus datos, la receta pasa a "No disponible"');
    assert.equal((await llamar('POST', '/ingredientes', { nombre: 'X', calorias_100g: 9999, proteinas_100g: 1, carbohidratos_100g: 1, grasas_100g: 1 }, nut.token)).s, 400); ok('rechaza valores fuera de rango');

    const planHoy = (await llamar('GET', `/menu/planificacion?fecha=${hoyChile()}`, null, nut.token)).d;
    const slot = (cat) => planHoy.componentes.find((c) => c.categoria === cat && c.componente === 'Plato Principal');
    assert.equal((await llamar('PATCH', `/menu/componentes/${slot('JUNAEB').id_menu_preparacion}`, { precio: 3500 }, nut.token)).s, 200);
    assert.equal((await llamar('PATCH', `/menu/componentes/${slot('Principal').id_menu_preparacion}`, { precio: 4800 }, nut.token)).s, 200);
    const compartido = planHoy.componentes.find((c) => !c.categoria);
    await llamar('PATCH', `/menu/componentes/${compartido.id_menu_preparacion}`, { precio: 999 }, nut.token);
    const precioDe = async (cat, tipo) => Number((await llamar('GET', `/menu/hoy?categoria=${cat}`)).d.preparaciones.find((c) => c.componente === tipo).precio);
    assert.equal(await precioDe('JUNAEB', 'Plato Principal'), 3500); assert.equal(await precioDe('Principal', 'Plato Principal'), 4800);
    assert.equal(await precioDe('JUNAEB', compartido.componente), 0);
    assert.equal((await llamar('GET', `/menu/planificacion?fecha=${hoyChile()}`, null, nut.token)).d.precios_recientes.JUNAEB, 3500); ok('el precio es del plato en cada categoría; los compartidos van incluidos');
    assert.equal((await llamar('PATCH', `/menu/componentes/${slot('JUNAEB').id_menu_preparacion}`, { precio: -5 }, nut.token)).s, 400); ok('rechaza precio negativo');
    console.log('\nTODO OK');
  } catch (e) { console.error('FALLO:', e.stack || e.message); process.exitCode = 1; }
  servidor.close(); await pool.end(); setTimeout(() => process.exit(), 200);
});
