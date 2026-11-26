const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { Api } = require('../soporte/api');
const bd = require('../soporte/bd');
const { grabar } = require('./grabador');
const e = require('./escena');

const SALIDA = path.join(__dirname, 'salida', 'manuales');
const CUADROS = path.join(SALIDA, 'cuadros');
const CLAVE_DEMO = 'Test1234';
const PLATO_NUEVO = 'Pollo al limón con papas doradas';
const INGREDIENTE_NUEVO = 'Quínoa blanca';
const USUARIO = { nombre: 'Camila Rojas', email: 'camila.rojas@duocuc.cl', clave: 'CasinoDemo2026' };
const FOTO = path.join(__dirname, 'recursos', 'foto-plato.webp');
const DIA_PLAN = '2026-11-27';
const DIA_COPIA = '2026-11-30';

const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
const ARCHIVO = SOLO ? `clips-panel-${SOLO.join('-')}.json` : 'clips-panel.json';
const clips = [];
const fallas = [];

async function caja(pagina, locator) {
  try {
    const b = await locator.boundingBox();
    return b && { x: b.x, y: b.y, w: b.width, h: b.height };
  } catch {
    return null;
  }
}

async function clip(nombre, pagina, accion) {
  if (SOLO && !SOLO.includes(nombre)) return;
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
      fallas.push(`${video} paso ${numero}: ${String(err.message).slice(0, 300)}`);
    }
    await e.esperar(350);
    const f1 = foco ? await caja(pagina, foco) : null;
    registro.pasos.push({ video, paso: numero, t0, t1: Date.now() / 1000, foco: f0 || f1 });
  };
  try {
    await accion(paso);
  } finally {
    await e.esperar(700);
    await g.detener();
    clips.push(registro);
    fs.writeFileSync(path.join(SALIDA, ARCHIVO), JSON.stringify({ clips, fallas }, null, 1));
  }
}

async function confirmarSiPregunta(pagina) {
  const dialogo = pagina.getByRole('alertdialog');
  if (await dialogo.isVisible().catch(() => false)) await e.clic(pagina, dialogo.getByRole('button').last(), { despues: 600 });
}

const diaMes = (iso) => String(Number(iso.slice(8, 10)));

async function limpiar() {
  for (const fecha of [DIA_PLAN, DIA_COPIA]) await bd.limpiarDia(fecha);
  const u = await bd.consulta('SELECT id_usuario FROM usuario WHERE email = $1', [USUARIO.email]);
  if (u.length) await bd.consulta('DELETE FROM usuario WHERE id_usuario = $1', [u[0].id_usuario]).catch(() => null);
  for (const nombre of [PLATO_NUEVO, `${PLATO_NUEVO} (variación)`, 'Pollo Asado con Papas fritas y Arroz (sin sal)']) {
    await bd.consulta('DELETE FROM preparacion WHERE nombre = $1', [nombre]).catch(() => null);
  }
  await bd.consulta('DELETE FROM ingrediente WHERE nombre = $1', [INGREDIENTE_NUEVO]).catch(() => null);
}

async function elegirOpcion(locator, patrones) {
  const opciones = await locator.locator('option').allInnerTexts();
  for (const p of patrones) {
    const o = opciones.find((x) => p.test(x));
    if (o) {
      await locator.selectOption({ label: o });
      return o;
    }
  }
  await locator.selectOption({ index: 1 });
  return null;
}

test('material del panel', async ({ browser }) => {
  fs.mkdirSync(CUADROS, { recursive: true });
  await limpiar();
  const api = new Api();
  const sesion = {
    admin: await api.sesion('admin@duocuc.cl'),
    personal: await api.sesion('personal@duocuc.cl'),
    caja: await api.sesion('cajero@duocuc.cl'),
    nutricion: await api.sesion('nutricionista@duocuc.cl'),
  };
  for (const s of Object.values(sesion)) await api.pedir('PATCH', '/auth/tema', { tema: 'claro' }, s.token).catch(() => null);

  const libre = await e.prepararContexto(browser);
  const login = await libre.newPage();
  await login.goto('/#/login');
  await expect(login.getByPlaceholder('tunombre@duocuc.cl')).toBeVisible();
  await clip('m3-panel', login, async (paso) => {
    await paso(3, 1, login.locator('form').first(), async () => {
      await e.escribir(login, login.getByPlaceholder('tunombre@duocuc.cl'), 'admin@duocuc.cl', { retardo: 60, despues: 500 });
      await e.clic(login, login.getByRole('button', { name: 'Continuar' }), { despues: 1500 });
    });
    await paso(3, 2, login.locator('form').first(), async () => {
      await e.escribir(login, login.getByLabel('Contraseña'), CLAVE_DEMO, { retardo: 80, despues: 600 });
      await e.clic(login, login.getByRole('button', { name: 'Ingresar' }), { despues: 1200 });
      await login.evaluate(() => window.scrollTo(0, 0));
      await e.esperar(1200);
    });
    await paso(3, 3, login.locator('aside, nav').first(), async () => {
      const items = login.locator('aside').getByRole('button');
      const n = await items.count();
      let hechos = 0;
      for (let i = 0; i < n && hechos < 6; i += 1) {
        const b = items.nth(i);
        if (!(await b.isVisible().catch(() => false))) continue;
        const nombre = (await b.getAttribute('aria-label')) || (await b.innerText());
        if (/configuración|modo|sesión|público/i.test(nombre)) continue;
        await e.moverA(login, b);
        await e.esperar(550);
        hechos += 1;
      }
      await e.esperar(800);
    });
    await paso(3, 5, login.getByRole('button', { name: /¿Qué significa\?/ }).first(), async () => {
      await e.clic(login, login.getByRole('button', { name: /¿Qué significa\?/ }).first(), { despues: 3200 });
      await login.keyboard.press('Escape');
      await e.esperar(500);
    });
    await paso(3, 6, login.getByRole('button', { name: 'Cambiar a modo oscuro' }).first(), async () => {
      await e.clic(login, login.getByRole('button', { name: 'Cambiar a modo oscuro' }).first(), { despues: 2600 });
      await e.clic(login, login.getByRole('button', { name: 'Cambiar a modo claro' }).first(), { despues: 1600 });
    });
    await paso(3, 7, login.getByRole('button', { name: /Cerrar sesión/ }).first(), async () => {
      await e.moverA(login, login.getByRole('button', { name: /Ver menú público/ }).first());
      await e.esperar(1600);
      await e.clic(login, login.getByRole('button', { name: /Cerrar sesión/ }).first(), { despues: 900 });
      await confirmarSiPregunta(login);
      await login.evaluate(() => window.scrollTo(0, 0));
      await e.esperar(1800);
    });
  });

  const roles = await e.prepararContexto(browser, { sesion: sesion.admin });
  const pRoles = await roles.newPage();
  await pRoles.goto('/#/panel/menu');
  await expect(pRoles.getByRole('heading', { level: 1, name: /Planificación/ })).toBeVisible();
  await clip('m3-roles', pRoles, async (paso) => {
    await paso(3, 4, pRoles.locator('aside').first(), async () => {
      for (const [s, ruta] of [[sesion.admin, '/#/panel/menu'], [sesion.personal, '/#/panel/kiosco'], [sesion.caja, '/#/panel/caja'], [sesion.nutricion, '/#/panel/preparaciones']]) {
        await pRoles.evaluate((v) => localStorage.setItem('casino_sesion', JSON.stringify({ token: v.token, usuario: v.usuario, kiosco: false })), s);
        await pRoles.goto(ruta);
        await pRoles.reload();
        await e.esperar(2600);
      }
    });
  });
  await roles.close();

  const admin = await e.prepararContexto(browser, { sesion: sesion.admin });
  const plan = await admin.newPage();
  await plan.goto('/#/panel/menu');
  await expect(plan.getByRole('button', { name: 'Guardar todo el menú' })).toBeVisible();
  const tarjeta = (nombre) => plan.locator('article').filter({ has: plan.getByRole('combobox', { name: `Preparación para ${nombre}`, exact: true }) });
  await clip('m4-plan', plan, async (paso) => {
    await paso(4, 1, plan.getByRole('textbox', { name: 'Fecha del menú' }), async () => {
      const campo = plan.getByRole('textbox', { name: 'Fecha del menú' });
      await e.clic(plan, campo, { despues: 400 });
      await campo.fill('27/11/2026');
      await campo.press('Enter');
      await expect(plan.getByText(/^Mañana - |^En \d+ días? - /)).toBeVisible();
      await expect(plan.getByText(/(Faltan \d+ de 9 componentes|Día completo)/)).toBeVisible();
      await e.esperar(1600);
    });
    await paso(4, 2, tarjeta('General'), async () => {
      const t = tarjeta('General');
      await e.moverA(plan, t.getByRole('combobox'));
      await t.getByRole('combobox').selectOption({ label: 'Pollo Asado con Papas fritas y Arroz' });
      await e.esperar(900);
      await e.clic(plan, plan.getByRole('button', { name: 'Ver receta de General' }), { despues: 2600 });
      const modal = plan.getByRole('dialog', { name: /Receta de/ });
      await e.esperar(400);
      const x = modal.getByRole('button', { name: 'Cerrar', exact: true }).first();
      if (await x.isVisible().catch(() => false)) await e.clic(plan, x, { despues: 700 });
      else await plan.keyboard.press('Escape');
      await expect(modal).toHaveCount(0);
    });
    await paso(4, 3, tarjeta('General'), async () => {
      await e.clic(plan, tarjeta('General').getByRole('button', { name: 'Usar' }), { despues: 1800 });
    });
    await paso(4, 4, plan.locator('main'), async () => {
      for (const [cat, plato] of [['JUNAEB', 'Lentejas a la Parmesana'], ['Vegetariano', 'Budín de Zapallitos Italianos con Arroz Piamontesa'], ['Hipocalórico', 'Pollo Asado con Ensaladas']]) {
        const t = tarjeta(cat);
        await e.moverA(plan, t.getByRole('combobox'));
        await t.getByRole('combobox').selectOption({ label: plato });
        await e.clic(plan, t.getByRole('button', { name: 'Usar' }), { despues: 500 });
      }
      for (const [tipo, plato] of [['Ensalada', 'Ensalada chilena'], ['Sopa', 'Sopa de verduras'], ['Pan', 'Pan amasado'], ['Postre', 'Flan de caramelo'], ['Fruta', 'Manzana'], ['Bebida', 'Jugo de naranja']]) {
        const t = tarjeta(tipo);
        await e.moverA(plan, t.getByRole('combobox'));
        await t.getByRole('combobox').selectOption({ label: plato });
        const usar = t.getByRole('button', { name: 'Usar' });
        if (await usar.isVisible().catch(() => false)) await e.clic(plan, usar, { despues: 300 });
        else await t.getByRole('spinbutton').first().fill('50');
        await e.esperar(300);
      }
      await e.desplazar(plan, -2000, { pasos: 14 });
      await e.moverA(plan, plan.getByText(/(Faltan \d+ de 9 componentes|Día completo)/).first());
      await e.esperar(1500);
    });
    await paso(4, 5, plan.getByRole('button', { name: 'Especial para un menú' }), async () => {
      await e.clic(plan, plan.getByRole('button', { name: 'Especial para un menú' }), { despues: 900 });
      const d = plan.getByRole('dialog', { name: 'Acompañamiento especial' });
      await e.moverA(plan, d.getByRole('combobox', { name: 'Categoría' }));
      await d.getByRole('combobox', { name: 'Categoría' }).selectOption('JUNAEB');
      await e.esperar(500);
      await d.getByRole('combobox', { name: 'Tipo de acompañamiento' }).selectOption('Bebida');
      await e.esperar(500);
      await elegirOpcion(d.getByRole('combobox', { name: 'Preparación' }), [/Agua/, /sin azúcar/i]);
      await e.escribir(plan, d.getByRole('spinbutton', { name: 'Cantidad' }), '20', { despues: 500 });
      await e.clic(plan, d.getByRole('button', { name: 'Crear especial' }), { despues: 2000 });
    });
    await paso(4, 6, plan.getByRole('button', { name: 'Guardar todo el menú' }), async () => {
      await e.clic(plan, plan.getByRole('button', { name: 'Guardar todo el menú' }), { despues: 1600 });
      await e.clic(plan, plan.getByRole('button', { name: 'Publicar menú' }).first(), { despues: 900 });
      await confirmarSiPregunta(plan);
      await e.esperar(1800);
    });
    await paso(4, 7, plan.locator('main'), async () => {
      await e.clic(plan, plan.getByRole('button', { name: 'Mes', exact: true }), { despues: 1400 });
      await e.clic(plan, plan.getByRole('button', { name: 'Copiar y pegar' }), { despues: 1000 });
      await e.clic(plan, plan.getByRole('button', { name: new RegExp(`^${diaMes(DIA_PLAN)} `) }).first(), { despues: 800 });
      await e.clic(plan, plan.getByRole('button', { name: new RegExp(`^${diaMes(DIA_COPIA)} `) }).first(), { despues: 800 });
      await confirmarSiPregunta(plan);
      const pegar = plan.getByRole('button', { name: /^Pegar/ }).first();
      if (await pegar.isVisible().catch(() => false)) await e.clic(plan, pegar, { despues: 800 });
      await confirmarSiPregunta(plan);
      await e.esperar(2400);
    });
    await paso(4, 8, plan.getByRole('button', { name: 'Exportar' }), async () => {
      await e.clic(plan, plan.getByRole('button', { name: 'Exportar' }), { despues: 900 });
      const d = plan.getByRole('dialog', { name: 'Exportar menú' });
      for (const n of ['Semana', 'Mes completo']) {
        const op = d.getByRole('button', { name: n, exact: true });
        if (await op.isVisible().catch(() => false)) {
          await e.clic(plan, op, { despues: 600 });
          break;
        }
      }
      for (const n of ['Excel', 'Imagen (PNG)']) {
        const op = d.getByRole('button', { name: n, exact: true });
        if (await op.isVisible().catch(() => false)) await e.clic(plan, op, { despues: 1200 });
      }
      await e.esperar(800);
      const cancelar = d.getByRole('button', { name: /Cancelar|Cerrar/ }).first();
      if (await cancelar.isVisible().catch(() => false)) await e.clic(plan, cancelar, { despues: 800 });
      else await plan.keyboard.press('Escape');
    });
  });

  const ing = await admin.newPage();
  await ing.goto('/#/panel/ingredientes');
  await expect(ing.getByRole('heading', { level: 1, name: /Ingredientes/ })).toBeVisible();
  await clip('m5-ing', ing, async (paso) => {
    await paso('5B', 1, ing.getByRole('button', { name: 'Nuevo ingrediente' }), async () => {
      await e.clic(ing, ing.getByRole('button', { name: 'Nuevo ingrediente' }), { despues: 900 });
      const f = ing.getByRole('dialog', { name: 'Nuevo ingrediente' });
      await e.escribir(ing, f.getByRole('textbox', { name: /^Nombre/ }), INGREDIENTE_NUEVO, { despues: 400 });
      await e.moverA(ing, f.getByRole('combobox', { name: 'Categoría' }));
      await f.getByRole('combobox', { name: 'Categoría' }).selectOption('Cereales y legumbres');
      await e.esperar(500);
      for (const [campo, valor] of [['Calorías (kcal)', '368'], ['Proteínas (g)', '14.1'], ['Carbohidratos (g)', '64.2'], ['Grasas (g)', '6.1']]) {
        await e.escribir(ing, f.getByRole('spinbutton', { name: campo }), valor, { retardo: 90, despues: 250 });
      }
      await e.clic(ing, f.getByRole('button', { name: 'Guardar ingrediente' }), { despues: 2000 });
    });
    await paso('5B', 2, ing.getByText(/Solo sin información nutricional/), async () => {
      await e.clic(ing, ing.getByText(/Solo sin información nutricional/), { despues: 2600 });
      await e.desplazar(ing, 300);
      await e.esperar(1200);
      await e.desplazar(ing, -300);
      await e.clic(ing, ing.getByText(/Solo sin información nutricional/), { despues: 800 });
    });
  });

  const prep = await admin.newPage();
  await prep.goto('/#/panel/preparaciones');
  await expect(prep.getByRole('heading', { level: 1, name: /Preparaciones/ })).toBeVisible();
  await clip('m5-prep', prep, async (paso) => {
    const form = prep.getByRole('dialog', { name: 'Nueva preparación' });
    await paso('5A', 3, prep.getByRole('button', { name: 'Nuevo plato' }), async () => {
      await e.clic(prep, prep.getByRole('button', { name: 'Nuevo plato' }), { despues: 900 });
      await e.escribir(prep, form.getByRole('textbox', { name: 'Nombre' }), PLATO_NUEVO, { despues: 300 });
      await e.escribir(prep, form.getByRole('textbox', { name: 'Descripción' }), 'Trutro de pollo al horno con limón y papas doradas.', { retardo: 25, despues: 300 });
      const lista = [[/^Pollo/, '180'], [/^Papa/, '200'], [/Limón|Limon/, '15'], [/Mantequilla|Leche/, '10']];
      for (let i = 0; i < lista.length; i += 1) {
        await e.clic(prep, form.getByRole('button', { name: 'Agregar ingrediente' }), { despues: 300 });
        await e.moverA(prep, form.getByRole('combobox', { name: `Ingrediente ${i + 1}` }));
        await elegirOpcion(form.getByRole('combobox', { name: `Ingrediente ${i + 1}` }), [lista[i][0]]);
        await e.escribir(prep, form.getByRole('spinbutton', { name: `Gramos del ingrediente ${i + 1}` }), lista[i][1], { despues: 300 });
      }
      await e.escribir(prep, form.getByRole('spinbutton', { name: 'La receta rinde (porciones)' }), '1', { despues: 500 });
    });
    await paso('5A', 4, form.getByRole('status').filter({ hasText: 'Alérgenos sugeridos' }), async () => {
      const s = form.getByRole('status').filter({ hasText: 'Alérgenos sugeridos' });
      await e.moverA(prep, s);
      await e.esperar(1200);
      await e.clic(prep, s.getByRole('button', { name: 'Agregar los sugeridos' }), { despues: 1800 });
    });
    await paso('5A', 5, form.getByRole('button', { name: 'Calcular desde los ingredientes' }), async () => {
      await e.clic(prep, form.getByRole('button', { name: 'Calcular desde los ingredientes' }), { despues: 2600 });
    });
    await paso('5A', 6, null, async () => {
      const entrada = form.locator('input[type=file]').first();
      await e.moverA(prep, form.getByText(/foto/i).first());
      await entrada.setInputFiles(FOTO);
      const recorte = prep.getByRole('dialog', { name: 'Ajustar la foto' });
      await expect(recorte.getByRole('button', { name: 'Usar esta foto' })).toBeEnabled();
      await e.esperar(1600);
      await e.clic(prep, recorte.getByRole('button', { name: 'Usar esta foto' }), { despues: 1400 });
      await e.clic(prep, form.getByRole('button', { name: 'Guardar plato' }), { despues: 2200 });
      if (process.env.SONDA) await prep.screenshot({ path: '/tmp/sonda.png' });
    });
    await paso('5A', 7, null, async () => {
      await prep.goto('/#/panel/menu');
      await expect(prep.getByRole('button', { name: 'Ver receta de General' })).toBeVisible();
      await e.esperar(800);
      await e.clic(prep, prep.getByRole('button', { name: 'Ver receta de General' }), { despues: 1200 });
      await e.clic(prep, prep.getByRole('dialog').getByRole('button', { name: 'Crear variación' }), { despues: 1200 });
      const v = prep.getByRole('dialog', { name: 'Nueva preparación' });
      const nombre = v.getByRole('textbox', { name: 'Nombre' });
      await e.clic(prep, nombre, { despues: 200 });
      await nombre.fill('');
      await e.escribir(prep, nombre, 'Pollo Asado con Papas fritas y Arroz (sin sal)', { retardo: 30, despues: 1200 });
      await e.moverA(prep, v.getByText('La receta original no se modifica.', { exact: false }));
      await e.esperar(1600);
      await e.clic(prep, v.getByRole('button', { name: /Guardar/ }).last(), { despues: 1800 });
    });
    await paso('5A', 8, null, async () => {
      await prep.goto('/#/panel/preparaciones');
      await expect(prep.getByRole('button', { name: `Más acciones de ${PLATO_NUEVO}` })).toBeVisible();
      await e.clic(prep, prep.getByRole('button', { name: `Más acciones de ${PLATO_NUEVO}` }), { despues: 600 });
      await e.clic(prep, prep.getByRole('menuitem', { name: 'Desactivar' }), { despues: 600 });
      await e.clic(prep, prep.getByRole('alertdialog').getByRole('button', { name: 'Desactivar' }), { despues: 1800 });
      await e.clic(prep, prep.getByRole('button', { name: `Más acciones de ${PLATO_NUEVO}` }), { despues: 600 });
      await e.clic(prep, prep.getByRole('menuitem', { name: 'Reactivar' }), { despues: 600 });
      await confirmarSiPregunta(prep);
      await e.esperar(1800);
    });
  });

  const usr = await admin.newPage();
  await usr.goto('/#/panel/usuarios');
  await expect(usr.getByRole('heading', { level: 1, name: /Usuarios/ })).toBeVisible();
  const fila = () => usr.getByRole('row', { name: new RegExp(USUARIO.nombre) });
  await clip('m9-usuarios', usr, async (paso) => {
    await paso(9, 1, usr.getByRole('searchbox', { name: 'Buscar usuario' }), async () => {
      await e.escribir(usr, usr.getByRole('searchbox', { name: 'Buscar usuario' }), 'cajero', { despues: 1600 });
      await usr.getByRole('searchbox', { name: 'Buscar usuario' }).fill('');
      await e.moverA(usr, usr.getByRole('combobox', { name: 'Filtrar por rol' }));
      await usr.getByRole('combobox', { name: 'Filtrar por rol' }).selectOption('Nutricionista');
      await e.esperar(1800);
      await usr.getByRole('combobox', { name: 'Filtrar por rol' }).selectOption({ index: 0 });
      await e.esperar(800);
    });
    await paso(9, 2, usr.getByRole('button', { name: 'Nuevo usuario' }), async () => {
      await e.clic(usr, usr.getByRole('button', { name: 'Nuevo usuario' }), { despues: 800 });
      const f = usr.getByRole('dialog', { name: 'Nuevo usuario' });
      await e.escribir(usr, f.getByRole('textbox', { name: 'Nombre' }), USUARIO.nombre, { despues: 300 });
      await e.escribir(usr, f.getByRole('textbox', { name: 'Correo' }), USUARIO.email, { retardo: 40, despues: 300 });
      await e.escribir(usr, f.getByRole('textbox', { name: /^Contraseña/ }), USUARIO.clave, { retardo: 50, despues: 300 });
      await e.moverA(usr, f.getByRole('combobox', { name: 'Rol' }));
      await f.getByRole('combobox', { name: 'Rol' }).selectOption('Cajero');
      await e.esperar(700);
      await e.clic(usr, f.getByRole('button', { name: 'Crear usuario' }), { despues: 2000 });
    });
    await paso(9, 3, usr.getByRole('combobox', { name: `Rol de ${USUARIO.nombre}` }), async () => {
      const rol = usr.getByRole('combobox', { name: `Rol de ${USUARIO.nombre}` });
      await e.moverA(usr, rol);
      await rol.selectOption('Personal Casino');
      await confirmarSiPregunta(usr);
      await e.esperar(2000);
    });
    await paso(9, 4, fila(), async () => {
      await e.clic(usr, fila().getByRole('button', { name: 'Cambiar contraseña' }), { despues: 700 });
      await e.escribir(usr, usr.getByRole('textbox', { name: `Nueva contraseña de ${USUARIO.nombre}` }), 'NuevaClave2026', { retardo: 50, despues: 400 });
      await e.clic(usr, fila().getByRole('button', { name: 'Guardar' }), { despues: 2000 });
    });
    await paso(9, 5, fila(), async () => {
      await e.clic(usr, fila().getByRole('button', { name: 'Desactivar' }), { despues: 700 });
      await confirmarSiPregunta(usr);
      await e.esperar(1800);
      await e.clic(usr, fila().getByRole('button', { name: 'Reactivar' }), { despues: 700 });
      await confirmarSiPregunta(usr);
      await e.esperar(1800);
    });
  });

  fs.writeFileSync(path.join(SALIDA, ARCHIVO), JSON.stringify({ clips, fallas }, null, 1));
  for (const c of [libre, admin]) await c.close();
});
