const { test, expect } = require('../soporte/fixtures');

async function escribirCorreo(page, correo) {
  await page.goto('/#/login');
  await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

async function entrarConClave(page, correo, clave = 'Test1234') {
  await escribirCorreo(page, correo);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

test.describe('Inicio de sesión', () => {
  for (const [correo, destino, titulo] of [
    ['admin@duocuc.cl', '/panel/menu', 'Planificación'],
    ['personal@duocuc.cl', '/panel/menu', 'Planificación'],
    ['nutricionista@duocuc.cl', '/panel/menu', 'Planificación'],
    ['cajero@duocuc.cl', '/panel/caja', 'Caja'],
  ]) {
    test(`${correo} entra con contraseña y llega a su panel`, async ({ page }) => {
      await entrarConClave(page, correo);
      await expect(page).toHaveURL(new RegExp(`#${destino}$`));
      await expect(page.getByRole('heading', { level: 1, name: new RegExp(titulo) })).toBeVisible();
    });
  }

  test('una contraseña incorrecta muestra un error y permite reintentar @movil', async ({ page }) => {
    await entrarConClave(page, 'personal@duocuc.cl', 'ClaveMala1');
    await expect(page.getByText(/(incorrect|inválid|no coincide)/i)).toBeVisible();
    await expect(page).toHaveURL(/#\/login$/);
    await page.getByLabel('Contraseña').fill('Test1234');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/#\/panel\/menu$/);
  });

  test('después de varios intentos fallidos bloquea la cuenta por unos minutos', async ({ page, api }) => {
    const correo = `bloqueo.${Date.now()}@duocuc.cl`;
    await api.admin('POST', '/usuarios', { nombre: 'Cuenta Bloqueo', email: correo, password: 'Test1234', rol: 'Personal Casino' });
    await escribirCorreo(page, correo);
    for (let i = 0; i < 5; i += 1) {
      await page.getByLabel('Contraseña').fill(`Mala${i}xyz`);
      await page.getByRole('button', { name: 'Ingresar' }).click();
      await expect(page.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
    }
    await page.getByLabel('Contraseña').fill('Test1234');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.')).toBeVisible();
    await expect(page).toHaveURL(/#\/login$/);
  });

  test('marcar «dispositivo compartido de cocina» deja la sesión fija en Disponibilidad', async ({ page }) => {
    await escribirCorreo(page, 'personal@duocuc.cl');
    await page.getByLabel('Contraseña').fill('Test1234');
    await page.getByLabel(/dispositivo compartido de cocina/).check();
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/#\/panel\/kiosco$/);
    const sesion = await page.evaluate(() => JSON.parse(localStorage.getItem('casino_sesion')));
    expect(sesion.kiosco).toBe(true);
  });

  test('el modo oscuro del personal se guarda en su cuenta y lo sigue a otro equipo', async ({ page, browser }) => {
    await entrarConClave(page, 'nutricionista@duocuc.cl');
    await expect(page).toHaveURL(/#\/panel\/menu$/);
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'oscuro');
    const otro = await browser.newContext();
    await otro.addInitScript(() => sessionStorage.setItem('casino_splash_visto', '1'));
    const otroEquipo = await otro.newPage();
    await otroEquipo.goto('/#/login');
    await otroEquipo.getByRole('textbox', { name: 'Correo' }).fill('nutricionista@duocuc.cl');
    await otroEquipo.getByRole('button', { name: 'Continuar' }).click();
    await otroEquipo.getByLabel('Contraseña').fill('Test1234');
    await otroEquipo.getByRole('button', { name: 'Ingresar' }).click();
    await expect(otroEquipo.locator('html')).toHaveAttribute('data-theme', 'oscuro');
    await otroEquipo.getByRole('button', { name: 'Cambiar a modo claro' }).first().click();
    await otro.close();
  });

  test('un correo que no es institucional se rechaza', async ({ page }) => {
    await escribirCorreo(page, 'alguien@gmail.com');
    await expect(page.getByText('Usa tu correo institucional (@duocuc.cl).')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toHaveCount(0);
  });

  test('un estudiante entra con su cuenta DUOC y vuelve al menú con su perfil @movil', async ({ page }) => {
    const correo = `alumno.login.${Date.now()}@duocuc.cl`;
    await escribirCorreo(page, correo);
    await expect(page.getByText('Cuenta de estudiante detectada.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Ingresar con mi cuenta DUOC' }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole('heading', { level: 1, name: /Menú del día/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inicia sesión para dejar tu opinión' })).toHaveCount(0);
  });

  test('se puede volver atrás y usar otro correo', async ({ page }) => {
    await escribirCorreo(page, 'personal@duocuc.cl');
    await page.getByRole('button', { name: 'personal@duocuc.cl' }).click();
    await expect(page.getByRole('textbox', { name: 'Correo' })).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toHaveCount(0);
  });

  test('la sesión se mantiene al recargar y se cierra con «Cerrar sesión»', async ({ page }) => {
    await entrarConClave(page, 'admin@duocuc.cl');
    await expect(page).toHaveURL(/#\/panel\/menu$/);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: /Planificación/ })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await page.goto('/#/panel/menu');
    await expect(page).toHaveURL(/#\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('casino_sesion'))).toBeNull();
  });

  test('una sesión guardada inválida se descarta sin romper la página', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('casino_sesion', JSON.stringify({ token: 'token.invalido.x', usuario: { nombre: 'X', rol: 'Administrador' } }))
    );
    await page.goto('/#/panel/usuarios');
    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  });

  test('«Volver al menú» regresa a la página pública', async ({ page }) => {
    await page.goto('/#/login');
    await page.getByRole('button', { name: 'Volver al menú' }).click();
    await expect(page).toHaveURL(/#\/$/);
  });
});
