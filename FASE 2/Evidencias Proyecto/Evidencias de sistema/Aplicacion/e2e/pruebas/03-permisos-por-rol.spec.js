const { test, expect } = require('../soporte/fixtures');

const SECCIONES = {
  admin: ['Disponibilidad', 'Planificación del menú', 'Preparaciones', 'Ingredientes', 'Análisis', 'Usuarios'],
  personal: ['Disponibilidad', 'Planificación del menú'],
  nutricionista: ['Planificación del menú', 'Preparaciones', 'Ingredientes', 'Análisis'],
};

const PROHIBIDAS = {
  personal: ['/panel/preparaciones', '/panel/ingredientes', '/panel/analisis', '/panel/usuarios'],
  nutricionista: ['/panel/caja', '/panel/kiosco', '/panel/usuarios'],
};

test.describe('Permisos por rol', () => {
  for (const [rol, secciones] of Object.entries(SECCIONES)) {
    test(`${rol} ve solo sus secciones en el menú lateral`, async ({ page, entrarComo }) => {
      await entrarComo(rol, { ruta: '/panel/menu' });
      const nav = page.getByRole('navigation', { name: 'Secciones del panel' });
      await expect(nav.getByRole('button')).toHaveCount(secciones.length);
      const etiquetas = await nav.getByRole('button').evaluateAll((botones) => botones.map((b) => b.getAttribute('aria-label')));
      expect(etiquetas).toEqual(secciones);
    });
  }

  for (const [rol, rutas] of Object.entries(PROHIBIDAS)) {
    for (const ruta of rutas) {
      test(`${rol} no puede abrir ${ruta} aunque escriba la dirección`, async ({ page, entrarComo }) => {
        await entrarComo(rol, { ruta });
        await expect(page.getByText('Error 403')).toBeVisible();
        await expect(page.getByText(/no tiene acceso a esta sección/)).toBeVisible();
        await page.getByRole('button', { name: 'Ir al Menú Principal' }).click();
        await expect(page).toHaveURL(/#\/panel\/(menu|kiosco)$/);
      });
    }
  }

  test('el cajero queda fijo en la caja', async ({ page, entrarComo }) => {
    await entrarComo('cajero', { ruta: '/panel/usuarios' });
    await expect(page).toHaveURL(/#\/panel\/caja$/);
    await page.goto('/#/panel/analisis');
    await expect(page).toHaveURL(/#\/panel\/caja$/);
    await expect(page.getByRole('navigation', { name: 'Secciones del panel' })).toHaveCount(0);
  });

  test('en modo cocina compartida el personal queda fijo en Disponibilidad', async ({ page, entrarComo }) => {
    await entrarComo('personal', { kiosco: true, ruta: '/panel/menu' });
    await expect(page).toHaveURL(/#\/panel\/kiosco$/);
    await expect(page.getByRole('heading', { level: 1, name: /Disponibilidad/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Secciones del panel' })).toHaveCount(0);
  });

  test('un estudiante que escribe una ruta del panel vuelve al menú público', async ({ page, estudiante }) => {
    await page.goto('/#/panel/usuarios');
    await expect(page).toHaveURL(/#\/$/);
    expect(estudiante.usuario.rol).toBe('Estudiante');
  });

  test('sin sesión, cualquier ruta del panel pide iniciar sesión', async ({ page }) => {
    for (const ruta of ['/panel/caja', '/panel/usuarios', '/panel/analisis']) {
      await page.goto(`/#${ruta}`);
      await expect(page).toHaveURL(/#\/login$/);
    }
  });

  test('el personal puede pasar del panel al menú público y volver', async ({ page, entrarComo }) => {
    await entrarComo('admin', { ruta: '/panel/menu' });
    await page.getByRole('button', { name: 'Ver menú público' }).click();
    await expect(page).toHaveURL(/#\/$/);
    await page.getByRole('button', { name: 'Ir al panel' }).first().click();
    await expect(page).toHaveURL(/#\/panel\/menu$/);
  });

  test('la API también rechaza a un rol sin permiso, no solo la interfaz', async ({ api }) => {
    const { token } = await api.sesion('cajero@duocuc.cl');
    await expect(api.pedir('GET', '/usuarios', undefined, token)).rejects.toMatchObject({ estado: 403 });
    const nutri = await api.sesion('nutricionista@duocuc.cl');
    await expect(api.pedir('POST', '/jornada/ventas', { categoria: 'General' }, nutri.token)).rejects.toMatchObject({ estado: 403 });
  });
});
