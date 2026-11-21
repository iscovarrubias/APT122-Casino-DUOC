const { test, expect } = require('../soporte/fixtures');

const boton = (page, categoria) => page.getByRole('button', { name: new RegExp(`^${categoria} \\$`) });

async function venderGeneral(page, eleccion = 'Fruta Manzana') {
  await boton(page, 'General').click();
  const dialogo = page.getByRole('alertdialog', { name: 'Vendiendo General' });
  await expect(dialogo.getByText('¿Qué eligió el estudiante?')).toBeVisible();
  await dialogo.getByRole('button', { name: eleccion }).click();
  await expect(dialogo).toHaveCount(0);
}

test.describe('Inicio de jornada', () => {
  test('sin jornada iniciada se piden las porciones preparadas y luego aparecen los botones de venta', async ({
    page,
    api,
    entrarComo,
  }) => {
    await api.prepararDia({ porciones: 3 });
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await expect(page.getByRole('heading', { level: 2, name: 'Iniciar jornada' })).toBeVisible();
    await expect(boton(page, 'General')).toHaveCount(0);
    const general = page.getByRole('spinbutton', { name: 'General: Pollo arvejado con arroz' });
    await expect(general).toHaveValue('3');
    await general.fill('5');
    await page.getByRole('button', { name: 'Iniciar jornada' }).click();
    const confirmacion = page.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button').last().click();
    await expect(page.getByRole('status').filter({ hasText: 'Jornada iniciada.' })).toBeVisible();
    await expect(page.getByText(/Jornada abierta desde las \d{2}:\d{2}/)).toBeVisible();
    await expect(boton(page, 'General')).toContainText('5');
    expect(await api.restante('Pollo arvejado con arroz')).toBe(5);
  });
});

test.describe('Ventas en Disponibilidad y Caja', () => {
  test.beforeEach(async ({ api }) => {
    await api.prepararDia({ porciones: 3, iniciar: true });
  });

  test('vender un combo descuenta el plato y los acompañamientos elegidos @movil', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await venderGeneral(page, 'Fruta Manzana');
    await expect(page.getByRole('status').filter({ hasText: 'General - Fruta registrado' })).toBeVisible();
    await expect(boton(page, 'General')).toContainText('2');
    await expect(page.locator('main')).toContainText(/Manzana\s*Quedan 2/);
    await expect(page.locator('main')).toContainText(/Flan de caramelo\s*Quedan 3/);
    expect(await api.restante('Pollo arvejado con arroz')).toBe(2);
    expect(await api.restante('Jugo de naranja')).toBe(2);
    expect(await api.restante('Pan amasado')).toBe(2);
    await expect(page.getByRole('listitem').filter({ hasText: 'General' }).first()).toBeVisible();
  });

  test('elegir postre en vez de fruta descuenta el postre', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await venderGeneral(page, 'Postre Flan de caramelo');
    await expect.poll(() => api.restante('Flan de caramelo')).toBe(2);
    expect(await api.restante('Manzana')).toBe(3);
  });

  test('«Solo plato» descuenta únicamente el plato principal', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await page.getByRole('button', { name: 'Solo plato de General' }).click();
    await expect.poll(() => api.restante('Pollo arvejado con arroz')).toBe(2);
    for (const nombre of ['Jugo de naranja', 'Ensalada chilena', 'Sopa de verduras', 'Pan amasado', 'Manzana', 'Flan de caramelo']) {
      expect(await api.restante(nombre)).toBe(3);
    }
  });

  test('«Completo + máquina» no descuenta la bebida preparada', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await page.getByRole('button', { name: 'Completo + máquina de General' }).click();
    const dialogo = page.getByRole('alertdialog');
    if (await dialogo.isVisible().catch(() => false)) await dialogo.getByRole('button', { name: 'Fruta Manzana' }).click();
    await expect.poll(() => api.restante('Pollo arvejado con arroz')).toBe(2);
    expect(await api.restante('Jugo de naranja')).toBe(3);
    expect(await api.restante('Ensalada chilena')).toBe(2);
  });

  test('un menú sin opciones (JUNAEB) se vende con un solo toque', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await boton(page, 'JUNAEB').click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect.poll(() => api.restante('Arroz con pollo')).toBe(2);
  });

  test('un doble toque accidental registra una sola venta', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await boton(page, 'JUNAEB').dblclick();
    await expect.poll(() => api.restante('Arroz con pollo')).toBe(2);
    await page.waitForTimeout(800);
    expect(await api.restante('Arroz con pollo')).toBe(2);
  });

  test('cancelar la elección no registra la venta', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await boton(page, 'General').click();
    await page.getByRole('alertdialog', { name: 'Vendiendo General' }).getByRole('button', { name: 'Cancelar' }).click();
    expect(await api.restante('Pollo arvejado con arroz')).toBe(3);
  });

  test('«Deshacer» anula la última venta y devuelve el stock', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await venderGeneral(page);
    await expect.poll(() => api.restante('Pollo arvejado con arroz')).toBe(2);
    await page.getByRole('listitem').filter({ hasText: 'General' }).getByRole('button', { name: 'Deshacer' }).click();
    const confirmacion = page.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button').last().click();
    await expect.poll(() => api.restante('Pollo arvejado con arroz')).toBe(3);
    expect(await api.restante('Manzana')).toBe(3);
  });

  test('al vender la última porción el plato queda agotado también para los estudiantes', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    for (let i = 1; i <= 3; i += 1) {
      await boton(page, 'JUNAEB').click();
      await expect.poll(() => api.restante('Arroz con pollo')).toBe(3 - i);
      await page.waitForTimeout(450);
    }
    await expect(boton(page, 'JUNAEB')).toContainText(/Agotado/i);
    const publico = await api.pedir('GET', '/menu/hoy?categoria=JUNAEB');
    expect(publico.preparaciones.find((p) => p.nombre === 'Arroz con pollo').disponibilidad).toBe('agotado');
  });

  test('corregir la cantidad que queda según el conteo real', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await page.getByText('Corregir cantidades o registrar reposición').click();
    const campo = page.getByRole('spinbutton', { name: 'Cuántas quedan de Pollo arvejado con arroz' });
    await campo.fill('1');
    const fila = page.locator('.stock-fila').filter({ has: campo });
    await fila.getByRole('button', { name: 'Fijar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Cantidad actualizada.' })).toBeVisible();
    expect(await api.restante('Pollo arvejado con arroz')).toBe(1);
  });

  test('registrar una reposición suma porciones al stock', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await page.getByText('Corregir cantidades o registrar reposición').click();
    const fila = page
      .locator('.stock-fila')
      .filter({ has: page.getByRole('spinbutton', { name: 'Cuántas quedan de Pollo arvejado con arroz' }) });
    page.once('dialog', (d) => d.accept('4'));
    await fila.getByRole('button', { name: 'Repuse…' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Reposición registrada.' })).toBeVisible();
    expect(await api.restante('Pollo arvejado con arroz')).toBe(7);
  });

  test('«Ver qué incluye cada menú hoy» detalla los acompañamientos de cada categoría', async ({ page, entrarComo }) => {
    await entrarComo('cajero', { ruta: '/panel/caja' });
    await page.getByText('Ver qué incluye cada menú hoy').click();
    const detalle = page.locator('details').filter({ hasText: 'Ver qué incluye cada menú hoy' });
    await expect(detalle).toContainText('Hipocalórico');
    await expect(detalle).toContainText('Ensalada chilena');
  });

  test('el cajero vende desde la Caja con los mismos botones', async ({ page, api, entrarComo }) => {
    await entrarComo('cajero', { ruta: '/panel/caja' });
    await expect(page.getByRole('heading', { level: 1, name: 'Caja' })).toBeVisible();
    await venderGeneral(page);
    await expect.poll(() => api.restante('Pollo arvejado con arroz')).toBe(2);
  });
});

test.describe('Cierre de jornada', () => {
  test.beforeEach(async ({ api }) => {
    await api.prepararDia({ porciones: 3, iniciar: true });
  });

  test('cerrar con el conteo real registra sobrantes y diferencias', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await venderGeneral(page);
    await page.getByRole('button', { name: 'Cerrar jornada' }).click();
    await expect(page.getByRole('heading', { name: 'Así quedó el día según el sistema' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Pan: Pan amasado (sistema: 2)' }).fill('0');
    await page.getByRole('button', { name: 'Confirmar cierre' }).click();
    const confirmacion = page.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button').last().click();
    await expect(page.getByRole('status').filter({ hasText: 'Jornada cerrada.' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Jornada cerrada a las/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /^General Pollo arvejado con arroz 3 1 2/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /^Pan Pan amasado/ })).toContainText('-2');
    const estado = await api.estadoHoy();
    expect(estado.jornada.estado).toBe('cerrada');
    expect(estado.jornada.sobrante_contado).toBe(true);
  });

  test('«Seguir en la jornada» cancela el cierre', async ({ page, api, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await page.getByRole('button', { name: 'Cerrar jornada' }).click();
    await page.getByRole('button', { name: 'Seguir en la jornada' }).click();
    await expect(boton(page, 'General')).toBeVisible();
    expect((await api.estadoHoy()).jornada.estado).toBe('abierta');
  });

  test('corregir el conteo después del cierre', async ({ page, api, entrarComo }) => {
    await api.admin('POST', '/jornada/cerrar', {});
    await entrarComo('personal', { ruta: '/panel/kiosco' });
    await page.getByRole('button', { name: 'Corregir conteo' }).click();
    await expect(page.getByRole('heading', { name: 'Corregir el conteo del cierre' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Cantidad real de Sopa de verduras' }).fill('1');
    await page.getByRole('button', { name: /Guardar/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Corrección registrada.' })).toBeVisible();
    const sopa = (await api.estadoHoy()).componentes.find((c) => c.preparacion === 'Sopa de verduras');
    expect(sopa.corregido).toBe(true);
  });

  test('reabrir la jornada desde la Caja permite seguir vendiendo', async ({ page, api, entrarComo }) => {
    await api.admin('POST', '/jornada/cerrar', {});
    await entrarComo('admin', { ruta: '/panel/caja' });
    await page.getByRole('button', { name: 'Reabrir jornada' }).click();
    const confirmacion = page.getByRole('alertdialog');
    await expect(confirmacion).toContainText('La jornada volverá a estar abierta');
    await confirmacion.getByRole('button', { name: 'Reabrir' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Jornada reabierta.' })).toBeVisible();
    await expect(boton(page, 'General')).toBeVisible();
    expect((await api.estadoHoy()).jornada.estado).toBe('abierta');
  });

  test('con la jornada cerrada no se pueden registrar ventas', async ({ api }) => {
    await api.admin('POST', '/jornada/cerrar', {});
    const { token } = await api.sesion('cajero@duocuc.cl');
    await expect(api.pedir('POST', '/jornada/ventas', { categoria: 'JUNAEB' }, token)).rejects.toMatchObject({ estado: 409 });
  });
});
