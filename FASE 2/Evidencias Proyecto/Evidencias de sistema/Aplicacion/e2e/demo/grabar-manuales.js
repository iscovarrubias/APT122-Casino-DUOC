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
    await e.esperar(350);
    const f1 = foco ? await caja(pagina, foco) : null;
    registro.pasos.push({ video, paso: numero, t0, t1: Date.now() / 1000, foco: f1 || f0 });
  };
  try {
    await accion(paso);
  } finally {
    await e.esperar(700);
    await g.detener();
    clips.push(registro);
    fs.writeFileSync(path.join(SALIDA, 'clips.json'), JSON.stringify({ clips, fallas }, null, 1));
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

test('material de los manuales', async ({ browser }) => {
  fs.mkdirSync(CUADROS, { recursive: true });
  const api = new Api();
  const sesionEstudiante = await prepararDatos(api);
  const sesion = {
    admin: await api.sesion('admin@duocuc.cl'),
    cocina: await api.sesion('personal@duocuc.cl'),
    caja: await api.sesion('cajero@duocuc.cl'),
  };
  for (const s of Object.values(sesion)) await api.pedir('PATCH', '/auth/tema', { tema: 'claro' }, s.token).catch(() => null);

  const cocina = await e.prepararContexto(browser, { sesion: sesion.cocina });
  const kiosco = await cocina.newPage();
  await kiosco.goto('/#/panel/kiosco');
  await expect(kiosco.getByRole('heading', { level: 2, name: 'Iniciar jornada' })).toBeVisible();
  await clip('m6a-cocina', kiosco, async (paso) => {
    const general = kiosco.getByRole('spinbutton', { name: `General: ${PLATOS.General}` });
    await paso(6, 1, kiosco.locator('main .tarjeta').first(), async () => {
      await e.moverA(kiosco, general);
      await e.esperar(900);
      await e.clic(kiosco, general, { despues: 300 });
      await general.fill('');
      await e.escribir(kiosco, general, '42', { retardo: 160, despues: 1600 });
    });
    await paso(6, 2, kiosco.getByRole('button', { name: 'Iniciar jornada' }), async () => {
      await e.clic(kiosco, kiosco.getByRole('button', { name: 'Iniciar jornada' }), { despues: 600 });
      await confirmarSiPregunta(kiosco);
      await expect(kiosco.getByText(/Jornada abierta desde las/)).toBeVisible();
      await e.esperar(2400);
    });
  });

  const cajaCtx = await e.prepararContexto(browser, { sesion: sesion.caja });
  const pCaja = await cajaCtx.newPage();
  await pCaja.goto('/#/panel/caja');
  await expect(boton(pCaja, 'General')).toBeVisible();
  await clip('m7-caja', pCaja, async (paso) => {
    await paso(7, 1, pCaja.locator('main'), async () => {
      for (const c of ['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico']) {
        await e.moverA(pCaja, boton(pCaja, c));
        await e.esperar(900);
      }
      await e.esperar(800);
    });
    await paso(7, 2, boton(pCaja, 'General'), async () => {
      await venderCombo(pCaja, /^Postre/);
      await e.esperar(600);
      await venderCombo(pCaja, /^Fruta/);
      await e.esperar(1200);
    });
    await paso(7, 3, pCaja.getByRole('button', { name: 'Solo plato de General' }), async () => {
      await e.clic(pCaja, pCaja.getByRole('button', { name: 'Solo plato de General' }), { despues: 1800 });
    });
    await paso(7, 4, pCaja.getByRole('button', { name: 'Completo + máquina de General' }), async () => {
      await e.clic(pCaja, pCaja.getByRole('button', { name: 'Completo + máquina de General' }), { despues: 700 });
      const dialogo = pCaja.getByRole('alertdialog');
      if (await dialogo.isVisible().catch(() => false)) await e.clic(pCaja, dialogo.getByRole('button', { name: /^Fruta/ }), { despues: 1200 });
      await e.esperar(1000);
    });
    await paso(7, 5, boton(pCaja, 'JUNAEB'), async () => {
      await e.moverA(pCaja, boton(pCaja, 'JUNAEB'));
      await e.esperar(500);
      await boton(pCaja, 'JUNAEB').dblclick();
      await e.esperar(2400);
    });
    const ultimas = pCaja.getByRole('listitem').filter({ hasText: 'JUNAEB' }).first();
    await paso(7, 6, ultimas, async () => {
      await e.clic(pCaja, ultimas.getByRole('button', { name: 'Deshacer' }), { despues: 700 });
      await confirmarSiPregunta(pCaja);
      await e.esperar(2000);
    });
    await paso(7, 7, boton(pCaja, 'Hipocalórico'), async () => {
      for (let i = 0; i < PORCIONES.Hipocalórico; i += 1) {
        await e.clic(pCaja, boton(pCaja, 'Hipocalórico'), { despues: 700 });
        const d = pCaja.getByRole('alertdialog');
        if (await d.isVisible().catch(() => false)) await e.clic(pCaja, d.getByRole('button').first(), { despues: 900 });
      }
      await expect(boton(pCaja, 'Hipocalórico')).toContainText(/Agotado/i);
      await e.moverA(pCaja, boton(pCaja, 'Hipocalórico'));
      await e.esperar(2600);
    });
  });

  await clip('m6b-cocina', kiosco, async (paso) => {
    const resumen = kiosco.getByText('Corregir cantidades o registrar reposición');
    await e.clic(kiosco, resumen, { despues: 900 });
    const campoFruta = kiosco.getByRole('spinbutton', { name: `Cuántas quedan de ${ACOMPANAMIENTOS.Fruta}` });
    const filaFruta = kiosco.locator('.stock-fila').filter({ has: campoFruta });
    await paso(6, 3, filaFruta, async () => {
      await e.clic(kiosco, campoFruta, { despues: 200 });
      await campoFruta.fill('');
      await e.escribir(kiosco, campoFruta, '0', { despues: 500 });
      await e.clic(kiosco, filaFruta.getByRole('button', { name: 'Fijar' }), { despues: 2000 });
    });
    const campoPollo = kiosco.getByRole('spinbutton', { name: `Cuántas quedan de ${PLATOS.General}` });
    const filaPollo = kiosco.locator('.stock-fila').filter({ has: campoPollo });
    await paso(6, 4, filaPollo, async () => {
      kiosco.once('dialog', (d) => d.accept('5'));
      await e.clic(kiosco, filaPollo.getByRole('button', { name: 'Repuse…' }), { despues: 2200 });
    });
    const campoLentejas = kiosco.getByRole('spinbutton', { name: `Cuántas quedan de ${PLATOS.JUNAEB}` });
    const filaLentejas = kiosco.locator('.stock-fila').filter({ has: campoLentejas });
    await paso(6, 5, filaLentejas, async () => {
      await e.clic(kiosco, campoLentejas, { despues: 200 });
      await campoLentejas.fill('');
      await e.escribir(kiosco, campoLentejas, '27', { retardo: 160, despues: 500 });
      await e.clic(kiosco, filaLentejas.getByRole('button', { name: 'Fijar' }), { despues: 2200 });
    });
  });

  const publico = await e.prepararContexto(browser);
  const tel = await e.abrirTelefono(publico, '/');
  await expect(tel.app.getByRole('heading', { level: 2, name: PLATOS.General })).toBeVisible();
  await tel.pagina.evaluate(() => document.getElementById('panel')?.remove());
  await clip('m10a-estudiante', tel.pagina, async (paso) => {
    const { pagina, app } = tel;
    await paso(10, 1, null, async () => {
      await e.esperar(1500);
      for (const c of ['JUNAEB', 'Vegetariano', 'General']) await e.clic(pagina, app.getByRole('button', { name: c, exact: true }), { despues: 1300 });
    });
    await paso(10, 2, null, async () => {
      const detalles = app.getByRole('button', { name: 'Ver detalles' }).first();
      if (await detalles.isVisible().catch(() => false)) await e.clic(pagina, detalles, { despues: 900 });
      for (let i = 0; i < 3; i += 1) {
        await e.desplazar(pagina, 300);
        await e.esperar(1000);
      }
      await e.desplazar(pagina, -900, { pasos: 16 });
    });
    await paso(10, 3, null, async () => {
      await e.clic(pagina, app.getByRole('button', { name: /Semanal/i }).first(), { despues: 1800 });
      await e.desplazar(pagina, 400);
      await e.esperar(1400);
      await e.desplazar(pagina, -400);
    });
    await paso(10, 4, null, async () => {
      const entrar = app.getByRole('button', { name: /Iniciar sesión|Abrir configuración|Mi cuenta|Ingresar/ }).first();
      await e.clic(pagina, entrar, { despues: 900 });
      const opcion = app.getByRole('button', { name: /Iniciar sesión|Ingresar con/ }).first();
      if (await opcion.isVisible().catch(() => false)) await e.clic(pagina, opcion, { despues: 1200 });
      const correo = app.getByPlaceholder('tunombre@duocuc.cl');
      if (await correo.isVisible().catch(() => false)) {
        await e.escribir(pagina, correo, ESTUDIANTE, { retardo: 55, despues: 500 });
        await e.clic(pagina, app.getByRole('button', { name: 'Continuar' }), { despues: 2600 });
      }
    });
  });
  await tel.pagina.close();

  const cuenta = await e.prepararContexto(browser, { sesion: sesionEstudiante });
  const telC = await e.abrirTelefono(cuenta, '/');
  await expect(telC.app.getByRole('heading', { level: 2, name: PLATOS.General })).toBeVisible();
  await telC.pagina.evaluate(() => document.getElementById('panel')?.remove());
  await clip('m10b-estudiante', telC.pagina, async (paso) => {
    const { pagina, app } = telC;
    let perfil;
    await paso(10, 5, null, async () => {
      const directo = app.getByRole('button', { name: 'Mi perfil' });
      if (await directo.isVisible().catch(() => false)) await e.clic(pagina, directo, { despues: 800 });
      else {
        await e.clic(pagina, app.getByRole('button', { name: 'Abrir configuración' }), { despues: 700 });
        await e.clic(pagina, app.getByRole('button', { name: /Cuenta y perfil/ }), { despues: 900 });
      }
      perfil = app.getByRole('dialog', { name: 'Mi perfil' });
      await expect(perfil).toBeVisible();
      await e.clic(pagina, perfil.getByRole('button', { name: 'Lácteos' }), { despues: 900 });
      const preferida = perfil.getByRole('combobox').first();
      if (await preferida.isVisible().catch(() => false)) {
        await e.moverA(pagina, preferida);
        await preferida.selectOption({ label: 'Vegetariano' }).catch(() => null);
        await e.esperar(900);
      }
    });
    await paso(10, 6, null, async () => {
      await e.clic(pagina, perfil.getByRole('checkbox', { name: /Menú de la semana/ }), { despues: 700 });
      await e.clic(pagina, perfil.getByRole('checkbox', { name: /Avisos de mis favoritos/ }), { despues: 900 });
      await e.clic(pagina, perfil.getByRole('button', { name: 'Guardar' }), { despues: 900 });
      await e.clic(pagina, perfil.getByRole('button', { name: 'Cerrar', exact: true }), { despues: 900 });
      await e.clic(pagina, app.getByRole('button', { name: `Marcar ${PLATOS.General} como favorito` }), { despues: 1800 });
    });
    await paso(10, 7, null, async () => {
      const detalles = app.getByRole('button', { name: 'Ver detalles' }).first();
      if (await detalles.isVisible().catch(() => false)) await e.clic(pagina, detalles, { despues: 700 });
      const candidata = app.locator('.opinion').filter({ has: app.getByRole('button', { name: 'Calificar' }) }).first();
      await candidata.evaluate((el) => el.setAttribute('data-demo', 'opinion'));
      const opinion = app.locator('[data-demo="opinion"]');
      await e.clic(pagina, opinion.getByRole('button', { name: 'Calificar' }), { despues: 800 });
      await e.clic(pagina, opinion.getByRole('button', { name: '5 estrellas' }), { despues: 600 });
      await e.escribir(pagina, opinion.getByPlaceholder(/¿Qué te pareció\?/), COMENTARIO, { retardo: 45, despues: 600 });
      await e.clic(pagina, opinion.getByRole('button', { name: 'Guardar' }), { despues: 2200 });
    });
    await paso(10, 8, null, async () => {
      await e.clic(pagina, app.getByRole('button', { name: /Preguntas/i }).first(), { despues: 1600 });
      const primera = app.locator('details summary, [aria-expanded]').first();
      if (await primera.isVisible().catch(() => false)) await e.clic(pagina, primera, { despues: 1800 });
      await e.desplazar(pagina, 300);
      await e.esperar(1600);
    });
  });
  await telC.pagina.close();

  const compartido = await e.prepararContexto(browser);
  const login = await compartido.newPage();
  await login.goto('/#/login');
  await expect(login.getByPlaceholder('tunombre@duocuc.cl')).toBeVisible();
  let kiosco2 = login;
  await clip('m6c-modo-cocina', login, async (paso) => {
    await paso(6, 6, login.locator('form').first(), async () => {
      await e.escribir(login, login.getByPlaceholder('tunombre@duocuc.cl'), 'personal@duocuc.cl', { retardo: 55, despues: 400 });
      await e.clic(login, login.getByRole('button', { name: 'Continuar' }), { despues: 1200 });
      await e.escribir(login, login.getByLabel('Contraseña'), CLAVE_DEMO, { retardo: 70, despues: 400 });
      await e.clic(login, login.getByRole('checkbox', { name: /dispositivo compartido de cocina/ }), { despues: 1600 });
      await e.clic(login, login.getByRole('button', { name: 'Ingresar' }), { despues: 2600 });
    });
  });

  await kiosco.reload();
  await expect(kiosco.getByRole('button', { name: 'Cerrar jornada' })).toBeVisible();
  await clip('m6d-cocina', kiosco, async (paso) => {
    await paso(6, 7, kiosco.locator('main'), async () => {
      await e.clic(kiosco, kiosco.getByRole('button', { name: 'Cerrar jornada' }), { despues: 1400 });
      const pan = kiosco.getByRole('spinbutton', { name: new RegExp(`^Pan: ${ACOMPANAMIENTOS.Pan}`) });
      if (await pan.isVisible().catch(() => false)) await e.escribir(kiosco, pan, '4', { despues: 700 });
      await e.clic(kiosco, kiosco.getByRole('button', { name: 'Confirmar cierre' }), { despues: 700 });
      await confirmarSiPregunta(kiosco);
      await expect(kiosco.getByRole('heading', { level: 2, name: /Jornada cerrada a las/ })).toBeVisible();
      await e.moverA(kiosco, kiosco.getByRole('heading', { level: 2, name: /Jornada cerrada a las/ }));
      await e.desplazar(kiosco, 300);
      await e.esperar(2400);
      await e.desplazar(kiosco, -300);
    });
    await paso(6, 8, kiosco.getByRole('button', { name: 'Corregir conteo' }), async () => {
      await e.clic(kiosco, kiosco.getByRole('button', { name: 'Corregir conteo' }), { despues: 1200 });
      const sopa = kiosco.getByRole('spinbutton', { name: `Cantidad real de ${ACOMPANAMIENTOS.Sopa}` });
      await e.clic(kiosco, sopa, { despues: 200 });
      await sopa.fill('');
      await e.escribir(kiosco, sopa, '6', { despues: 500 });
      await e.clic(kiosco, kiosco.getByRole('button', { name: /Guardar/ }), { despues: 2400 });
    });
  });

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

  fs.writeFileSync(path.join(SALIDA, 'clips.json'), JSON.stringify({ fecha: hoyChile(), clips, fallas }, null, 1));
  for (const c of [cocina, cajaCtx, publico, cuenta, compartido, admin]) await c.close();
  void kiosco2;
});
