const { test, expect } = require('../soporte/fixtures');
const { CLAVE } = require('../soporte/entorno');

const sello = Date.now();
const NUEVO = { nombre: `Cajera Nueva ${sello}`, email: `cajera.nueva.${sello}@duocuc.cl` };

const fila = (page, nombre) => page.getByRole('row', { name: new RegExp(nombre) });

async function intentarEntrar(api, email, password) {
  return api.pedir('POST', '/auth/login', { email, password }).then(
    () => true,
    (e) => e.estado
  );
}

test.describe('Gestión de usuarios', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ entrarComo, page }) => {
    await entrarComo('admin', { ruta: '/panel/usuarios' });
    await expect(page.getByRole('heading', { level: 1, name: /Usuarios/ })).toBeVisible();
    await expect(fila(page, 'Admin de Prueba')).toBeVisible();
  });

  test('lista al personal y marca la propia cuenta, que no se puede degradar', async ({ page }) => {
    await expect(fila(page, 'Admin de Prueba \\(tú\\)')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Rol de Admin de Prueba' })).toBeDisabled();
    await expect(fila(page, 'Admin de Prueba')).not.toContainText('Desactivar');
    await expect(fila(page, 'Cajero de Prueba')).toContainText('Cajero');
  });

  test('crear un usuario nuevo que luego puede iniciar sesión con su rol', async ({ page, api }) => {
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    const form = page.getByRole('dialog', { name: 'Nuevo usuario' });
    await form.getByRole('textbox', { name: 'Nombre' }).fill(NUEVO.nombre);
    await form.getByRole('textbox', { name: 'Correo' }).fill(NUEVO.email);
    await form.getByRole('textbox', { name: /^Contraseña/ }).fill(CLAVE);
    await form.getByRole('combobox', { name: 'Rol' }).selectOption('Cajero');
    await form.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(form).toHaveCount(0);
    await expect(fila(page, NUEVO.nombre)).toContainText('Activo');
    expect(await intentarEntrar(api, NUEVO.email, CLAVE)).toBe(true);
  });

  test('una contraseña corta o un correo repetido se rechazan', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    const form = page.getByRole('dialog', { name: 'Nuevo usuario' });
    await form.getByRole('textbox', { name: 'Nombre' }).fill('Otro Usuario');
    await form.getByRole('textbox', { name: 'Correo' }).fill(NUEVO.email);
    await form.getByRole('textbox', { name: /^Contraseña/ }).fill('corta');
    await form.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(form).toBeVisible();
    await form.getByRole('textbox', { name: /^Contraseña/ }).fill('ClaveLarga123');
    await form.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(form.getByRole('alert')).toBeVisible();
    await expect(form).toBeVisible();
  });

  test('buscar por nombre y filtrar por rol', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Buscar usuario' }).fill('Cajera Nueva');
    await expect(fila(page, NUEVO.nombre)).toBeVisible();
    await expect(fila(page, 'Admin de Prueba')).toHaveCount(0);
    await page.getByRole('searchbox', { name: 'Buscar usuario' }).fill('');
    await page.getByRole('combobox', { name: 'Filtrar por rol' }).selectOption('Nutricionista');
    await expect(fila(page, 'Nutricionista de Prueba')).toBeVisible();
    await expect(fila(page, 'Cajero de Prueba')).toHaveCount(0);
  });

  test('cambiar el rol de un usuario cambia lo que puede hacer', async ({ page, api }) => {
    await page.getByRole('combobox', { name: `Rol de ${NUEVO.nombre}` }).selectOption('Personal Casino');
    const confirmacion = page.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button').last().click();
    await expect(page.getByRole('status')).toBeVisible();
    const sesion = await api.pedir('POST', '/auth/login', { email: NUEVO.email, password: CLAVE });
    expect(sesion.usuario.rol).toBe('Personal Casino');
  });

  test('cambiar la contraseña de otro usuario', async ({ page, api }) => {
    await fila(page, NUEVO.nombre).getByRole('button', { name: 'Cambiar contraseña' }).click();
    await fila(page, NUEVO.nombre)
      .getByRole('textbox', { name: `Nueva contraseña de ${NUEVO.nombre}` })
      .fill('OtraClave456');
    await fila(page, NUEVO.nombre).getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status')).toBeVisible();
    expect(await intentarEntrar(api, NUEVO.email, 'OtraClave456')).toBe(true);
    expect(await intentarEntrar(api, NUEVO.email, CLAVE)).toBe(401);
  });

  test('un usuario desactivado no puede entrar y al reactivarlo vuelve a tener acceso', async ({ page, api }) => {
    await fila(page, NUEVO.nombre).getByRole('button', { name: 'Desactivar' }).click();
    const confirmacion = page.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button').last().click();
    await expect(page.getByRole('status').filter({ hasText: 'Usuario desactivado.' })).toBeVisible();
    await expect(fila(page, NUEVO.nombre)).toContainText('Desactivado');
    expect(await intentarEntrar(api, NUEVO.email, 'OtraClave456')).not.toBe(true);

    await fila(page, NUEVO.nombre).getByRole('button', { name: 'Reactivar' }).click();
    await expect(fila(page, NUEVO.nombre)).toContainText('Activo');
    expect(await intentarEntrar(api, NUEVO.email, 'OtraClave456')).toBe(true);
  });

  test('los estudiantes que entraron con su cuenta aparecen al filtrar por Estudiante', async ({ page, api }) => {
    const correo = `alumno.lista.${sello}@duocuc.cl`;
    await api.sesion(correo);
    await page.getByRole('combobox', { name: 'Filtrar por rol' }).selectOption('Estudiante');
    await page.getByRole('searchbox', { name: 'Buscar usuario' }).fill(correo);
    await expect(page.getByRole('row', { name: new RegExp(correo.replace(/\./g, '\\.')) })).toBeVisible();
  });
});
