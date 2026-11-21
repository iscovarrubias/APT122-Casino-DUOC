const fs = require('node:fs');
const { test, expect } = require('../soporte/fixtures');

test.describe('Análisis', () => {
  test.beforeEach(async ({ entrarComo, page }) => {
    await entrarComo('nutricionista', { ruta: '/panel/analisis' });
    await expect(page.getByRole('tablist', { name: 'Secciones de análisis' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Comparación entre menús' })).toBeVisible();
  });

  test('resume ventas, consumo y agotamiento por menú con datos históricos', async ({ page }) => {
    await expect(page.getByText('Combos vendidos')).toBeVisible();
    await expect(page.getByText('Días analizados')).toBeVisible();
    const tabla = page.getByRole('table').first();
    for (const menu of ['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico']) {
      await expect(tabla.getByRole('row', { name: new RegExp(`^${menu} \\d+ días`) })).toBeVisible();
    }
    await expect(tabla.getByRole('row', { name: /^General/ })).toContainText(/u\/h/);
  });

  test('cambiar el período recalcula los indicadores', async ({ page }) => {
    const dias = page.locator('main').getByText('Días analizados').locator('..').locator('strong');
    const periodo = page.getByRole('group', { name: 'Período' });
    await periodo.getByRole('button', { name: 'Últimos 30 días' }).click();
    await expect(page.getByRole('textbox', { name: 'Fecha desde' })).not.toHaveValue('');
    const treinta = Number(await dias.textContent());
    await periodo.getByRole('button', { name: 'Esta semana' }).click();
    await expect.poll(async () => Number(await dias.textContent())).toBeLessThan(treinta);
    expect(Number(await dias.textContent())).toBeLessThanOrEqual(7);
  });

  test('filtrar por categoría enfoca las ventas por hora y las preparaciones en ese menú', async ({ page }) => {
    await page.getByRole('group', { name: 'Categoría' }).getByRole('button', { name: 'Vegetariano' }).click();
    await expect(page.getByRole('heading', { name: 'Ventas por hora - Vegetariano' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Preparaciones en Vegetariano' })).toBeVisible();
    await page.getByRole('group', { name: 'Categoría' }).getByRole('button', { name: 'Todos los menús' }).click();
    await expect(page.getByRole('heading', { name: 'Ventas por hora', exact: true })).toBeVisible();
  });

  test('analizar por preparación muestra el detalle de la elegida', async ({ page }) => {
    await page.getByRole('group', { name: 'Analizar por' }).getByRole('button', { name: 'Preparación', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Elige una preparación' })).toBeVisible();
    await page.getByRole('button', { name: 'Ensalada chilena', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Elige una preparación' })).toHaveCount(0);
    await expect(page.locator('main')).toContainText('Ensalada chilena');
  });

  test('exportar el análisis a Excel descarga un archivo con datos', async ({ page }) => {
    await page.getByRole('button', { name: 'Exportar' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Exportar ventas y agotamiento' });
    await dialogo.getByRole('button', { name: 'Excel', exact: true }).click();
    const [descarga] = await Promise.all([page.waitForEvent('download'), dialogo.getByRole('button', { name: 'Descargar Excel' }).click()]);
    expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/);
    const bytes = fs.readFileSync(await descarga.path());
    expect(bytes.subarray(0, 2).toString()).toBe('PK');
    expect(bytes.length).toBeGreaterThan(5000);
  });

  test('la predicción estima el agotamiento y muestra qué tan confiable es', async ({ page }) => {
    await page.getByRole('tab', { name: 'Predicción' }).click();
    await expect(page.getByRole('tab', { name: 'Predicción' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Hoy: hora estimada de agotamiento' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '¿Qué tan confiable es?' })).toBeVisible();
    await expect(page.getByText(/días probados/).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Detalle por categoría' })).toBeVisible();
  });

  test('las opiniones de los estudiantes llegan al panel con su autor y se pueden filtrar', async ({ page, api }) => {
    const alumno = await api.sesion(`alumno.analisis.${Date.now()}@duocuc.cl`);
    const comentario = `Le faltó sal ${Date.now()}`;
    await api.pedir(
      'PUT',
      `/estudiante/calificaciones/${await api.idPreparacion('Cazuela de vacuno')}`,
      { estrellas: 2, comentario, categoria: 'General' },
      alumno.token
    );
    await page.getByRole('tab', { name: 'Opiniones' }).click();
    await expect(page.getByRole('heading', { name: 'Opiniones de los estudiantes' })).toBeVisible();
    const tarjeta = page.locator('article').filter({ hasText: comentario });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText(alumno.usuario.email || '@duocuc.cl');
    const filtros = page.locator('.filtros-opiniones');
    await filtros.getByRole('combobox').nth(2).selectOption('5');
    await expect(page.locator('article').filter({ hasText: comentario })).toHaveCount(0);
    await filtros.getByRole('combobox').nth(2).selectOption('2');
    await expect(page.locator('article').filter({ hasText: comentario })).toBeVisible();
  });

  test('la pestaña de favoritos muestra los platos más marcados', async ({ page, api }) => {
    const alumno = await api.sesion(`alumno.fav.${Date.now()}@duocuc.cl`);
    await api.pedir('PUT', `/estudiante/favoritos/${await api.idPreparacion('Pastel de choclo')}`, {}, alumno.token);
    await page.getByRole('tab', { name: 'Opiniones' }).click();
    await page.getByRole('button', { name: /Favoritos/ }).click();
    await expect(page.getByRole('heading', { name: 'Favoritos de los estudiantes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pastel de choclo', exact: true })).toBeVisible();
  });

  test('el informe general se arma con las jornadas cerradas', async ({ page, api }) => {
    await api.prepararDia({ porciones: 4, iniciar: true });
    const { token } = await api.sesion('cajero@duocuc.cl');
    for (let i = 0; i < 4; i += 1) await api.pedir('POST', '/jornada/ventas', { categoria: 'JUNAEB' }, token);
    await api.admin('POST', '/jornada/cerrar', {});
    await page.getByRole('tab', { name: 'Informe general' }).click();
    await expect(page.getByRole('heading', { name: 'Informe general: qué se agota más rápido' })).toBeVisible();
    await page.getByRole('group', { name: 'Período' }).getByRole('button', { name: 'Últimos 30 días' }).click();
    await expect(page.getByText('No hay jornadas cerradas en este período.', { exact: false })).toHaveCount(0);
    await expect(page.locator('main')).toContainText('Arroz con pollo');
  });
});
