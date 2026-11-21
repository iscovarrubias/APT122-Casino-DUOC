const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('../soporte/fixtures');

const NORMAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function revisar(page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity)
  );
  const { violations } = await new AxeBuilder({ page }).withTags(NORMAS).analyze();
  const resumen = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`
  );
  expect(resumen, resumen.join('\n')).toEqual([]);
}

async function abrirPerfil(page) {
  const directo = page.getByRole('button', { name: 'Mi perfil' });
  if (await directo.isVisible()) await directo.click();
  else {
    await page.getByRole('button', { name: 'Abrir configuración' }).click();
    await page.getByRole('button', { name: /Cuenta y perfil/ }).click();
  }
  await expect(page.getByRole('dialog', { name: 'Mi perfil' })).toBeVisible();
}

test.describe('Accesibilidad WCAG 2.1 AA con axe', () => {
  test.beforeAll(async () => {
    const { Api } = require('../soporte/api');
    await new Api().prepararDia({ porciones: 30, iniciar: true });
  });

  for (const tema of ['claro', 'oscuro']) {
    test(`menú público en modo ${tema} @movil`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('casino_tema', t), tema);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
      await revisar(page);
    });
  }

  test('menú semanal y preguntas frecuentes @movil', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Semanal' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Menú semanal' })).toBeVisible();
    await revisar(page);
    await page.getByRole('button', { name: 'Preguntas' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' })).toBeVisible();
    await revisar(page);
  });

  test('opiniones y perfil del estudiante', async ({ page, estudiante }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    await page.getByRole('button', { name: 'Ver opiniones' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await revisar(page);
    await page.keyboard.press('Escape');
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    await abrirPerfil(page);
    await revisar(page);
    expect(estudiante.usuario.rol).toBe('Estudiante');
  });

  for (const ruta of ['/login', '/terminos', '/privacidad']) {
    test(`página ${ruta} @movil`, async ({ page }) => {
      await page.goto(`/#${ruta}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await revisar(page);
    });
  }

  for (const [ruta, titulo] of [
    ['/panel/menu', /Planificación/],
    ['/panel/preparaciones', /Preparaciones/],
    ['/panel/ingredientes', /Ingredientes/],
    ['/panel/usuarios', /Usuarios/],
    ['/panel/kiosco', /Disponibilidad/],
    ['/panel/caja', /Caja/],
  ]) {
    test(`panel ${ruta}`, async ({ page, entrarComo }) => {
      await entrarComo('admin', { ruta });
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await revisar(page);
    });
  }

  test('todas las pestañas de Análisis', async ({ page, entrarComo }) => {
    await entrarComo('admin', { ruta: '/panel/analisis' });
    await expect(page.getByRole('heading', { name: 'Comparación entre menús' })).toBeVisible();
    await revisar(page);
    for (const pestana of ['Predicción', 'Opiniones', 'Informe general']) {
      await page.getByRole('tab', { name: pestana }).click();
      await page.waitForLoadState('networkidle');
      await revisar(page);
    }
  });

  test('formularios y ventanas del panel', async ({ page, entrarComo }) => {
    await entrarComo('admin', { ruta: '/panel/menu' });
    await page.getByRole('button', { name: 'Ver receta de General' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await revisar(page);
    await page.goto('/#/panel/preparaciones');
    await page.getByRole('button', { name: 'Nuevo plato' }).click();
    await expect(page.getByRole('dialog', { name: 'Nueva preparación' })).toBeVisible();
    await revisar(page);
    await page.goto('/#/panel/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await expect(page.getByRole('dialog', { name: 'Nuevo usuario' })).toBeVisible();
    await revisar(page);
  });

  test('panel en modo oscuro', async ({ page, entrarComo }) => {
    await page.addInitScript(() => localStorage.setItem('casino_tema', 'oscuro'));
    await entrarComo('admin', { ruta: '/panel/menu' });
    await expect(page.getByRole('heading', { level: 1, name: /Planificación/ })).toBeVisible();
    await revisar(page);
  });
});
