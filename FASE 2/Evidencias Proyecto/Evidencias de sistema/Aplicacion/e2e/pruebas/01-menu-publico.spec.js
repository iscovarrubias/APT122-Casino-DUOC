const { test, expect } = require('../soporte/fixtures');

test.describe('Menú público', () => {
  test.beforeAll(async () => {
    const { Api } = require('../soporte/api');
    await new Api().prepararDia({ iniciar: true });
  });

  test('cualquier persona ve el menú del día sin iniciar sesión @movil', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Menú del día/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    await expect(page.getByText('Precio del combo')).toBeVisible();
    await expect(page.getByText(/\$4\.500/).first()).toBeVisible();
    await expect(page.getByText(/Quedan 30/).first()).toBeVisible();
  });

  test('cambiar de categoría muestra el plato de ese menú', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Vegetariano', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Budín de zapallito italiano' })).toBeVisible();
    await page.getByRole('button', { name: 'JUNAEB', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Arroz con pollo' })).toBeVisible();
    await page.getByRole('button', { name: 'Hipocalórico', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo a la plancha con ensalada' })).toBeVisible();
  });

  test('cada plato muestra ingredientes, información nutricional y alérgenos', async ({ page }) => {
    await page.goto('/');
    const principal = page.locator('main');
    await expect(principal.getByRole('heading', { name: 'Ingredientes' }).first()).toBeVisible();
    await expect(principal.getByText(/Pollo, Ajo, Cebolla/)).toBeVisible();
    const tabla = principal.getByRole('table').first();
    await expect(tabla.getByRole('row', { name: /Calorías/ })).toBeVisible();
    await expect(tabla.getByRole('row', { name: /Proteínas/ })).toBeVisible();
    await expect(principal.getByRole('heading', { name: 'Alérgenos' }).first()).toBeVisible();
    await expect(principal.getByText(/kcal/).first()).toBeVisible();
  });

  test('muestra lo que incluye el combo con su disponibilidad', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Incluye en el combo' })).toBeVisible();
    for (const nombre of ['Jugo de naranja', 'Ensalada chilena', 'Sopa de verduras', 'Pan amasado']) {
      await expect(page.getByRole('heading', { level: 3, name: nombre })).toBeVisible();
    }
  });

  test('las opiniones de otros estudiantes se pueden leer sin cuenta', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver opiniones' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('sin sesión, opinar invita a iniciar sesión', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Inicia sesión para dejar tu opinión' }).first().click();
    await expect(page).toHaveURL(/#\/login/);
  });

  test('el menú semanal lista los días de la semana e incluye el de hoy @movil', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Semanal' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Menú semanal' })).toBeVisible();
    const principal = page.locator('main');
    for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']) await expect(principal).toContainText(dia);
    const finDeSemana = [0, 6].includes(new Date(`${require('../soporte/api').hoyChile()}T12:00:00Z`).getUTCDay());
    if (!finDeSemana) {
      await expect(principal).toContainText(/Hoy/);
      await expect(principal).toContainText('Pollo arvejado con arroz');
    }
  });

  test('las preguntas frecuentes se despliegan', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Preguntas' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' })).toBeVisible();
    const pregunta = page.getByText('¿El menú puede cambiar durante el día?');
    await pregunta.click();
    await expect(page.getByText(/La planificación puede ajustarse por motivos operativos/)).toBeVisible();
  });

  test('el modo oscuro se activa y se recuerda al recargar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'oscuro');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'oscuro');
    await page.getByRole('button', { name: 'Cambiar a modo claro' }).first().click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'oscuro');
  });
});

test.describe('Menú público sin menú publicado', () => {
  test('si el día no tiene menú publicado lo informa', async ({ page, api }) => {
    await api.prepararDia({ publicar: false });
    await new Promise((r) => setTimeout(r, 2100));
    await page.goto('/');
    await expect(page.getByText(/(Todavía no hay un menú publicado|Los fines de semana no hay menú disponible)/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toHaveCount(0);
    await api.prepararDia({ iniciar: true });
  });
});
