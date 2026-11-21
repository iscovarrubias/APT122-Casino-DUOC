const { test, expect } = require('../soporte/fixtures');
const bd = require('../soporte/bd');
const { TOKEN_TAREAS, URL_API } = require('../soporte/entorno');
const { hoyChile } = require('../soporte/api');

async function abrirPerfil(page) {
  await expect(page.getByRole('heading', { level: 1, name: /Menú del día/ })).toBeVisible();
  const directo = page.getByRole('button', { name: 'Mi perfil' });
  if (await directo.isVisible()) await directo.click();
  else {
    await page.getByRole('button', { name: 'Abrir configuración' }).click();
    await page.getByRole('button', { name: /Cuenta y perfil/ }).click();
  }
  return page.getByRole('dialog', { name: 'Mi perfil' });
}

const tarea = (tipo, fecha) =>
  fetch(`${URL_API}/correos/tareas/${tipo}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_TAREAS}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha }),
  }).then((r) => r.json());

test.describe('Hora estimada de agotamiento para el estudiante', () => {
  test('con la jornada abierta, el reloj explica cuándo se agotaría el menú @movil', async ({ page, api }) => {
    await api.prepararDia({ porciones: 40, iniciar: true });
    const { token } = await api.sesion('cajero@duocuc.cl');
    for (let i = 0; i < 10; i += 1) await api.pedir('POST', '/jornada/ventas', { categoria: 'General', opcion: 'Fruta' }, token);
    await page.goto('/');
    const detalles = page.getByRole('button', { name: 'Ver detalles' });
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    if (await detalles.first().isVisible()) await detalles.first().click();
    const reloj = page.getByRole('button', { name: 'Hora estimada de agotamiento del menú General' });
    await expect(reloj).toBeVisible();
    await reloj.click();
    const globo = page.getByRole('tooltip');
    await expect(globo).toContainText(/(Se agotaría cerca de las \d{2}:\d{2}|Debería alcanzar hasta el cierre)/);
    await expect(globo).toContainText('Es una estimación');
    await page.keyboard.press('Escape');
    await expect(globo).toHaveCount(0);
  });

  test('antes de iniciar la jornada no aparece el reloj', async ({ page, api }) => {
    await api.prepararDia({ porciones: 40, iniciar: false });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Pollo arvejado con arroz' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hora estimada de agotamiento/ })).toHaveCount(0);
  });

  test('la estimación pública no requiere sesión ni expone datos internos', async ({ api }) => {
    await api.prepararDia({ porciones: 40, iniciar: true });
    const r = await api.pedir('GET', '/prediccion/publica');
    for (const c of r.categorias) {
      expect(['se_agota', 'alcanza', 'agotado']).toContain(c.estado);
      expect(c).not.toHaveProperty('vendidas');
    }
  });
});

test.describe('Avisos por correo', () => {
  const sumar = (fecha, dias) => {
    const d = new Date(`${fecha}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  const base = sumar(hoyChile(), 60);
  const LUNES = sumar(base, (8 - new Date(`${base}T12:00:00Z`).getUTCDay()) % 7);
  const MARTES = sumar(LUNES, 1);
  const DOMINGO = sumar(LUNES, -1);

  test.beforeAll(async () => {
    await bd.consulta('UPDATE preferencia_correo SET menu_semanal = FALSE, avisos_favoritos = FALSE');
  });

  test('el estudiante activa los avisos desde su perfil y recibe un solo correo semanal', async ({ page, api, estudiante }) => {
    await api.prepararDia({ fecha: LUNES, porciones: 20 });
    await api.prepararDia({ fecha: MARTES, porciones: 20 });
    await api.pedir('PUT', `/estudiante/favoritos/${await api.idPreparacion('Flan de caramelo')}`, {}, estudiante.token);
    await page.goto('/');
    const perfil = await abrirPerfil(page);
    const menu = perfil.getByRole('checkbox', { name: /Menú de la semana/ });
    const favoritos = perfil.getByRole('checkbox', { name: /Avisos de mis favoritos/ });
    await expect(menu).not.toBeChecked();
    await menu.check();
    await favoritos.check();
    await expect(perfil.getByText(/recibirás un solo correo: el menú semanal con tus favoritos destacados/)).toBeVisible();
    await perfil.getByRole('button', { name: 'Guardar' }).click();
    await expect(perfil.getByText('Cambios guardados.')).toBeVisible();

    const r = await tarea('semanal', DOMINGO);
    expect(r.clave).toBe(LUNES);
    const correos = await bd.consulta(
      'SELECT c.tipo, c.asunto FROM correo_enviado c JOIN usuario u USING (id_usuario) WHERE u.email = $1 ORDER BY c.id_correo',
      [estudiante.email]
    );
    expect(correos.map((c) => c.tipo)).toEqual(['semanal']);
    expect(correos[0].asunto).toMatch(/incluye tus favoritos/);

    const dia = await tarea('diaria', LUNES);
    expect(dia.enviados).toBeGreaterThanOrEqual(1);
    const despues = await bd.consulta(
      "SELECT c.asunto FROM correo_enviado c JOIN usuario u USING (id_usuario) WHERE u.email = $1 AND c.tipo = 'favorito_dia'",
      [estudiante.email]
    );
    expect(despues.map((c) => c.asunto)).toEqual(['Hoy hay Flan de caramelo, tu favorito']);
  });

  test('el enlace del correo da de baja y el perfil lo refleja', async ({ page, api, estudiante }) => {
    await api.pedir('PUT', '/estudiante/correos', { menu_semanal: true, avisos_favoritos: true }, estudiante.token);
    const [{ token }] = await bd.consulta(
      'SELECT token_baja::text AS token FROM preferencia_correo pc JOIN usuario u USING (id_usuario) WHERE u.email = $1',
      [estudiante.email]
    );
    await page.goto(`${URL_API}/correos/baja?token=${token}`);
    await expect(page.getByRole('heading', { name: 'Listo, ya no recibirás correos' })).toBeVisible();
    await page.goto('/');
    const perfil = await abrirPerfil(page);
    await expect(perfil.getByRole('checkbox', { name: /Menú de la semana/ })).not.toBeChecked();
    await expect(perfil.getByRole('checkbox', { name: /Avisos de mis favoritos/ })).not.toBeChecked();
  });
});
