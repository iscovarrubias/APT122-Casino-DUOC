const { test, expect } = require('../soporte/fixtures');
const bd = require('../soporte/bd');
const { hoyChile } = require('../soporte/api');

const PLATOS = {
  General: 'Pastel de choclo',
  JUNAEB: 'Lentejas con arroz',
  Vegetariano: 'Lasagna de verduras',
  Hipocalórico: 'Merluza al horno con ensalada',
};
const ACOMPANAMIENTOS = {
  Ensalada: 'Ensalada chilena',
  Sopa: 'Sopa de verduras',
  Pan: 'Pan amasado',
  Postre: 'Flan de caramelo',
  Fruta: 'Manzana',
  Bebida: 'Jugo de naranja',
};

async function nuevaPagina(browser, api, quien) {
  const contexto = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-CL', timezoneId: 'America/Santiago' });
  await contexto.addInitScript(() => sessionStorage.setItem('casino_splash_visto', '1'));
  if (quien) {
    const sesion = await api.sesion(quien);
    await contexto.addInitScript((s) => localStorage.setItem('casino_sesion', JSON.stringify(s)), sesion);
  }
  return { contexto, pagina: await contexto.newPage() };
}

test('un día completo del casino, de la planificación al análisis', async ({ browser, api }) => {
  test.setTimeout(180000);
  await bd.limpiarDia(hoyChile());
  await bd.borrarCalificaciones('Pastel de choclo');
  const alumno = `alumno.flujo.${Date.now()}@duocuc.cl`;

  const admin = await nuevaPagina(browser, api, 'admin@duocuc.cl');
  const estudiante = await nuevaPagina(browser, api, alumno);
  const cocina = await nuevaPagina(browser, api, 'personal@duocuc.cl');
  const caja = await nuevaPagina(browser, api, 'cajero@duocuc.cl');
  const nutri = await nuevaPagina(browser, api, 'nutricionista@duocuc.cl');

  await test.step('1. La administración planifica el menú de hoy y lo publica', async () => {
    const p = admin.pagina;
    await p.goto('/#/panel/menu');
    await expect(p.getByText('Faltan 9 de 9 componentes requeridos para completar el día.')).toBeVisible();
    for (const [categoria, plato] of Object.entries(PLATOS)) {
      const t = p.locator('article').filter({ has: p.getByRole('combobox', { name: `Preparación para ${categoria}`, exact: true }) });
      await t.getByRole('combobox').selectOption({ label: plato });
      await t.getByRole('spinbutton', { name: 'Cantidad planificada' }).fill('2');
    }
    for (const [tipo, plato] of Object.entries(ACOMPANAMIENTOS)) {
      const t = p.locator('article').filter({ has: p.getByRole('combobox', { name: `Preparación para ${tipo}`, exact: true }) });
      await t.getByRole('combobox').selectOption({ label: plato });
      await t.getByRole('spinbutton', { name: 'Cantidad' }).fill('10');
    }
    await p.getByRole('button', { name: 'Guardar todo el menú' }).click();
    await expect(p.getByText('Día completo: los 9 componentes requeridos están cargados.')).toBeVisible();
    await p.getByRole('button', { name: 'Publicar menú' }).click();
    await expect(p.getByRole('button', { name: 'Despublicar menú' })).toBeVisible();
  });

  await test.step('2. Un estudiante revisa el menú desde su celular antes de ir', async () => {
    const p = estudiante.pagina;
    await p.goto('/');
    await expect(p.getByRole('heading', { level: 2, name: 'Pastel de choclo' })).toBeVisible();
  });

  await test.step('3. La cocina inicia la jornada con lo que preparó', async () => {
    const p = cocina.pagina;
    await p.goto('/#/panel/kiosco');
    await p.getByRole('button', { name: 'Iniciar jornada' }).click();
    const confirmacion = p.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button').last().click();
    await expect(p.getByRole('status').filter({ hasText: 'Jornada iniciada.' })).toBeVisible();
    await expect(estudiante.pagina.locator('main')).toContainText(/Quedan 2/, { timeout: 5000 });
  });

  await test.step('4. La caja vende y el estudiante ve en vivo cuando se agota', async () => {
    const p = caja.pagina;
    await p.goto('/#/panel/caja');
    for (let i = 0; i < 2; i += 1) {
      await p.getByRole('button', { name: /^General \$/ }).click();
      await p.getByRole('alertdialog', { name: 'Vendiendo General' }).getByRole('button', { name: /Fruta/ }).click();
      await expect(p.getByRole('status').filter({ hasText: 'General - Fruta registrado' })).toBeVisible();
      await p.waitForTimeout(450);
    }
    await expect(estudiante.pagina.locator('main')).toContainText(/Agotado/i, { timeout: 5000 });
  });

  await test.step('5. El estudiante almuerza y deja su opinión', async () => {
    const p = estudiante.pagina;
    const tarjeta = p.locator('.opinion').first();
    await tarjeta.getByRole('button', { name: 'Calificar' }).click();
    await tarjeta.getByRole('button', { name: '5 estrellas' }).click();
    await tarjeta.getByPlaceholder(/¿Qué te pareció\?/).fill('El mejor pastel de choclo del semestre');
    await tarjeta.getByRole('button', { name: 'Guardar' }).click();
    await expect(tarjeta).toContainText(/5\.0 - 1 voto/);
  });

  await test.step('6. La cocina cierra la jornada con el conteo de sobrantes', async () => {
    const p = cocina.pagina;
    await p.getByRole('button', { name: 'Cerrar jornada' }).click();
    await p.getByRole('button', { name: 'Confirmar cierre' }).click();
    const confirmacion = p.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button').last().click();
    await expect(p.getByRole('row', { name: /^General Pastel de choclo 2 2 0/ })).toBeVisible();
  });

  await test.step('7. La nutricionista revisa el análisis y la opinión', async () => {
    const p = nutri.pagina;
    await p.goto('/#/panel/analisis');
    await p.getByRole('tab', { name: 'Informe general' }).click();
    await p.getByRole('group', { name: 'Período' }).getByRole('button', { name: 'Últimos 30 días' }).click();
    await expect(p.locator('main')).toContainText('Pastel de choclo');
    await p.getByRole('tab', { name: 'Opiniones' }).click();
    await expect(p.locator('article').filter({ hasText: 'El mejor pastel de choclo del semestre' })).toContainText(alumno);
  });

  for (const s of [admin, estudiante, cocina, caja, nutri]) await s.contexto.close();
});
