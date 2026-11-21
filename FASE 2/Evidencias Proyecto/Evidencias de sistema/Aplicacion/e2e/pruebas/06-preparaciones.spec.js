const path = require('node:path');
const { test, expect } = require('../soporte/fixtures');

const NOMBRE = `Tortilla de prueba ${Date.now()}`;

const tarjeta = (page, nombre) =>
  page.locator('article').filter({ has: page.getByRole('button', { name: `Editar ${nombre}`, exact: true }) });

test.describe('Preparaciones (recetas)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ entrarComo, page }) => {
    await entrarComo('nutricionista', { ruta: '/panel/preparaciones' });
    await expect(page.getByRole('heading', { level: 1, name: /Preparaciones/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar Arroz con pollo' })).toBeVisible();
  });

  test('crear un plato con ingredientes, alérgenos sugeridos y nutrición calculada', async ({ page, api }) => {
    await page.getByRole('button', { name: 'Nuevo plato' }).click();
    const form = page.getByRole('dialog', { name: 'Nueva preparación' });
    await expect(form.getByRole('heading', { name: 'Nuevo plato' })).toBeVisible();
    await form.getByRole('textbox', { name: 'Nombre' }).fill(NOMBRE);
    await form.getByRole('textbox', { name: 'Descripción' }).fill('Tortilla de huevo con papas, receta de prueba E2E.');
    for (const [i, [ingrediente, gramos]] of [
      ['Huevo', '600'],
      ['Papa', '800'],
      ['Cebolla', '200'],
      ['Sal', ''],
    ].entries()) {
      await form.getByRole('button', { name: 'Agregar ingrediente' }).click();
      await form.getByRole('combobox', { name: `Ingrediente ${i + 1}` }).selectOption({ label: ingrediente });
      if (gramos) await form.getByRole('spinbutton', { name: `Gramos del ingrediente ${i + 1}` }).fill(gramos);
    }
    await form.getByRole('spinbutton', { name: 'La receta rinde (porciones)' }).fill('6');
    const sugeridos = form.getByRole('status').filter({ hasText: 'Alérgenos sugeridos' });
    await expect(sugeridos).toContainText('Huevo');
    await sugeridos.getByRole('button', { name: 'Agregar los sugeridos' }).click();
    await expect(form.getByRole('checkbox', { name: 'Huevo' })).toBeChecked();
    await form.getByRole('button', { name: 'Calcular desde los ingredientes' }).click();
    await expect(form.getByRole('spinbutton', { name: 'Calorías (kcal)' })).not.toHaveValue('');
    const kcal = Number(await form.getByRole('spinbutton', { name: 'Calorías (kcal)' }).inputValue());
    expect(kcal).toBeGreaterThan(50);
    await form.getByRole('button', { name: 'Guardar plato' }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Editar ${NOMBRE}` })).toBeVisible();

    const creada = (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === NOMBRE);
    expect(creada.alergenos).toContain('Huevo');
    expect(creada.ingredientes).toEqual(expect.arrayContaining(['Huevo', 'Papa', 'Cebolla', 'Sal']));
    expect(Number(creada.porciones_receta)).toBe(6);
  });

  test('un plato sin nombre no se puede guardar', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo plato' }).click();
    const form = page.getByRole('dialog', { name: 'Nueva preparación' });
    await form.getByRole('button', { name: 'Guardar plato' }).click();
    await expect(form).toBeVisible();
    const valido = await form.getByRole('textbox', { name: 'Nombre' }).evaluate((el) => el.checkValidity());
    const alerta = await form.getByRole('alert').count();
    expect(valido === false || alerta > 0).toBe(true);
    await form.getByRole('button', { name: 'Cancelar' }).click();
    await expect(form).toHaveCount(0);
  });

  test('buscar filtra la lista de platos', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Buscar en platos' }).fill('pastel');
    await expect(page.getByRole('button', { name: 'Editar Pastel de choclo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar Arroz con pollo' })).toHaveCount(0);
  });

  test('ver el detalle de una receta desde la tarjeta', async ({ page }) => {
    await page.getByRole('button', { name: 'Más acciones de Arroz con pollo' }).click();
    await page.getByRole('menuitem', { name: 'Ver detalle' }).click();
    const t = tarjeta(page, 'Arroz con pollo');
    await expect(t.getByText(/Pollo/).first()).toBeVisible();
    await expect(t.getByText(/kcal/).first()).toBeVisible();
  });

  test('editar un plato y ver el cambio reflejado', async ({ page, api }) => {
    await page.getByRole('button', { name: `Editar ${NOMBRE}` }).click();
    const form = page.getByRole('dialog');
    await expect(form.getByRole('heading', { name: 'Editar preparación' })).toBeVisible();
    await form.getByRole('textbox', { name: 'Descripción' }).fill('Descripción editada por la prueba E2E.');
    await form.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(form).toHaveCount(0);
    const editada = (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === NOMBRE);
    expect(editada.descripcion).toBe('Descripción editada por la prueba E2E.');
  });

  test('subir una foto la recorta y la deja asociada al plato', async ({ page, api }) => {
    await page.getByRole('button', { name: `Editar ${NOMBRE}` }).click();
    const form = page.getByRole('dialog');
    await form.locator('input[type=file]').setInputFiles(path.join(__dirname, '..', 'soporte', 'foto-prueba.png'));
    const recorte = page.getByRole('dialog', { name: 'Ajustar la foto' });
    await expect(recorte.getByRole('button', { name: 'Usar esta foto' })).toBeEnabled();
    await recorte.getByRole('button', { name: 'Usar esta foto' }).click();
    await expect(recorte).toHaveCount(0);
    await expect(form.getByRole('textbox', { name: 'Enlace de la imagen' })).toHaveValue(/(\/api\/imagenes\/|^$)/);
    await form.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(form).toHaveCount(0);
    const conFoto = (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === NOMBRE);
    expect(conFoto.imagen_url).toMatch(/^\/api\/imagenes\/[\w-]+$/);
    const r = await fetch(`http://localhost:${require('../soporte/entorno').PUERTO_API}${conFoto.imagen_url}`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/image\//);
  });

  test('desactivar oculta el plato de la planificación y se puede reactivar', async ({ page, api }) => {
    await page.getByRole('button', { name: `Más acciones de ${NOMBRE}` }).click();
    await page.getByRole('menuitem', { name: 'Desactivar' }).click();
    const confirmacion = page.getByRole('alertdialog');
    await expect(confirmacion).toContainText(`¿Desactivar "${NOMBRE}"?`);
    await confirmacion.getByRole('button', { name: 'Desactivar' }).click();
    await expect.poll(async () => (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === NOMBRE).activa).toBe(false);
    const activas = await api.pedir('GET', '/preparaciones');
    expect(activas.map((p) => p.nombre)).not.toContain(NOMBRE);

    await page.getByRole('checkbox', { name: 'Ocultar desactivadas' }).check();
    await expect(page.getByRole('button', { name: `Editar ${NOMBRE}` })).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Ocultar desactivadas' }).uncheck();

    await page.getByRole('button', { name: `Más acciones de ${NOMBRE}` }).click();
    await page.getByRole('menuitem', { name: 'Reactivar' }).click();
    await expect.poll(async () => (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === NOMBRE).activa).toBe(true);
  });

  test('borrar solo se permite en platos desactivados', async ({ page, api }) => {
    await page.getByRole('button', { name: `Más acciones de ${NOMBRE}` }).click();
    await page.getByRole('menuitem', { name: 'Borrar' }).click();
    const confirmacion = page.getByRole('alertdialog');
    if (await confirmacion.isVisible().catch(() => false)) await confirmacion.getByRole('button', { name: 'Borrar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Primero desactívala' })).toContainText(
      'Solo se pueden borrar preparaciones desactivadas'
    );
    expect((await api.admin('GET', '/preparaciones/gestion')).some((p) => p.nombre === NOMBRE)).toBe(true);

    await page.getByRole('button', { name: `Más acciones de ${NOMBRE}` }).click();
    await page.getByRole('menuitem', { name: 'Desactivar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Desactivar' }).click();
    await expect.poll(async () => (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === NOMBRE).activa).toBe(false);
    await page.getByRole('button', { name: `Más acciones de ${NOMBRE}` }).click();
    await page.getByRole('menuitem', { name: 'Borrar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar' }).click();
    await expect(page.getByRole('button', { name: `Editar ${NOMBRE}` })).toHaveCount(0);
    expect((await api.admin('GET', '/preparaciones/gestion')).some((p) => p.nombre === NOMBRE)).toBe(false);
  });

  test('un plato que ya se usó en un menú no se puede borrar, solo desactivar', async ({ api }) => {
    const id = await api.idPreparacion('Pastel de jaiba');
    await api.admin('PATCH', `/preparaciones/${id}/desactivar`);
    await expect(api.admin('DELETE', `/preparaciones/${id}`)).rejects.toMatchObject({ estado: 409 });
    await api.admin('PATCH', `/preparaciones/${id}/reactivar`);
  });

  test('crear un acompañamiento nuevo', async ({ page, api }) => {
    const nombre = `Jugo de prueba ${Date.now()}`;
    await page.getByRole('button', { name: 'Nuevo acompañamiento' }).click();
    const form = page.getByRole('dialog');
    await expect(form.getByRole('heading', { name: 'Nuevo acompañamiento' })).toBeVisible();
    await form.getByRole('textbox', { name: 'Nombre' }).fill(nombre);
    await form.getByRole('combobox', { name: 'Tipo de componente' }).selectOption('Bebida');
    await form.getByRole('button', { name: 'Guardar acompañamiento' }).click();
    await expect(form).toHaveCount(0);
    const creado = (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === nombre);
    expect(creado.tipo).toBe('Bebida');
  });
});

test.describe('Receta usada en el menú y variaciones', () => {
  test.beforeAll(async () => {
    const { Api } = require('../soporte/api');
    await new Api().prepararDia({ publicar: false });
  });

  test('la receta que muestra la planificación es la misma registrada en Preparaciones', async ({ page, api, entrarComo }) => {
    await entrarComo('nutricionista', { ruta: '/panel/menu' });
    await page.getByRole('button', { name: 'Ver receta de General' }).click();
    const receta = page.getByRole('dialog', { name: 'Receta de Pollo arvejado con arroz' });
    await expect(receta).toBeVisible();
    const filas = await receta.getByRole('table').first().getByRole('row').allTextContents();
    const registrada = (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === 'Pollo arvejado con arroz');
    for (const ingrediente of registrada.ingredientes) {
      expect(filas.some((f) => f.startsWith(ingrediente))).toBe(true);
    }
    expect(filas.length - 1).toBe(registrada.ingredientes.length);
  });

  test('crear una variación desde el menú no modifica la receta original', async ({ page, api, entrarComo }) => {
    const antes = (await api.admin('GET', '/preparaciones/gestion')).find((p) => p.nombre === 'Pollo arvejado con arroz');
    await entrarComo('nutricionista', { ruta: '/panel/menu' });
    await page.getByRole('button', { name: 'Ver receta de General' }).click();
    await page.getByRole('dialog', { name: 'Receta de Pollo arvejado con arroz' }).getByRole('button', { name: 'Crear variación' }).click();
    const form = page.getByRole('dialog', { name: 'Nueva preparación' });
    await expect(form.getByRole('heading', { name: 'Nueva variación de "Pollo arvejado con arroz"' })).toBeVisible();
    await expect(form.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Pollo arvejado con arroz (variación)');
    await expect(form.getByText('La receta original no se modifica.', { exact: false })).toBeVisible();
    const nombreVariacion = `Pollo arvejado sin arvejas ${Date.now()}`;
    await form.getByRole('textbox', { name: 'Nombre' }).fill(nombreVariacion);
    const filaArvejas = form.getByRole('combobox', { name: /^Ingrediente \d+$/ });
    const total = await filaArvejas.count();
    for (let i = 0; i < total; i += 1) {
      const combo = form.getByRole('combobox', { name: `Ingrediente ${i + 1}` });
      const texto = await combo.evaluate((s) => s.options[s.selectedIndex]?.text);
      if (texto === 'Arvejas') {
        await form.getByRole('button', { name: `Quitar ingrediente ${i + 1}` }).click();
        break;
      }
    }
    await form.getByRole('button', { name: 'Guardar variación' }).click();
    await expect(form.getByRole('alert')).toContainText(
      'Cambiaste la receta: presiona "Calcular desde los ingredientes" de nuevo antes de guardar.'
    );
    await form.getByRole('button', { name: 'Calcular desde los ingredientes' }).click();
    await expect(form.getByRole('button', { name: 'Calcular desde los ingredientes' })).toBeEnabled();
    await form.getByRole('button', { name: 'Guardar variación' }).click();
    await expect(form).toHaveCount(0);

    const todas = await api.admin('GET', '/preparaciones/gestion');
    const variacion = todas.find((p) => p.nombre === nombreVariacion);
    const despues = todas.find((p) => p.nombre === 'Pollo arvejado con arroz');
    expect(variacion.base_nombre).toBe('Pollo arvejado con arroz');
    expect(variacion.ingredientes).not.toContain('Arvejas');
    expect(despues.ingredientes).toEqual(antes.ingredientes);
    expect(despues.ingredientes).toContain('Arvejas');

    await entrarComo('nutricionista', { ruta: '/panel/preparaciones' });
    await page.goto('/#/panel/preparaciones');
    await expect(tarjeta(page, nombreVariacion).getByText('Variación de Pollo arvejado con arroz')).toBeVisible();
  });

  test('el personal del casino ve la receta pero no puede crear variaciones', async ({ page, entrarComo }) => {
    await entrarComo('personal', { ruta: '/panel/menu' });
    await page.getByRole('button', { name: 'Ver receta de General' }).click();
    const receta = page.getByRole('dialog', { name: 'Receta de Pollo arvejado con arroz' });
    await expect(receta).toBeVisible();
    await expect(receta.getByRole('button', { name: 'Crear variación' })).toHaveCount(0);
  });
});
