require('./entorno');
process.env.SSO_SIMULADO = 'true';
process.env.HORA_CIERRE_AUTOMATICO = '23:59';
process.env.HORA_INICIO_AUTOMATICO = '';
process.env.DEMO_VENTAS_SIMULADAS = 'false';

const assert = require('node:assert/strict');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const { hoyChile } = require('../../src/utils/fecha');

const ADMIN = { email: 'admin@duocuc.cl', password: 'Test1234' };

async function arrancar() {
  const servidor = await new Promise((resolver) => {
    const s = app.listen(0, '127.0.0.1', () => resolver(s));
  });
  const base = `http://127.0.0.1:${servidor.address().port}/api`;

  async function api(metodo, ruta, cuerpo, token, extra = {}) {
    const inicio = performance.now();
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined && !(cuerpo instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(extra.headers || {}),
      },
      body: cuerpo === undefined ? undefined : (typeof cuerpo === 'string' || cuerpo instanceof FormData ? cuerpo : JSON.stringify(cuerpo)),
    });
    const texto = await r.text();
    let datos = null;
    try { datos = JSON.parse(texto); } catch { datos = null; }
    return { s: r.status, d: datos, texto, ms: performance.now() - inicio, headers: r.headers };
  }

  async function entrar(email, password = 'Test1234') {
    const r = await api('POST', '/auth/login', { email, password });
    assert.equal(r.s, 200, `no se pudo entrar como ${email}: ${r.texto}`);
    return r.d.token;
  }

  async function crearUsuario(tokenAdmin, rol, prefijo = rol) {
    const email = `${prefijo.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@duocuc.cl`;
    const r = await api('POST', '/usuarios', { nombre: `${rol} de prueba`, email, password: 'Test1234', rol }, tokenAdmin);
    assert.equal(r.s, 201, r.texto);
    return { ...r.d, email, token: await entrar(email) };
  }

  async function crearEstudiante(prefijo = 'alumno') {
    const email = `${prefijo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@duocuc.cl`;
    const r = await api('POST', '/auth/duoc', { email });
    assert.equal(r.s, 200, r.texto);
    return { ...r.d.usuario, email, token: r.d.token };
  }

  const cerrar = () => new Promise((resolver) => servidor.close(resolver));

  return { base, api, entrar, crearUsuario, crearEstudiante, cerrar };
}

async function limpiarHoy() {
  const q = (s) => pool.query(s, [hoyChile()]);
  const ids = '(SELECT id_menu_preparacion FROM menu_preparacion WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1))';
  await q(`DELETE FROM movimiento_stock WHERE id_menu_preparacion IN ${ids}`);
  await q('DELETE FROM venta_combo WHERE id_jornada IN (SELECT j.id_jornada FROM jornada j JOIN menu m ON m.id_menu = j.id_menu WHERE m.fecha = $1)');
  await q('DELETE FROM jornada WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1)');
  await q(`DELETE FROM disponibilidad WHERE id_menu_preparacion IN ${ids}`);
  await q(`DELETE FROM venta WHERE id_menu_preparacion IN ${ids}`);
  await q('DELETE FROM menu_preparacion WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1)');
  await q('DELETE FROM menu WHERE fecha = $1');
}

const PLAN_HOY = [
  ['Pollo arvejado con arroz', 'Plato Principal', 'General'],
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

async function prepararJornadaHoy(api, tokenAdmin, { porciones = 200, iniciar = true } = {}) {
  await limpiarHoy();
  const preparaciones = (await api('GET', '/preparaciones/gestion', undefined, tokenAdmin)).d;
  const idDe = (nombre) => {
    const p = preparaciones.find((x) => x.nombre === nombre);
    assert.ok(p, `falta la preparación ${nombre}; ejecuta los seeds`);
    return p.id_preparacion;
  };
  let idMenu;
  for (const [nombre, tipo, categoria] of PLAN_HOY) {
    const r = await api('POST', '/menu/planificacion', {
      fecha: hoyChile(), id_preparacion: idDe(nombre), tipo_componente: tipo, categoria, cantidad_planificada: porciones,
    }, tokenAdmin);
    assert.equal(r.s, 201, r.texto);
    idMenu = r.d.menu.id_menu;
  }
  assert.equal((await api('PATCH', `/menu/${idMenu}/publicar`, undefined, tokenAdmin)).s, 200);
  if (iniciar) assert.equal((await api('POST', '/jornada/iniciar', {}, tokenAdmin)).s, 200);
  return idMenu;
}

function percentil(valores, p) {
  const orden = [...valores].sort((a, b) => a - b);
  if (!orden.length) return 0;
  return orden[Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1)];
}

async function enParalelo(cantidad, concurrencia, tarea) {
  const resultados = new Array(cantidad);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < cantidad) {
      const i = siguiente++;
      resultados[i] = await tarea(i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrencia, cantidad) }, trabajador));
  return resultados;
}

module.exports = { arrancar, limpiarHoy, prepararJornadaHoy, percentil, enParalelo, pool, ADMIN };
