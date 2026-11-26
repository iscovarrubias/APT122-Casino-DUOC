const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');
const { Api, hoyChile } = require('../soporte/api');
const bd = require('../soporte/bd');
const { entornoBackend } = require('../soporte/entorno');
const e = require('./escena');
const { grabar } = require('./grabador');
const tarjetas = require('./tarjetas');

const BACKEND = path.resolve(__dirname, '../../backend');
const SALIDA = path.join(__dirname, 'salida');

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
const OBSOLETOS = ['valentina.soto@duocuc.cl'];
const COMENTARIO = 'Muy rico el pollo asado y las papas bien crujientes.';

const orden = [];

async function escena(nombre, pagina, accion) {
  await pagina.bringToFront();
  await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await e.esperar(300);
  const g = await grabar(pagina, nombre);
  await e.esperar(400);
  await accion();
  await g.detener();
  orden.push({ nombre });
}

async function prepararDatos(api) {
  const existe = await bd.consulta('SELECT 1 FROM preparacion WHERE nombre = $1', [PLATOS.JUNAEB]);
  const entorno = { ...process.env, ...entornoBackend() };
  if (!existe.length) {
    const sql = fs.readFileSync(path.join(BACKEND, 'database', 'seed_menu_campomar.sql'), 'utf8');
    await bd.consulta(sql);
  }
  const conFoto = await bd.consulta('SELECT 1 FROM preparacion WHERE nombre = $1 AND imagen_url IS NOT NULL', [PLATOS.General]);
  if (!conFoto.length) {
    execFileSync(process.execPath, [path.join(BACKEND, 'database', 'seed_imagenes.js')], { cwd: BACKEND, env: entorno, stdio: 'ignore' });
  }
  await bd.limpiarDia(hoyChile());
  await bd.borrarCalificaciones(PLATOS.General);
  for (const correo of [ESTUDIANTE, ...OBSOLETOS]) {
    const usuario = await bd.consulta('SELECT id_usuario FROM usuario WHERE email = $1', [correo]);
    if (!usuario.length) continue;
    const id = usuario[0].id_usuario;
    for (const tabla of ['calificacion', 'opinion_registro', 'correo_enviado', 'favorito', 'preferencia_alergeno', 'preferencia_correo']) {
      await bd.consulta(`DELETE FROM ${tabla} WHERE id_usuario = $1`, [id]);
    }
  }
  const alumno = await api.pedir('POST', '/auth/duoc', { email: ESTUDIANTE });
  await bd.consulta('UPDATE usuario SET nombre = $1 WHERE email = $2', [NOMBRE_ESTUDIANTE, ESTUDIANTE]);
  alumno.usuario.nombre = NOMBRE_ESTUDIANTE;
  return { token: alumno.token, usuario: alumno.usuario, kiosco: false };
}

async function abrirPerfil(app, pagina) {
  const directo = app.getByRole('button', { name: 'Mi perfil' });
  if (await directo.isVisible().catch(() => false)) {
    await e.clic(pagina, directo);
  } else {
    await e.clic(pagina, app.getByRole('button', { name: 'Abrir configuración' }));
    await e.clic(pagina, app.getByRole('button', { name: /Cuenta y perfil/ }));
  }
  const perfil = app.getByRole('dialog', { name: 'Mi perfil' });
  await expect(perfil).toBeVisible();
  return perfil;
}

async function confirmarSiPregunta(pagina) {
  const confirmacion = pagina.getByRole('alertdialog');
  if (await confirmacion.isVisible().catch(() => false)) await e.clic(pagina, confirmacion.getByRole('button').last());
}

test('demo guiada de Casinos DUOC UC', async ({ browser }) => {
  const api = new Api();
  const sesionEstudiante = await prepararDatos(api);
  const sesion = {
    admin: await api.sesion('admin@duocuc.cl'),
    cocina: await api.sesion('personal@duocuc.cl'),
    caja: await api.sesion('cajero@duocuc.cl'),
  };
  for (const s of Object.values(sesion)) await api.pedir('PATCH', '/auth/tema', { tema: 'claro' }, s.token).catch(() => null);
  fs.mkdirSync(SALIDA, { recursive: true });

  const vitrina = await e.prepararContexto(browser);

  const intro = await e.tarjeta(vitrina, tarjetas.intro());
  await escena('01-intro', intro, async () => {
    await intro.evaluate(() => document.body.classList.add('go'));
    await e.esperar(5500);
  });
  await intro.close();

  const admin = await e.prepararContexto(browser, { sesion: sesion.admin });
  const plan = await admin.newPage();
  await plan.goto('/#/panel/menu');
  await expect(plan.getByText(/Faltan 9 de 9 componentes requeridos/)).toBeVisible();
  await escena('02-planificacion', plan, async () => {
    await e.rotulo(
      plan,
      'Administración del casino',
      'En la mañana se arma el menú del día.'
    );
    await e.esperar(1800);
    let lento = 2;
    for (const [categoria, plato] of Object.entries(PLATOS)) {
      const t = plan.locator('article').filter({ has: plan.getByRole('combobox', { name: `Preparación para ${categoria}`, exact: true }) });
      await e.elegir(plan, t.getByRole('combobox'), plato, { despues: lento > 0 ? 900 : 350 });
      if (categoria === 'General') {
        await e.rotulo(
          plan,
          'Administración del casino',
          'El sistema sugiere cuántas porciones preparar.'
        );
        const sugerido = t.locator('p', { hasText: 'Sugerido:' });
        if (await sugerido.isVisible().catch(() => false)) {
          await e.moverA(plan, sugerido);
          await e.esperar(2200);
        }
      }
      await e.escribir(
        plan,
        t.getByRole('spinbutton', { name: 'Cantidad planificada' }),
        categoria === 'General' ? String(PORCIONES_GENERAL) : '30',
        {
          retardo: lento > 0 ? 90 : 40,
          despues: lento > 0 ? 600 : 250,
        }
      );
      lento -= 1;
    }
    for (const [tipo, plato] of Object.entries(ACOMPANAMIENTOS)) {
      const t = plan.locator('article').filter({ has: plan.getByRole('combobox', { name: `Preparación para ${tipo}`, exact: true }) });
      await e.elegir(plan, t.getByRole('combobox'), plato, { despues: 250 });
      await e.escribir(plan, t.getByRole('spinbutton', { name: 'Cantidad' }), '40', { retardo: 40, despues: 200 });
    }
    await e.clic(plan, plan.getByRole('button', { name: 'Guardar todo el menú' }), { despues: 400 });
    await expect(plan.getByText('Día completo: los 9 componentes requeridos están cargados.')).toBeVisible();
    await e.rotulo(plan, 'Administración del casino', 'Al publicarlo, los estudiantes ya lo ven.');
    await e.clic(plan, plan.getByRole('button', { name: 'Publicar menú' }), { despues: 400 });
    await expect(plan.getByRole('button', { name: 'Despublicar menú' })).toBeVisible();
    await e.esperar(2200);
  });
  await plan.close();

  const publico = await e.prepararContexto(browser);
  const tel = await e.abrirTelefono(publico, '/');
  await expect(tel.app.getByRole('heading', { level: 2, name: PLATOS.General })).toBeVisible();
  await escena('03-estudiante-sin-cuenta', tel.pagina, async () => {
    const { pagina, app } = tel;
    await e.panel(
      pagina,
      'Estudiante',
      '¿Qué hay de almuerzo hoy?',
      'Sin instalar nada ni iniciar sesión.'
    );
    await e.esperar(2600);
    for (const categoria of ['JUNAEB', 'Vegetariano', 'Hipocalórico', 'General']) {
      await e.clic(pagina, app.getByRole('button', { name: categoria, exact: true }), { despues: 1300 });
    }
    await e.panel(
      pagina,
      'Estudiante',
      '¿Qué hay de almuerzo hoy?',
      'Precio, ingredientes, alérgenos y nutrición de cada plato.'
    );
    const detalles = app.getByRole('button', { name: 'Ver detalles' }).first();
    if (await detalles.isVisible().catch(() => false)) await e.clic(pagina, detalles, { despues: 900 });
    await e.moverA(pagina, app.getByRole('heading', { level: 2, name: PLATOS.General }));
    for (let i = 0; i < 4; i += 1) {
      await e.desplazar(pagina, 330);
      await e.esperar(1100);
    }
    await e.esperar(800);
    await e.desplazar(pagina, -1600, { pasos: 18 });
    await e.esperar(1200);
  });
  await tel.pagina.close();

  const cocina = await e.prepararContexto(browser, { sesion: sesion.cocina });
  const kiosco = await cocina.newPage();
  await kiosco.goto('/#/panel/kiosco');
  await expect(kiosco.getByRole('button', { name: 'Iniciar jornada' })).toBeVisible();
  await escena('04-inicio-jornada', kiosco, async () => {
    await e.rotulo(kiosco, 'Cocina', 'Al abrir, la cocina inicia la jornada con lo que preparó.');
    await e.esperar(2000);
    await e.clic(kiosco, kiosco.getByRole('button', { name: 'Iniciar jornada' }), { despues: 700 });
    await confirmarSiPregunta(kiosco);
    await expect(kiosco.getByRole('status').filter({ hasText: 'Jornada iniciada.' })).toBeVisible();
    await e.esperar(2600);
  });

  await e.rotulo(kiosco, '', null);

  const caja = await e.prepararContexto(browser, { sesion: sesion.caja, viewport: { width: 1088, height: 864 } });
  const pCaja = await caja.newPage();
  await pCaja.goto('/#/panel/caja');
  await expect(pCaja.getByRole('button', { name: /^General \$/ })).toBeVisible();
  const vivo = await e.prepararContexto(browser, { viewport: { width: 448, height: 864 } });
  const telVivo = await e.abrirTelefono(vivo, '/', { compacto: true });
  await e.esperar(1500);
  await expect(telVivo.app.getByRole('heading', { level: 2, name: PLATOS.General })).toBeVisible();
  await expect(telVivo.app.locator('main')).toContainText(new RegExp(`Quedan ${PORCIONES_GENERAL}`));
  await telVivo.app
    .getByText(new RegExp(`Quedan ${PORCIONES_GENERAL}`))
    .first()
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await e.mover(pCaja, 760, 250);
  await e.esperar(600);
  const [gCaja, gTel] = await Promise.all([
    grabar(pCaja, '05-caja', { ancho: 2720, alto: 2160 }),
    grabar(telVivo.pagina, '05-telefono', { ancho: 1120, alto: 2160 }),
  ]);
  const vender = async () => {
    await e.clic(pCaja, pCaja.getByRole('button', { name: /^General \$/ }), { despues: 600 });
    await e.clic(pCaja, pCaja.getByRole('alertdialog', { name: 'Vendiendo General' }).getByRole('button', { name: /Fruta/ }), {
      despues: 300,
    });
    await e.mover(pCaja, 760, 250, { steps: 14 });
    await e.esperar(700);
  };
  await e.esperar(500);
  await e.rotulo(pCaja, 'En tiempo real', 'Cada venta descuenta el stock al instante.');
  await e.esperar(2200);
  await vender();
  await vender();
  await e.rotulo(
    pCaja,
    'Hora estimada de agotamiento',
    'El reloj estima a qué hora se acabaría.'
  );
  const reloj = telVivo.app.getByRole('button', { name: 'Hora estimada de agotamiento del menú General' });
  await e.clic(telVivo.pagina, reloj, { despues: 3600 });
  await e.clic(telVivo.pagina, reloj, { despues: 600 });
  await e.mover(telVivo.pagina, 440, 120, { steps: 10 });
  for (let i = 2; i < PORCIONES_GENERAL; i += 1) await vender();
  await expect(telVivo.app.locator('main')).toContainText(/Agotado/i, { timeout: 8000 });
  await e.rotulo(
    pCaja,
    'En tiempo real',
    'Si se acaba, el celular lo muestra sin recargar.'
  );
  await e.esperar(4200);
  await Promise.all([gCaja.detener(), gTel.detener()]);
  orden.push({ nombre: '05-vivo', izquierda: '05-caja', derecha: '05-telefono' });
  await pCaja.close();
  await telVivo.pagina.close();

  const cuenta = await e.prepararContexto(browser, { sesion: sesionEstudiante });
  const telCuenta = await e.abrirTelefono(cuenta, '/');
  await expect(telCuenta.app.getByRole('heading', { level: 2, name: PLATOS.General })).toBeVisible();
  await escena('06-estudiante-con-cuenta', telCuenta.pagina, async () => {
    const { pagina, app } = telCuenta;
    await e.panel(
      pagina,
      'Estudiante con cuenta DUOC',
      'Su menú, a su medida',
      'Con su cuenta institucional marca favoritos y alergias.'
    );
    await e.esperar(2200);
    await e.clic(pagina, app.getByRole('button', { name: `Marcar ${PLATOS.General} como favorito` }), { despues: 1200 });
    const perfil = await abrirPerfil(app, pagina);
    await e.esperar(700);
    await e.clic(pagina, perfil.getByRole('button', { name: 'Lácteos' }), { despues: 900 });
    await e.panel(
      pagina,
      'Estudiante con cuenta DUOC',
      'Avisos por correo',
      'Recibe el menú semanal y un aviso cuando hay sus favoritos.'
    );
    await e.clic(pagina, perfil.getByRole('checkbox', { name: /Menú de la semana/ }), { despues: 700 });
    await e.clic(pagina, perfil.getByRole('checkbox', { name: /Avisos de mis favoritos/ }), { despues: 1600 });
    await e.clic(pagina, perfil.getByRole('button', { name: 'Guardar' }), { despues: 400 });
    await expect(perfil.getByText('Cambios guardados.')).toBeVisible();
    await e.esperar(1000);
    await e.clic(pagina, perfil.getByRole('button', { name: 'Cerrar', exact: true }), { despues: 800 });
    await e.panel(
      pagina,
      'Estudiante con cuenta DUOC',
      'Cuida sus alergias',
      'Si un menú tiene algo de su perfil, se lo advierte.'
    );
    await e.clic(pagina, app.getByRole('button', { name: 'Vegetariano', exact: true }), { despues: 600 });
    await expect(app.getByRole('alert').filter({ hasText: 'Este menú contiene alérgenos de tu perfil' })).toBeVisible();
    await e.esperar(3200);
    await e.clic(pagina, app.getByRole('button', { name: /^General/ }), { despues: 800 });
    await e.panel(
      pagina,
      'Estudiante con cuenta DUOC',
      'Su opinión llega a la cocina',
      'Califica el plato y su comentario llega al panel.'
    );
    const detalles = app.getByRole('button', { name: 'Ver detalles' }).first();
    if (await detalles.isVisible().catch(() => false)) await e.clic(pagina, detalles, { despues: 700 });
    const candidata = app
      .locator('.opinion')
      .filter({ has: app.getByRole('button', { name: 'Calificar' }) })
      .first();
    await candidata.evaluate((el) => el.setAttribute('data-demo', 'opinion'));
    const opinion = app.locator('[data-demo="opinion"]');
    await e.clic(pagina, opinion.getByRole('button', { name: 'Calificar' }), { despues: 800 });
    await e.clic(pagina, opinion.getByRole('button', { name: '5 estrellas' }), { despues: 600 });
    await e.escribir(pagina, opinion.getByPlaceholder(/¿Qué te pareció\?/), COMENTARIO, { retardo: 45, despues: 600 });
    await e.clic(pagina, opinion.getByRole('button', { name: 'Guardar' }), { despues: 600 });
    await expect(opinion).toContainText(/5\.0 - 1 voto/);
    await e.esperar(2600);
  });
  await telCuenta.pagina.close();

  await escena('07-cierre-jornada', kiosco, async () => {
    await e.rotulo(kiosco, 'Cocina', 'Al terminar, se cierra la jornada con lo que sobró.');
    await e.esperar(1800);
    await e.clic(kiosco, kiosco.getByRole('button', { name: 'Cerrar jornada' }), { despues: 1400 });
    await e.clic(kiosco, kiosco.getByRole('button', { name: 'Confirmar cierre' }), { despues: 700 });
    await confirmarSiPregunta(kiosco);
    await expect(kiosco.getByRole('row', { name: new RegExp(`^General ${PLATOS.General}`) })).toBeVisible();
    await e.rotulo(kiosco, 'Cocina', 'Queda registrado lo planificado, lo vendido y lo que sobró.');
    await e.esperar(3800);
  });
  await kiosco.close();

  const analisis = await admin.newPage();
  await analisis.goto('/#/panel/analisis');
  await expect(analisis.getByRole('tablist', { name: 'Secciones de análisis' })).toBeVisible();
  await expect(analisis.getByRole('heading', { name: 'Comparación entre menús' })).toBeVisible();
  await escena('08-analisis', analisis, async () => {
    await e.rotulo(analisis, 'Análisis', 'Ventas y agotamientos por menú, para planificar mejor.');
    await e.esperar(1500);
    await e.clic(analisis, analisis.getByRole('group', { name: 'Período' }).getByRole('button', { name: 'Últimos 30 días' }), {
      despues: 1800,
    });
    await e.moverA(analisis, analisis.getByRole('heading', { name: 'Comparación entre menús' }));
    await e.desplazar(analisis, 420);
    await e.esperar(2200);
    await e.desplazar(analisis, -420);
    await e.rotulo(
      analisis,
      'Predicción de demanda',
      'La predicción mide qué tan confiable es.'
    );
    await e.clic(analisis, analisis.getByRole('tab', { name: 'Predicción' }), { despues: 1500 });
    await expect(analisis.getByRole('heading', { name: '¿Qué tan confiable es?' })).toBeVisible();
    await e.moverA(analisis, analisis.getByRole('heading', { name: '¿Qué tan confiable es?' }));
    await e.esperar(2600);
    await e.rotulo(analisis, 'Opiniones', 'Las opiniones llegan al panel con su autor.');
    await e.clic(analisis, analisis.getByRole('tab', { name: 'Opiniones' }), { despues: 900 });
    const tarjeta = analisis.locator('article').filter({ hasText: COMENTARIO });
    await expect(tarjeta).toBeVisible();
    await e.moverA(analisis, tarjeta);
    await e.esperar(3200);
  });
  await analisis.close();

  const movil = await e.prepararContexto(browser, { sesion: sesion.admin });
  const telAdmin = await e.abrirTelefono(movil, '/#/panel/kiosco');
  await expect(telAdmin.app.getByRole('heading', { name: 'Disponibilidad' })).toBeVisible();
  await escena('08-panel-celular', telAdmin.pagina, async () => {
    const { pagina, app } = telAdmin;
    await e.panel(pagina, 'Administración', 'El panel, también en el celular', 'Revisa el casino desde cualquier dispositivo.');
    await e.esperar(2600);
    await e.desplazar(pagina, 300);
    await e.esperar(1200);
    await e.desplazar(pagina, -300);
    await e.clic(pagina, app.getByRole('button', { name: 'Análisis' }).last(), { despues: 1800 });
    await e.desplazar(pagina, 260);
    await e.esperar(1400);
    await e.panel(pagina, 'Accesibilidad', 'Modo oscuro', 'Para trabajar cómodo en cualquier luz.');
    await e.clic(pagina, app.getByRole('button', { name: 'Abrir configuración' }), { despues: 900 });
    await e.clic(pagina, app.getByRole('button', { name: 'Cambiar a modo oscuro' }), { despues: 900 });
    const cerrar = app.getByRole('dialog', { name: 'Configuración' }).getByRole('button', { name: /Cerrar/ });
    if (await cerrar.first().isVisible().catch(() => false)) await e.clic(pagina, cerrar.first(), { despues: 400 });
    else await app.locator('.hoja-fondo').click({ position: { x: 5, y: 5 } });
    await e.esperar(3000);
  });
  await telAdmin.pagina.close();
  await movil.close();

  const calidad = await e.tarjeta(vitrina, tarjetas.calidad());
  await escena('09-calidad', calidad, async () => {
    await calidad.evaluate(() => document.body.classList.add('go'));
    await e.esperar(8500);
  });
  await calidad.close();

  const cierre = await e.tarjeta(vitrina, tarjetas.cierre());
  await escena('10-cierre', cierre, async () => {
    await cierre.evaluate(() => document.body.classList.add('go'));
    await e.esperar(7000);
  });

  fs.writeFileSync(path.join(SALIDA, 'orden.json'), JSON.stringify(orden, null, 2));
  for (const c of [vitrina, admin, publico, cocina, caja, vivo, cuenta]) await c.close();
});
