const { test, expect } = require('../soporte/fixtures');

test.describe('Páginas legales', () => {
  test('Términos y Privacidad se abren desde el menú lateral sin dar 404 @movil', async ({ page }) => {
    await page.goto('/');
    const enlace = page.getByRole('button', { name: 'Términos y Condiciones' });
    if (!(await enlace.isVisible())) await page.getByRole('button', { name: 'Abrir configuración' }).click();
    await page
      .getByRole('button', { name: /Términos y Condiciones/ })
      .first()
      .click();
    await expect(page).toHaveURL(/#\/terminos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Términos y Condiciones' })).toBeVisible();
    await expect(page.getByText('Error 404')).toHaveCount(0);
    await page.getByRole('button', { name: 'Privacidad', exact: true }).click();
    await expect(page).toHaveURL(/#\/privacidad$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidad' })).toBeVisible();
    await expect(page).toHaveTitle('Política de Privacidad - Casinos DUOC UC');
  });

  test('la política enlaza a la política oficial de Duoc UC y cita la ley', async ({ page }) => {
    await page.goto('/#/privacidad');
    const enlace = page.getByRole('link', { name: /Política de Privacidad de Duoc UC/ });
    await expect(enlace).toHaveAttribute('href', 'https://www.duoc.cl/politica-privacidad/');
    await expect(enlace).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('region', { name: '2. Marco legal' })).toContainText('Ley N° 21.719');
    await expect(page.getByRole('region', { name: '4. Alergias: un dato sensible' })).toBeVisible();
  });

  test('lo que la app guarda en el navegador coincide con lo declarado en la política', async ({ page, estudiante }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).first().click();
    const claves = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
    await page.goto('/#/privacidad');
    const declaradas = await page.getByRole('table').locator('tbody tr td:first-child').allTextContents();
    for (const clave of claves.filter((c) => c.startsWith('casino_'))) expect(declaradas).toContain(clave);
    expect(estudiante.usuario.rol).toBe('Estudiante');
  });

  test('«Volver al menú» regresa al inicio', async ({ page }) => {
    await page.goto('/#/terminos');
    await page.getByRole('button', { name: 'Volver al menú' }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole('heading', { level: 1, name: /Menú del día/ })).toBeVisible();
  });
});

test.describe('Errores y resiliencia', () => {
  test('una dirección inexistente muestra la página 404 con salida al inicio', async ({ page }) => {
    await page.goto('/#/no-existe');
    await expect(page.getByText('Error 404')).toBeVisible();
    await expect(page).toHaveTitle('Página no encontrada - Casinos DUOC UC');
    await page
      .getByRole('button', { name: /Ir al Menú Principal|Volver/ })
      .first()
      .click();
    await expect(page).toHaveURL(/#\/$/);
  });

  test('si el servidor no responde, el menú lo informa y permite reintentar', async ({ page, api }) => {
    await api.prepararDia({ iniciar: true });
    await page.route('**/api/menu/**', (ruta) => ruta.abort('connectionrefused'));
    await page.goto('/');
    await expect(page.getByText(/(conexión|servicio|No pudimos)/i).first()).toBeVisible();
    await page.unroute('**/api/menu/**');
    const reintentar = page.getByRole('button', { name: /Reintentar|Intentar de nuevo/ });
    await reintentar.first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
  });

  test('si el servidor responde con error en el panel, la página muestra el error sin romperse', async ({ page, entrarComo }) => {
    await entrarComo('admin');
    await page.route('**/api/usuarios**', (ruta) =>
      ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Falla simulada' }) })
    );
    await page.goto('/#/panel/usuarios');
    await expect(page.getByText(/(500|Falla simulada|Algo salió mal|error)/i).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Secciones del panel' })).toBeVisible();
  });
});

test.describe('Accesibilidad básica', () => {
  test('el panel tiene un enlace para saltar al contenido', async ({ page, entrarComo }) => {
    await entrarComo('admin', { ruta: '/panel/menu' });
    await expect(page.getByRole('heading', { level: 1, name: /Planificación/ })).toBeVisible();
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.getSelection()?.removeAllRanges();
    });
    await page.keyboard.press('Tab');
    const saltar = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(saltar).toBeFocused();
    await saltar.press('Enter');
    await expect(page.locator('#contenido-principal')).toBeFocused();
    await expect(page).toHaveURL(/#\/panel\/menu$/);
  });

  test('las ayudas «¿Qué significa?» explican cada sección', async ({ page, entrarComo }) => {
    await entrarComo('admin', { ruta: '/panel/usuarios' });
    const ayuda = page.getByRole('button', { name: '¿Qué significa? Usuarios' });
    await ayuda.click();
    await expect(ayuda).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Cuentas del personal del casino.', { exact: false })).toBeVisible();
  });

  test('todas las imágenes del menú público tienen texto alternativo', async ({ page, api }) => {
    await api.prepararDia({ iniciar: true });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    const sinAlt = await page.locator('img:not([alt])').count();
    expect(sinAlt).toBe(0);
  });

  test('los botones de la caja tienen nombres que describen el combo y su stock', async ({ page, api, entrarComo }) => {
    await api.prepararDia({ porciones: 4, iniciar: true });
    await entrarComo('cajero', { ruta: '/panel/caja' });
    await expect(page.getByRole('button', { name: /^General \$4\.500 Pollo arvejado con arroz Porciones que quedan/ })).toBeVisible();
  });

  test('la vista móvil del menú no tiene desplazamiento horizontal @movil', async ({ page, api }) => {
    await api.prepararDia({ iniciar: true });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(1);
  });
});
