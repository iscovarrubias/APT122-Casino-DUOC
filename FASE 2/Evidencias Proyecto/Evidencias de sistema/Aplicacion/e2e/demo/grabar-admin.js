const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');
const { Api, hoyChile } = require('../soporte/api');
const bd = require('../soporte/bd');
const { entornoBackend } = require('../soporte/entorno');
const { grabar } = require('./grabador');
const e = require('./escena');

const BACKEND = path.resolve(__dirname, '../../backend');
const SALIDA = path.join(__dirname, 'salida', 'manuales');
const CUADROS = path.join(SALIDA, 'cuadros');

const PLATOS = {
  General: 'Pollo Asado con Papas fritas y Arroz',
  JUNAEB: 'Lentejas a la Parmesana',
  Vegetariano: 'Budín de Zapallitos Italianos con Arroz Piamontesa',
  Hipocalórico: 'Pollo Asado con Ensaladas',
};
const ACOMPANAMIENTOS = {
  Ensalada: 'Ensalada chilena',
  Sopa: 'Sopa de verduras',
  Pan: 'Pan amasado',
  Postre: 'Flan de caramelo',
  Fruta: 'Manzana',
  Bebida: 'Jugo de naranja',
};
const PORCIONES = { General: 40, JUNAEB: 30, Vegetariano: 25, Hipocalórico: 3 };
const ESTUDIANTE = 'josefa.cofre@duocuc.cl';
const NOMBRE_ESTUDIANTE = 'Josefa Cofré';
const COMENTARIO = 'Muy rico el pollo asado y las papas bien crujientes.';
const CLAVE_DEMO = 'Test1234';

const clips = [];
const fallas = [];

async function caja(pagina, locator) {
  try {
    const interno = await locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { enMarco: window.top !== window, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (interno.enMarco) {
      const marco = await pagina.locator('#app').boundingBox();
      return { x: marco.x + interno.x * e.Z, y: marco.y + interno.y * e.Z, w: interno.w * e.Z, h: interno.h * e.Z };
    }
    const b = await locator.boundingBox();
    return b && { x: b.x, y: b.y, w: b.width, h: b.height };
  } catch {
    return null;
  }
}

async function clip(nombre, pagina, accion) {
  await pagina.bringToFront();
  await e.esperar(300);
  const g = await grabar(pagina, nombre, { carpeta: CUADROS });
  const registro = { nombre, pasos: [] };
  await e.esperar(700);
  const paso = async (video, numero, foco, fn) => {
    const t0 = Date.now() / 1000;
    const f0 = foco ? await caja(pagina, foco) : null;
    try {
      await fn();
    } catch (err) {
      fallas.push(`${video} paso ${numero}: ${String(err.message).split('\n')[0]}`);
    }
    const f1 = foco ? await caja(pagina, foco) : null;
    registro.pasos.push({ video, paso: numero, t0, t1: Date.now() / 1000, foco: f1 || f0 });
  };
  try {
    await accion(paso);
  } finally {
    await e.esperar(700);
    await g.detener();
    clips.push(registro);
    fs.writeFileSync(path.join(SALIDA, 'clips-admin.json'), JSON.stringify({ clips, fallas }, null, 1));
  }
}

async function confirmarSiPregunta(pagina) {
  const dialogo = pagina.getByRole('alertdialog');
  if (await dialogo.isVisible().catch(() => false)) await e.clic(pagina, dialogo.getByRole('button').last(), { despues: 500 });
}

async function prepararDatos(api) {
  const entorno = { ...process.env, ...entornoBackend() };
  const existe = await bd.consulta('SELECT 1 FROM preparacion WHERE nombre = $1', [PLATOS.JUNAEB]);
  if (!existe.length) await bd.consulta(fs.readFileSync(path.join(BACKEND, 'database', 'seed_menu_campomar.sql'), 'utf8'));
  const conFoto = await bd.consulta('SELECT 1 FROM preparacion WHERE nombre = $1 AND imagen_url IS NOT NULL', [PLATOS.General]);
  if (!conFoto.length) {
    execFileSync(process.execPath, [path.join(BACKEND, 'database', 'seed_imagenes.js')], { cwd: BACKEND, env: entorno, stdio: 'ignore' });
  }
  const fecha = hoyChile();
  await bd.limpiarDia(fecha);
  await bd.borrarCalificaciones(PLATOS.General);
  for (const correo of [ESTUDIANTE, 'valentina.soto@duocuc.cl']) {
    const u = await bd.consulta('SELECT id_usuario FROM usuario WHERE email = $1', [correo]);
    if (!u.length) continue;
    for (const tabla of ['calificacion', 'opinion_registro', 'correo_enviado', 'favorito', 'preferencia_alergeno', 'preferencia_correo']) {
      await bd.consulta(`DELETE FROM ${tabla} WHERE id_usuario = $1`, [u[0].id_usuario]);
    }
  }
  let idMenu;
  for (const [categoria, nombre] of Object.entries(PLATOS)) {
    const r = await api.admin('POST', '/menu/planificacion', {
      fecha,
      id_preparacion: await api.idPreparacion(nombre),
      tipo_componente: 'Plato Principal',
      categoria,
      cantidad_planificada: PORCIONES[categoria],
    });
    idMenu = r.menu.id_menu;
  }
  for (const [tipo, nombre] of Object.entries(ACOMPANAMIENTOS)) {
    await api.admin('POST', '/menu/planificacion', { fecha, id_preparacion: await api.idPreparacion(nombre), tipo_componente: tipo, cantidad_planificada: 60 });
  }
  await api.admin('PATCH', `/menu/${idMenu}/publicar`);
  const alumno = await api.pedir('POST', '/auth/duoc', { email: ESTUDIANTE });
  await bd.consulta('UPDATE usuario SET nombre = $1 WHERE email = $2', [NOMBRE_ESTUDIANTE, ESTUDIANTE]);
  alumno.usuario.nombre = NOMBRE_ESTUDIANTE;
  return { token: alumno.token, usuario: alumno.usuario, kiosco: false };
}

const boton = (pagina, categoria) => pagina.getByRole('button', { name: new RegExp(`^${categoria} \\$`) });

async function venderCombo(pagina, eleccion) {
  await e.clic(pagina, boton(pagina, 'General'), { despues: 700 });
  const dialogo = pagina.getByRole('alertdialog', { name: 'Vendiendo General' });
  await expect(dialogo).toBeVisible();
  await e.clic(pagina, dialogo.getByRole('button', { name: eleccion }), { despues: 1200 });
}

test('material de administración', async ({ browser }) => {
  fs.mkdirSync(CUADROS, { recursive: true });
  const api = new Api();
  const sesion = { admin: await api.sesion('admin@duocuc.cl') };
  await api.pedir('PATCH', '/auth/tema', { tema: 'claro' }, sesion.admin.token);
  sesion.admin = await api.sesion('admin@duocuc.cl');
  const admin = await e.prepararContexto(browser, { sesion: sesion.admin });
  const cajaAdmin = await admin.newPage();
  await cajaAdmin.goto('/#/panel/caja');
  await clip('m6e-reabrir', cajaAdmin, async (paso) => {
    await paso(6, 8, cajaAdmin.getByRole('button', { name: 'Reabrir jornada' }), async () => {
      await e.moverA(cajaAdmin, cajaAdmin.getByRole('button', { name: 'Reabrir jornada' }));
      await e.esperar(3000);
    });
  });
  await cajaAdmin.close();

  const analisis = await admin.newPage();
  await analisis.goto('/#/panel/analisis');
  await expect(analisis.getByRole('heading', { name: 'Comparación entre menús' })).toBeVisible();
  await clip('m8-analisis', analisis, async (paso) => {
    const periodo = analisis.getByRole('group', { name: 'Período' });
    await paso(8, 1, periodo, async () => {
      await e.clic(analisis, periodo.getByRole('button', { name: 'Este mes' }), { despues: 1400 });
      await e.clic(analisis, periodo.getByRole('button', { name: 'Últimos 30 días' }), { despues: 1800 });
    });
    const comparacion = analisis.getByRole('heading', { name: 'Comparación entre menús' });
    await paso(8, 2, comparacion.locator('xpath=..'), async () => {
      await e.moverA(analisis, comparacion);
      await e.desplazar(analisis, 380);
      await e.esperar(2600);
      await e.desplazar(analisis, -380);
    });
    await paso(8, 3, analisis.locator('main'), async () => {
      await e.clic(analisis, analisis.getByRole('button', { name: 'General', exact: true }).first(), { despues: 1800 });
      await e.clic(analisis, analisis.getByRole('button', { name: 'Todos los menús' }).first(), { despues: 1000 });
      await e.clic(analisis, analisis.getByRole('button', { name: 'Preparación', exact: true }).first(), { despues: 2200 });
      await e.clic(analisis, analisis.getByRole('button', { name: 'Menú', exact: true }).first(), { despues: 900 });
    });
    await paso(8, 4, analisis.locator('main'), async () => {
      await e.clic(analisis, analisis.getByRole('tab', { name: 'Predicción' }), { despues: 1500 });
      await e.moverA(analisis, analisis.getByRole('heading', { name: '¿Qué tan confiable es?' }));
      await e.esperar(2600);
    });
    await paso(8, 5, analisis.locator('main'), async () => {
      await e.clic(analisis, analisis.getByRole('tab', { name: 'Informe general' }), { despues: 1500 });
      await e.desplazar(analisis, 420);
      await e.esperar(2200);
      await e.desplazar(analisis, -420);
    });
    await paso(8, 6, analisis.getByRole('button', { name: 'Exportar' }).first(), async () => {
      await e.clic(analisis, analisis.getByRole('tab', { name: 'Ventas y agotamiento' }), { despues: 1200 });
      await e.clic(analisis, analisis.getByRole('button', { name: 'Exportar' }).first(), { despues: 2200 });
      const dlg = analisis.getByRole('dialog').filter({ hasText: 'Exportar' });
      if (await dlg.isVisible().catch(() => false)) await e.clic(analisis, dlg.getByRole('button', { name: 'Cancelar' }), { despues: 800 });
    });
    await paso(8, 7, analisis.locator('main'), async () => {
      await e.clic(analisis, analisis.getByRole('tab', { name: 'Opiniones' }), { despues: 1300 });
      const estrellas = analisis.getByLabel('Estrellas').first();
      if (await estrellas.isVisible().catch(() => false)) {
        await e.moverA(analisis, estrellas);
        const opciones = await estrellas.locator('option').allInnerTexts();
        const cinco = opciones.find((o) => o.includes('5'));
        if (cinco) await estrellas.selectOption({ label: cinco });
        await e.esperar(1600);
      }
      const tarjeta = analisis.locator('article').filter({ hasText: COMENTARIO }).first();
      if (await tarjeta.isVisible().catch(() => false)) await e.moverA(analisis, tarjeta);
      await e.esperar(2600);
    });
  });

  fs.writeFileSync(path.join(SALIDA, 'clips-admin.json'), JSON.stringify({ fecha: hoyChile(), clips, fallas }, null, 1));
  await admin.close();
});
