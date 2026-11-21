const { test, expect } = require('../soporte/fixtures');

async function abrirPublico(browser) {
  const contexto = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'es-CL', timezoneId: 'America/Santiago' });
  await contexto.addInitScript(() => sessionStorage.setItem('casino_splash_visto', '1'));
  const pagina = await contexto.newPage();
  await pagina.goto('/');
  return { contexto, pagina };
}

test.describe('Actualización en tiempo real', () => {
  test('una venta en la caja actualiza la pantalla del estudiante sin recargar', async ({ browser, page, api, entrarComo }) => {
    await api.prepararDia({ porciones: 2, iniciar: true });
    const { contexto, pagina: estudiante } = await abrirPublico(browser);
    await estudiante.getByRole('button', { name: 'JUNAEB', exact: true }).click();
    await expect(estudiante.locator('main')).toContainText(/Quedan 2/);
    let recargas = 0;
    estudiante.on('framenavigated', () => {
      recargas += 1;
    });

    await entrarComo('cajero', { ruta: '/panel/caja' });
    await page.getByRole('button', { name: /^JUNAEB \$/ }).click();
    await expect(estudiante.locator('main')).toContainText(/Quedan 1/, { timeout: 5000 });

    await page.waitForTimeout(450);
    await page.getByRole('button', { name: /^JUNAEB \$/ }).click();
    await expect(estudiante.locator('main')).toContainText(/Agotado/i, { timeout: 5000 });
    expect(recargas).toBe(0);
    await contexto.close();
  });

  test('publicar el menú lo muestra a los estudiantes que ya tienen la página abierta', async ({ browser, api }) => {
    await api.prepararDia({ publicar: false });
    await new Promise((r) => setTimeout(r, 2100));
    const { contexto, pagina: estudiante } = await abrirPublico(browser);
    await expect(estudiante.getByText(/(Todavía no hay un menú publicado|Los fines de semana no hay menú disponible)/)).toBeVisible();
    const plan = await api.admin('GET', `/menu/planificacion?fecha=${require('../soporte/api').hoyChile()}`);
    await api.admin('PATCH', `/menu/${plan.menu.id_menu}/publicar`);
    await expect(estudiante.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible({ timeout: 5000 });
    await contexto.close();
  });

  test('marcar un plato como agotado a mano se refleja al instante', async ({ browser, api }) => {
    await api.prepararDia({ porciones: 5, iniciar: true });
    const { contexto, pagina: estudiante } = await abrirPublico(browser);
    await estudiante.getByRole('button', { name: 'Vegetariano', exact: true }).click();
    await expect(estudiante.getByRole('heading', { level: 2, name: 'Budín de zapallito italiano' })).toBeVisible();
    const componente = (await api.estadoHoy()).componentes.find((c) => c.preparacion === 'Budín de zapallito italiano');
    await api.admin('POST', `/jornada/componentes/${componente.id_menu_preparacion}/stock`, { accion: 'quedan', cantidad: 0 });
    await expect(estudiante.locator('main')).toContainText(/Agotado/i, { timeout: 5000 });
    await contexto.close();
  });

  test('una opinión nueva actualiza el promedio en otras pantallas', async ({ browser, api }) => {
    await api.prepararDia({ porciones: 5, iniciar: true });
    await require('../soporte/bd').borrarCalificaciones('Pollo arvejado con arroz');
    const { contexto, pagina: visitante } = await abrirPublico(browser);
    await expect(visitante.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    const tarjeta = visitante.locator('.opinion').first();
    await expect(tarjeta).toContainText('Todavía sin calificaciones');
    const alumno = await api.sesion(`alumno.tr.${Date.now()}@duocuc.cl`);
    await api.pedir(
      'PUT',
      `/estudiante/calificaciones/${await api.idPreparacion('Pollo arvejado con arroz')}`,
      { estrellas: 5, comentario: 'Excelente', categoria: 'General' },
      alumno.token
    );
    await expect(tarjeta).toContainText(/5\.0 - 1 voto/, { timeout: 5000 });
    await contexto.close();
  });
});
