const { test, expect } = require('../soporte/fixtures');

async function esperarMenu(page) {
  await expect(page.getByRole('heading', { level: 2, name: /Pollo arvejado con arroz|Budín de zapallito italiano/ })).toBeVisible();
}

async function abrirPerfil(page) {
  await esperarMenu(page);
  const directo = page.getByRole('button', { name: 'Mi perfil' });
  if (await directo.isVisible()) {
    await directo.click();
  } else {
    await page.getByRole('button', { name: 'Abrir configuración' }).click();
    await page.getByRole('button', { name: /Cuenta y perfil/ }).click();
  }
  const perfil = page.getByRole('dialog', { name: 'Mi perfil' });
  await expect(perfil).toBeVisible();
  return perfil;
}

test.describe('Funciones del estudiante', () => {
  test.beforeAll(async () => {
    const { Api } = require('../soporte/api');
    await new Api().prepararDia({ iniciar: true });
  });

  test('al registrar una alergia, el menú que la contiene muestra un aviso @movil', async ({ page, estudiante }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    await expect(page.getByText('Este menú contiene alérgenos de tu perfil')).toHaveCount(0);
    const perfil = await abrirPerfil(page);
    await perfil.getByRole('button', { name: 'Lácteos' }).click();
    await expect(perfil.getByRole('button', { name: 'Lácteos' })).toHaveAttribute('aria-pressed', 'true');
    await perfil.getByRole('button', { name: 'Guardar' }).click();
    await expect(perfil.getByText('Cambios guardados.')).toBeVisible();
    await perfil.getByRole('button', { name: 'Cerrar', exact: true }).click();
    const aviso = page.getByRole('alert').filter({ hasText: 'Este menú contiene alérgenos de tu perfil' });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Lácteos');
    await page.getByRole('button', { name: 'Hipocalórico', exact: true }).click();
    await expect(page.getByText('Este menú contiene alérgenos de tu perfil')).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'General', exact: true }).click();
    await expect(page.getByText('Este menú contiene alérgenos de tu perfil')).toBeVisible();
    expect(estudiante.usuario.rol).toBe('Estudiante');
  });

  test('la categoría preferida abre el menú directamente en ella', async ({ page, estudiante }) => {
    await page.goto('/');
    const perfil = await abrirPerfil(page);
    await perfil.getByRole('button', { name: 'Vegetariano' }).click();
    await perfil.getByRole('button', { name: 'Guardar' }).click();
    await expect(perfil.getByText('Cambios guardados.')).toBeVisible();
    await perfil.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: 'Budín de zapallito italiano' })).toBeVisible();
    expect(estudiante.email).toContain('@duocuc.cl');
  });

  test('marcar un plato como favorito lo guarda en el perfil y se puede quitar', async ({ page, estudiante }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Marcar Pollo arvejado con arroz como favorito' }).click();
    await expect(page.getByRole('button', { name: 'Quitar Pollo arvejado con arroz de favoritos' })).toBeVisible();
    const perfil = await abrirPerfil(page);
    const favoritos = perfil.getByRole('group', { name: 'Mis favoritos' });
    await expect(favoritos.getByText('Pollo arvejado con arroz')).toBeVisible();
    await favoritos.getByRole('button', { name: 'Quitar' }).click();
    await expect(favoritos.getByText('Aún no has marcado platos como favoritos.')).toBeVisible();
    await perfil.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Marcar Pollo arvejado con arroz como favorito' })).toBeVisible();
    expect(estudiante.token).toBeTruthy();
  });

  test('calificar, editar y borrar una opinión @movil', async ({ page, estudiante }) => {
    await require('../soporte/bd').borrarCalificaciones('Pollo arvejado con arroz');
    await page.goto('/');
    await esperarMenu(page);
    const detalles = page.getByRole('button', { name: 'Ver detalles' });
    if (await detalles.first().isVisible()) await detalles.first().click();
    const tarjeta = page.locator('.opinion').first();
    await tarjeta.getByRole('button', { name: 'Calificar' }).click();
    await expect(tarjeta.getByText(/Tu opinión es pública/)).toBeVisible();
    await tarjeta.getByRole('button', { name: '4 estrellas' }).click();
    await tarjeta.getByPlaceholder(/¿Qué te pareció\?/).fill('Muy rico, buena porción');
    await tarjeta.getByRole('button', { name: 'Guardar' }).click();
    await expect(tarjeta.getByRole('button', { name: 'Editar mi calificación' })).toBeVisible();
    await expect(tarjeta.getByText(/4\.0 - 1 voto/)).toBeVisible();

    await tarjeta.getByRole('button', { name: 'Ver opiniones' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('Muy rico, buena porción')).toBeVisible();
    await modal
      .getByRole('button', { name: /Cerrar/ })
      .first()
      .click();

    await tarjeta.getByRole('button', { name: 'Editar mi calificación' }).click();
    await tarjeta.getByRole('button', { name: '2 estrellas' }).click();
    await tarjeta.getByRole('button', { name: 'Guardar' }).click();
    await expect(tarjeta.getByText(/2\.0 - 1 voto/)).toBeVisible();

    await tarjeta.getByRole('button', { name: 'Borrar' }).click();
    const confirmacion = page.getByRole('alertdialog');
    await expect(confirmacion).toContainText('¿Borrar tu calificación de este plato?');
    await confirmacion.getByRole('button', { name: 'Borrar' }).click();
    await expect(tarjeta.getByText('Todavía sin calificaciones')).toBeVisible();
    await expect(tarjeta.getByRole('button', { name: 'Calificar' })).toBeVisible();
    expect(estudiante.usuario.nombre).toBeTruthy();
  });

  test('las opiniones eliminadas por el estudiante quedan registradas para el casino', async ({ api, estudiante }) => {
    const id = await api.idPreparacion('Pollo arvejado con arroz');
    await api.pedir(
      'PUT',
      `/estudiante/calificaciones/${id}`,
      { estrellas: 1, comentario: 'Frío', categoria: 'General' },
      estudiante.token
    );
    await api.pedir('DELETE', `/estudiante/calificaciones/${id}`, undefined, estudiante.token);
    const detalle = await api.admin('GET', `/opiniones/detalle?id_preparacion=${id}&estado=eliminada`);
    expect(detalle.opiniones.some((o) => o.comentario === 'Frío' && o.correo === estudiante.email)).toBe(true);
  });

  test('cerrar sesión deja al estudiante como visitante', async ({ page, estudiante }) => {
    await page.goto('/');
    await esperarMenu(page);
    const salir = page.getByRole('button', { name: 'Cerrar sesión' });
    if (!(await salir.isVisible())) await page.getByRole('button', { name: 'Abrir configuración' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inicia sesión para dejar tu opinión' }).first()).toBeVisible();
    expect(estudiante.email).toBeTruthy();
  });
});
