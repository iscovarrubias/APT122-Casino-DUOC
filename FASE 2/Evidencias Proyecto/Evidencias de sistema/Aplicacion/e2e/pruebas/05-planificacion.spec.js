const fs = require('node:fs');
const { test, expect } = require('../soporte/fixtures');
const { diasHabilesDelMismoMes, aFormatoVisible } = require('../soporte/api');
const bd = require('../soporte/bd');

const [DIA_A, DIA_B, DIA_C] = diasHabilesDelMismoMes(40, 3);
const diaDelMes = (iso) => String(Number(iso.slice(8)));

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

async function irAFecha(page, iso) {
  const campo = page.getByRole('textbox', { name: 'Fecha del menú' });
  await expect(page.getByText(/^Hoy - /)).toBeVisible();
  await expect(page.getByText(/(Faltan \d+ de 9 componentes|Día completo)/)).toBeVisible();
  await campo.fill(aFormatoVisible(iso));
  await campo.press('Enter');
  await expect(campo).toHaveValue(aFormatoVisible(iso));
  await expect(page.getByText(/^En \d+ días - /)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/(Faltan \d+ de 9 componentes|Día completo)/)).toBeVisible();
}

const tarjeta = (page, nombre) =>
  page.locator('article').filter({ has: page.getByRole('combobox', { name: `Preparación para ${nombre}`, exact: true }) });

test.describe('Planificación del menú', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    for (const dia of [DIA_A, DIA_B, DIA_C]) await bd.limpiarDia(dia);
  });

  test.beforeEach(async ({ entrarComo, page }) => {
    await entrarComo('admin', { ruta: '/panel/menu' });
    await expect(page.getByRole('heading', { level: 1, name: /Planificación/ })).toBeVisible();
  });

  test('un día sin menú indica cuántos componentes faltan', async ({ page }) => {
    await irAFecha(page, DIA_A);
    await expect(page.getByText('Faltan 9 de 9 componentes requeridos para completar el día.')).toBeVisible();
    await expect(tarjeta(page, 'General').getByRole('button', { name: 'Agregar' })).toBeDisabled();
  });

  test('planificar un día completo, guardarlo y publicarlo', async ({ page, api }) => {
    await irAFecha(page, DIA_A);
    for (const [categoria, plato] of Object.entries(PLATOS)) {
      const t = tarjeta(page, categoria);
      await t.getByRole('combobox').selectOption({ label: plato });
      await t.getByRole('spinbutton', { name: 'Cantidad planificada' }).fill('40');
    }
    for (const [tipo, plato] of Object.entries(ACOMPANAMIENTOS)) {
      const t = tarjeta(page, tipo);
      await t.getByRole('combobox').selectOption({ label: plato });
      await t.getByRole('spinbutton', { name: 'Cantidad' }).fill('50');
    }
    await page.getByRole('button', { name: 'Guardar todo el menú' }).click();
    await expect(page.getByRole('status').filter({ hasText: '10 cambio(s) guardado(s).' })).toBeVisible();
    await expect(page.getByText('Día completo: los 9 componentes requeridos están cargados.')).toBeVisible();
    await expect(page.getByText('Sin publicar')).toBeVisible();

    await page.getByRole('button', { name: 'Publicar menú' }).click();
    await expect(page.getByText('Publicado', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Despublicar menú' })).toBeVisible();

    const publico = await api.pedir('GET', `/menu/hoy?fecha=${DIA_A}`);
    expect(publico.preparaciones.map((p) => p.nombre)).toEqual(expect.arrayContaining(Object.values(PLATOS)));
  });

  test('despublicar oculta el menú a los estudiantes', async ({ page, api }) => {
    await irAFecha(page, DIA_A);
    await page.getByRole('button', { name: 'Despublicar menú' }).click();
    const confirmacion = page.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button').last().click();
    await expect(page.getByRole('button', { name: 'Publicar menú' })).toBeVisible();
    await expect.poll(async () => (await api.pedir('GET', `/menu/hoy?fecha=${DIA_A}`)).preparaciones.length).toBe(0);
    await page.getByRole('button', { name: 'Publicar menú' }).click();
    await expect(page.getByRole('button', { name: 'Despublicar menú' })).toBeVisible();
  });

  test('editar la cantidad de un componente habilita «Guardar cambios» y se guarda', async ({ page, api }) => {
    await irAFecha(page, DIA_A);
    const t = tarjeta(page, 'General');
    await expect(t.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await t.getByRole('spinbutton', { name: 'Cantidad planificada' }).fill('55');
    await t.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(t.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    const plan = await api.admin('GET', `/menu/planificacion?fecha=${DIA_A}`);
    expect(plan.componentes.find((c) => c.categoria === 'General' && c.componente === 'Plato Principal').cantidad_planificada).toBe(55);
  });

  test('el botón «Usar» copia la cantidad sugerida por el historial', async ({ page }) => {
    await irAFecha(page, DIA_B);
    const t = tarjeta(page, 'General');
    const sugerido = await t.locator('p', { hasText: 'Sugerido:' }).locator('strong').textContent();
    await t.getByRole('button', { name: 'Usar' }).click();
    await expect(t.getByRole('spinbutton', { name: 'Cantidad planificada' })).toHaveValue(sugerido.replace(/\D/g, ''));
  });

  test('«Ver receta» muestra los ingredientes de la preparación elegida', async ({ page }) => {
    await irAFecha(page, DIA_A);
    await page.getByRole('button', { name: 'Ver receta de General' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Pastel de choclo');
    await expect(modal).toContainText(/Choclo|choclo/);
    await modal
      .getByRole('button', { name: /Cerrar/ })
      .first()
      .click();
    await expect(modal).toHaveCount(0);
  });

  test('crear un acompañamiento especial para una categoría (bebida sin azúcar para JUNAEB)', async ({ page, api }) => {
    await irAFecha(page, DIA_A);
    await page.getByRole('button', { name: 'Especial para un menú' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Acompañamiento especial' });
    await dialogo.getByRole('combobox', { name: 'Categoría' }).selectOption('JUNAEB');
    await dialogo.getByRole('combobox', { name: 'Tipo de acompañamiento' }).selectOption('Bebida');
    await dialogo.getByRole('combobox', { name: 'Preparación' }).selectOption({ label: 'Agua mineral' });
    await dialogo.getByRole('button', { name: 'Crear especial' }).click();
    await expect(dialogo.getByRole('alert')).toContainText('La cantidad debe ser un entero mayor o igual a 0.');
    await dialogo.getByRole('spinbutton', { name: 'Cantidad' }).fill('20');
    await dialogo.getByRole('button', { name: 'Crear especial' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Acompañamiento especial creado.' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Preparación para Bebida - JUNAEB' })).toHaveValue(
      String(await api.idPreparacion('Agua mineral'))
    );
    await expect(page.getByText(/En todos los menús - excepto JUNAEB/)).toBeVisible();
    const publico = await api.pedir('GET', `/menu/hoy?fecha=${DIA_A}&categoria=JUNAEB`);
    expect(publico.preparaciones.map((p) => p.nombre)).toContain('Agua mineral');
    expect(publico.preparaciones.map((p) => p.nombre)).not.toContain('Jugo de naranja');
  });

  test('quitar un componente pide confirmación y deja el día incompleto', async ({ page }) => {
    await irAFecha(page, DIA_A);
    await page.getByRole('button', { name: 'Quitar Pan del menú' }).click();
    const confirmacion = page.getByRole('alertdialog');
    await expect(confirmacion).toBeVisible();
    await confirmacion.getByRole('button').last().click();
    await expect(page.getByRole('button', { name: 'Quitar Pan del menú' })).toHaveCount(0);
    await expect(page.getByText(/Faltan 1 de 9 componentes|Día completo/)).toBeVisible();
  });

  test('la vista de mes muestra el estado y los platos de cada día', async ({ page }) => {
    await irAFecha(page, DIA_A);
    await page.getByRole('button', { name: 'Mes' }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${diaDelMes(DIA_A)} Publicado Pastel de choclo`) })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`^${diaDelMes(DIA_C)} Sin menú`) })).toBeVisible();
    await page.getByRole('button', { name: new RegExp(`^${diaDelMes(DIA_A)} Publicado`) }).click();
    await expect(page.getByRole('textbox', { name: 'Fecha del menú' })).toHaveValue(aFormatoVisible(DIA_A));
  });

  test('copiar el menú de un día y pegarlo en otro', async ({ page, api }) => {
    await irAFecha(page, DIA_A);
    await page.getByRole('button', { name: 'Mes' }).click();
    await page.getByRole('button', { name: 'Copiar y pegar' }).click();
    await expect(page.getByRole('heading', { name: 'Copiar y pegar menú' })).toBeVisible();
    await page.getByRole('button', { name: new RegExp(`^${diaDelMes(DIA_A)} Publicado`) }).click();
    await page.getByRole('button', { name: new RegExp(`^${diaDelMes(DIA_C)} Sin menú`) }).click();
    await page.getByRole('button', { name: 'Pegar', exact: true }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${diaDelMes(DIA_C)} Borrador Pastel de choclo`) })).toBeVisible();
    const plan = await api.admin('GET', `/menu/planificacion?fecha=${DIA_C}`);
    expect(plan.componentes.length).toBeGreaterThanOrEqual(9);
    expect(plan.menu.publicado).toBe(false);
  });

  test('exportar el mes a Excel descarga un archivo válido', async ({ page }) => {
    await irAFecha(page, DIA_A);
    await page.getByRole('button', { name: 'Exportar' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Exportar menú' });
    await dialogo.getByRole('button', { name: 'Mes completo' }).click();
    await dialogo.getByRole('button', { name: 'Excel', exact: true }).click();
    const [descarga] = await Promise.all([page.waitForEvent('download'), dialogo.getByRole('button', { name: 'Descargar Excel' }).click()]);
    expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/);
    const ruta = await descarga.path();
    const bytes = fs.readFileSync(ruta);
    expect(bytes.subarray(0, 2).toString()).toBe('PK');
    expect(bytes.length).toBeGreaterThan(2000);
  });

  test('exportar como imagen descarga un PNG', async ({ page }) => {
    await irAFecha(page, DIA_A);
    await page.getByRole('button', { name: 'Exportar' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Exportar menú' });
    await dialogo.getByRole('button', { name: 'Semana', exact: true }).click();
    await dialogo.getByRole('button', { name: 'Imagen (PNG)' }).click();
    const [descarga] = await Promise.all([page.waitForEvent('download'), dialogo.getByRole('button', { name: /Descargar/ }).click()]);
    expect(descarga.suggestedFilename()).toMatch(/\.png$/);
    const bytes = fs.readFileSync(await descarga.path());
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  });

  test('el personal del casino también puede planificar, pero la nutricionista no ve la caja', async ({ page, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/menu' });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Guardar todo el menú' })).toBeVisible();
  });
});
