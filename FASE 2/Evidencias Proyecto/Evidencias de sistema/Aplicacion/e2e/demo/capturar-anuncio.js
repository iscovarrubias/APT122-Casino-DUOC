const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');
const { Api, hoyChile } = require('../soporte/api');
const bd = require('../soporte/bd');
const { entornoBackend } = require('../soporte/entorno');

const BACKEND = path.resolve(__dirname, '../../backend');
const SALIDA = path.join(__dirname, 'salida', 'anuncio', 'capturas');

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
const PORCIONES_GENERAL = 5;
const ESTUDIANTE = 'josefa.cofre@duocuc.cl';
const NOMBRE_ESTUDIANTE = 'Josefa Cofré';
const COMENTARIO = 'Muy rico el pollo asado y las papas bien crujientes.';
const TELEFONO = { viewport: { width: 440, height: 899 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const cajas = {};
const medir = async (nombre, loc) => {
  cajas[nombre] = await loc.boundingBox();
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function contexto(browser, opciones, sesion) {
  const c = await browser.newContext({ ...opciones, locale: 'es-CL', timezoneId: 'America/Santiago' });
  await c.addInitScript(() => {
    try {
      sessionStorage.setItem('casino_splash_visto', '1');
    } catch {}
  });
  if (sesion) {
    await c.addInitScript((s) => {
      try {
        localStorage.setItem('casino_sesion', JSON.stringify(s));
      } catch {}
    }, sesion);
  }
  await c.addInitScript(() => {
    const s = document.createElement('style');
    s.textContent = 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}*{caret-color:transparent}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
  });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  return c;
}

async function foto(pagina, nombre, opciones = {}) {
  await esperar(opciones.espera ?? 700);
  await pagina.screenshot({ path: path.join(SALIDA, `${nombre}.png`), animations: 'disabled', ...opciones.extra });
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
  for (const viejo of ['valentina.soto@duocuc.cl', ESTUDIANTE]) {
    const u = await bd.consulta('SELECT id_usuario FROM usuario WHERE email = $1', [viejo]);
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
      cantidad_planificada: categoria === 'General' ? PORCIONES_GENERAL : 30,
    });
    idMenu = r.menu.id_menu;
  }
  for (const [tipo, nombre] of Object.entries(ACOMPANAMIENTOS)) {
    await api.admin('POST', '/menu/planificacion', {
      fecha,
      id_preparacion: await api.idPreparacion(nombre),
      tipo_componente: tipo,
      cantidad_planificada: 40,
    });
  }
  await api.admin('PATCH', `/menu/${idMenu}/publicar`);
  const caja = await api.sesion('cajero@duocuc.cl');
  await api.pedir('POST', '/jornada/iniciar', {}, caja.token);
  const alumno = await api.pedir('POST', '/auth/duoc', { email: ESTUDIANTE });
  await bd.consulta('UPDATE usuario SET nombre = $1 WHERE email = $2', [NOMBRE_ESTUDIANTE, ESTUDIANTE]);
  alumno.usuario.nombre = NOMBRE_ESTUDIANTE;
  return { caja, alumno: { token: alumno.token, usuario: alumno.usuario, kiosco: false } };
}

test('capturas del anuncio', async ({ browser }) => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const api = new Api();
  const { caja, alumno } = await prepararDatos(api);
  const vender = () => api.pedir('POST', '/jornada/ventas', { categoria: 'General', opcion: 'Fruta' }, caja.token);

  const escritorio = await contexto(browser, { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const web = await escritorio.newPage();
  await web.goto('/');
  await expect(web.getByRole('heading', { level: 2, name: PLATOS.General })).toBeVisible();
  await foto(web, 'web-menu', { espera: 1500 });
  await web.close();

  const publico = await contexto(browser, TELEFONO);
  const tel = await publico.newPage();
  await tel.goto('/');
  const titulo = tel.getByRole('heading', { level: 2, name: PLATOS.General });
  await expect(titulo).toBeVisible();
  await foto(tel, 'tel-general', { espera: 1500 });
  for (const c of ['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico']) await medir(`cat-${c}`, tel.getByRole('button', { name: c, exact: true }));
  await medir('imagen', tel.locator('main img').first());
  for (const [i, categoria] of ['JUNAEB', 'Vegetariano', 'Hipocalórico'].entries()) {
    await tel.getByRole('button', { name: categoria, exact: true }).click();
    await expect(tel.getByRole('heading', { level: 2, name: PLATOS[categoria] })).toBeVisible();
    await foto(tel, `tel-cat-${i + 1}`, { espera: 900 });
    await tel.locator('main img').first().screenshot({ path: path.join(SALIDA, `plato-${i + 1}.png`) });
  }
  await tel.getByRole('button', { name: 'General', exact: true }).click();
  await expect(titulo).toBeVisible();
  const imagen = tel.locator('main img').first();
  await imagen.screenshot({ path: path.join(SALIDA, 'plato-0.png') });

  await tel.close();
  await publico.close();

  const cuenta = await contexto(browser, TELEFONO, alumno);
  const tc = await cuenta.newPage();
  await tc.goto('/');
  await expect(tc.getByRole('heading', { level: 2, name: PLATOS.General })).toBeVisible();
  await foto(tc, 'tel-cuenta', { espera: 1500 });
  const corazon = tc.getByRole('button', { name: `Marcar ${PLATOS.General} como favorito` });
  await corazon.screenshot({ path: path.join(SALIDA, 'corazon-vacio.png') });
  await medir('corazon', corazon);
  await corazon.click();
  await foto(tc, 'tel-fav', { espera: 900 });
  const directo = tc.getByRole('button', { name: 'Mi perfil' });
  if (await directo.isVisible().catch(() => false)) await directo.click();
  else {
    await tc.getByRole('button', { name: 'Abrir configuración' }).click();
    await tc.getByRole('button', { name: /Cuenta y perfil/ }).click();
  }
  const perfil = tc.getByRole('dialog', { name: 'Mi perfil' });
  await expect(perfil).toBeVisible();
  await perfil.getByRole('button', { name: 'Lácteos' }).click();
  await perfil.getByRole('button', { name: 'Guardar' }).click();
  await expect(perfil.getByText('Cambios guardados.')).toBeVisible();
  await perfil.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await tc.getByRole('button', { name: 'Vegetariano', exact: true }).click();
  const alerta = tc.getByRole('alert').filter({ hasText: 'Este menú contiene alérgenos de tu perfil' });
  await expect(alerta).toBeVisible();
  await alerta.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await foto(tc, 'tel-alergeno', { espera: 900 });
  await medir('alerta', alerta);
  await tc.getByRole('button', { name: 'General', exact: true }).click();
  const detalles = tc.getByRole('button', { name: 'Ver detalles' }).first();
  if (await detalles.isVisible().catch(() => false)) await detalles.click();
  const candidata = tc.locator('.opinion').filter({ has: tc.getByRole('button', { name: 'Calificar' }) }).first();
  await candidata.evaluate((el) => el.setAttribute('data-demo', 'opinion'));
  const opinion = tc.locator('[data-demo="opinion"]');
  await opinion.getByRole('button', { name: 'Calificar' }).click();
  await opinion.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await foto(tc, 'tel-estrellas-0', { espera: 900 });
  for (let n = 1; n <= 5; n += 1) await medir(`estrella-${n}`, opinion.getByRole('button', { name: n === 1 ? /^1 estrella/ : `${n} estrellas` }));
  await medir('comentario', opinion.getByPlaceholder(/¿Qué te pareció\?/));
  for (let n = 1; n <= 5; n += 1) {
    await opinion.getByRole('button', { name: n === 1 ? /^1 estrella/ : `${n} estrellas` }).click();
    await foto(tc, `tel-estrellas-${n}`, { espera: 400 });
  }
  const campo = opinion.getByPlaceholder(/¿Qué te pareció\?/);
  await campo.click();
  const palabras = COMENTARIO.split(' ');
  for (let i = 1; i <= palabras.length; i += 1) {
    await campo.fill(palabras.slice(0, i).join(' '));
    await foto(tc, `tel-comentario-${String(i).padStart(2, '0')}`, { espera: 250 });
  }
  await opinion.getByRole('button', { name: 'Guardar' }).click();
  await expect(opinion).toContainText(/5\.0 - 1 voto/);
  await foto(tc, 'tel-opinion-guardada', { espera: 900 });
  await tc.close();
  await cuenta.close();

  const publico2 = await contexto(browser, TELEFONO);
  const tel2 = await publico2.newPage();
  await tel2.goto('/');
  await expect(tel2.getByRole('heading', { level: 2, name: PLATOS.General })).toBeVisible();
  const quedan = tel2.getByText(new RegExp(`Quedan ${PORCIONES_GENERAL}\\b`)).first();
  await expect(quedan).toBeVisible();
  await quedan.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await foto(tel2, 'tel-quedan-5');
  await medir('quedan', quedan);
  await medir('reloj', tel2.getByRole('button', { name: 'Hora estimada de agotamiento del menú General' }));
  for (let n = PORCIONES_GENERAL - 1; n >= 3; n -= 1) {
    await vender();
    await expect(tel2.getByText(new RegExp(`Quedan ${n}\\b`)).first()).toBeVisible({ timeout: 10000 });
    await foto(tel2, `tel-quedan-${n}`, { espera: 1500 });
  }
  const reloj = tel2.getByRole('button', { name: 'Hora estimada de agotamiento del menú General' });
  await reloj.click();
  await foto(tel2, 'tel-reloj', { espera: 1200 });
  cajas.horaEstimada = (await tel2.getByText(/Se agotar[ií]a cerca de las/).first().innerText()).match(/\d{1,2}:\d{2}/)[0];
  await reloj.click();
  for (let n = 2; n >= 0; n -= 1) await vender();
  await expect(tel2.locator('main')).toContainText(/Agotado/i, { timeout: 10000 });
  await foto(tel2, 'tel-agotado', { espera: 1200 });
  await tel2.close();
  await publico2.close();
  fs.writeFileSync(path.join(SALIDA, 'listo.json'), JSON.stringify({ fecha: hoyChile(), hora: new Date().toISOString(), cajas }, null, 1));
  await escritorio.close();
});
