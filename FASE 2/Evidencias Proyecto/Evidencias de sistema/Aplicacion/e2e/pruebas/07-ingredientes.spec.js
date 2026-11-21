const { test, expect } = require('../soporte/fixtures');

const NOMBRE = `Quínoa roja prueba ${Date.now()}`;

test.describe('Ingredientes', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ entrarComo, page }) => {
    await entrarComo('nutricionista', { ruta: '/panel/ingredientes' });
    await expect(page.getByRole('heading', { level: 1, name: /Ingredientes/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Carnes y aves \d+/ })).toBeVisible();
  });

  test('el catálogo se agrupa por categoría con su composición por 100 g', async ({ page }) => {
    for (const categoria of ['Carnes y aves', 'Verduras y frutas', 'Cereales y legumbres', 'Lácteos y huevos']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${categoria} \\d+`) })).toBeVisible();
    }
    const fila = page.getByRole('row', { name: /^Carne de vacuno/ });
    await expect(fila).toContainText('Usado en');
    await expect(fila.getByRole('cell').nth(1)).toHaveText(/\d+/);
  });

  test('crear un ingrediente con categoría, alérgenos y composición', async ({ page, api }) => {
    await page.getByRole('button', { name: 'Nuevo ingrediente' }).click();
    const form = page.getByRole('dialog', { name: 'Nuevo ingrediente' });
    await form.getByRole('textbox', { name: /^Nombre/ }).fill(NOMBRE);
    await form.getByRole('combobox', { name: 'Categoría' }).selectOption('Cereales y legumbres');
    await form.getByRole('checkbox', { name: 'Soya' }).check();
    await form.getByRole('spinbutton', { name: 'Calorías (kcal)' }).fill('368');
    await form.getByRole('spinbutton', { name: 'Proteínas (g)' }).fill('14.1');
    await form.getByRole('spinbutton', { name: 'Carbohidratos (g)' }).fill('64.2');
    await form.getByRole('spinbutton', { name: 'Grasas (g)' }).fill('6.1');
    await form.getByRole('button', { name: 'Guardar ingrediente' }).click();
    await expect(form).toHaveCount(0);
    const fila = page.getByRole('row', { name: new RegExp(`^${NOMBRE}`) });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('368');
    await expect(fila).toContainText('Soya');
    const creado = (await api.admin('GET', '/ingredientes')).find((i) => i.nombre === NOMBRE);
    expect(creado).toBeTruthy();
  });

  test('no permite dos ingredientes con el mismo nombre', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo ingrediente' }).click();
    const form = page.getByRole('dialog', { name: 'Nuevo ingrediente' });
    await form.getByRole('textbox', { name: /^Nombre/ }).fill(NOMBRE);
    await form.getByRole('button', { name: 'Guardar ingrediente' }).click();
    await expect(form.getByRole('alert')).toBeVisible();
    await expect(form).toBeVisible();
  });

  test('valores nutricionales negativos se rechazan', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo ingrediente' }).click();
    const form = page.getByRole('dialog', { name: 'Nuevo ingrediente' });
    await form.getByRole('textbox', { name: /^Nombre/ }).fill(`Negativo ${Date.now()}`);
    await form.getByRole('spinbutton', { name: 'Calorías (kcal)' }).fill('-5');
    await form.getByRole('button', { name: 'Guardar ingrediente' }).click();
    const nativo = await form.getByRole('spinbutton', { name: 'Calorías (kcal)' }).evaluate((el) => el.checkValidity());
    if (nativo) await expect(form.getByRole('alert')).toBeVisible();
    await expect(form).toBeVisible();
  });

  test('editar un ingrediente actualiza la tabla', async ({ page }) => {
    await page
      .getByRole('row', { name: new RegExp(`^${NOMBRE}`) })
      .getByRole('button', { name: 'Editar' })
      .click();
    const form = page.getByRole('dialog');
    await form.getByRole('spinbutton', { name: 'Calorías (kcal)' }).fill('370');
    await form.getByRole('button', { name: /Guardar/ }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByRole('row', { name: new RegExp(`^${NOMBRE}`) })).toContainText('370');
  });

  test('buscar y filtrar los que no tienen información nutricional', async ({ page, api }) => {
    await page.getByRole('searchbox', { name: 'Buscar ingrediente' }).fill('quínoa roja');
    await expect(page.getByRole('row', { name: new RegExp(`^${NOMBRE}`) })).toBeVisible();
    await expect(page.getByRole('row', { name: /^Carne de vacuno/ })).toHaveCount(0);
    await page.getByRole('searchbox', { name: 'Buscar ingrediente' }).fill('');

    const sinDatos = `Sin datos ${Date.now()}`;
    await api.admin('POST', '/ingredientes', { nombre: sinDatos });
    await page.reload();
    await page.getByRole('checkbox', { name: 'Solo sin información nutricional' }).check();
    await expect(page.getByRole('row', { name: new RegExp(`^${sinDatos}`) })).toBeVisible();
    await expect(page.getByRole('row', { name: /^Carne de vacuno/ })).toHaveCount(0);
  });

  test('las categorías se pueden contraer y expandir', async ({ page }) => {
    const grupo = page.getByRole('button', { name: /^Carnes y aves \d+/ });
    await expect(grupo).toHaveAttribute('aria-expanded', 'true');
    await grupo.click();
    await expect(grupo).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('row', { name: /^Carne de vacuno/ })).toHaveCount(0);
    await grupo.click();
    await expect(page.getByRole('row', { name: /^Carne de vacuno/ })).toBeVisible();
  });

  test('un ingrediente nuevo queda disponible para armar recetas', async ({ page }) => {
    await page.goto('/#/panel/preparaciones');
    await page.getByRole('button', { name: 'Nuevo plato' }).click();
    const form = page.getByRole('dialog', { name: 'Nueva preparación' });
    await form.getByRole('button', { name: 'Agregar ingrediente' }).click();
    await form.getByRole('combobox', { name: 'Ingrediente 1' }).selectOption({ label: NOMBRE });
    await expect(form.getByRole('status').filter({ hasText: 'Alérgenos sugeridos' })).toContainText('Soya');
  });
});
