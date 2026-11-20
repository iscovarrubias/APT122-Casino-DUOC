const test = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, prepararJornadaHoy, limpiarHoy, percentil, enParalelo, pool, ADMIN } = require('../soporte/servidor');

const LIMITE_P95_MS = Number(process.env.RENDIMIENTO_P95_MS) || 2000;
const informe = [];

let s;
let admin;
let cajeros;

test.before(async () => {
  s = await arrancar();
  admin = await s.entrar(ADMIN.email, ADMIN.password);
  cajeros = [await s.crearUsuario(admin, 'Cajero', 'caja1'), await s.crearUsuario(admin, 'Cajero', 'caja2')];
  await prepararJornadaHoy(s.api, admin, { porciones: 400 });
});

test.after(async () => {
  if (informe.length) {
    console.log('\nRendimiento medido (ms)');
    console.table(informe);
  }
  await limpiarHoy();
  await s.cerrar();
  await pool.end();
});

function registrar(escenario, tiempos, errores) {
  const fila = {
    escenario,
    solicitudes: tiempos.length,
    errores,
    p50: Math.round(percentil(tiempos, 50)),
    p95: Math.round(percentil(tiempos, 95)),
    max: Math.round(Math.max(...tiempos)),
  };
  informe.push(fila);
  return fila;
}

const restanteDe = (hoy, componente, categoria = null) => hoy.componentes
  .find((c) => c.componente === componente && (c.categoria || null) === categoria).restante;

test('REN-01 hora punta: 400 consultas al menú público con 80 estudiantes a la vez', async () => {
  const resultados = await enParalelo(400, 80, () => s.api('GET', '/menu/hoy'));
  const errores = resultados.filter((r) => r.s !== 200).length;
  const fila = registrar('Menú público, 80 simultáneos', resultados.map((r) => r.ms), errores);
  assert.equal(errores, 0);
  assert.ok(fila.p95 < LIMITE_P95_MS, `p95 ${fila.p95} ms`);
  assert.ok(resultados.every((r) => r.d.preparaciones.length > 0));
});

test('REN-02 la caja vende a ritmo de fila mientras 60 estudiantes miran el menú, y el stock cuadra exacto', async () => {
  const antes = (await s.api('GET', '/jornada/hoy', undefined, admin)).d;
  const categorias = ['General', 'Vegetariano', 'Hipocalórico', 'JUNAEB'];
  const ventas = Array.from({ length: 120 }, (_, i) => {
    const categoria = categorias[i % categorias.length];
    return { categoria, ...(categoria === 'General' || categoria === 'Vegetariano' ? { opcion: i % 3 === 0 ? 'Fruta' : 'Postre' } : {}) };
  });

  const [respuestasVenta, lecturas] = await Promise.all([
    enParalelo(ventas.length, 12, (i) => s.api('POST', '/jornada/ventas', ventas[i], cajeros[i % 2].token)),
    enParalelo(300, 60, () => s.api('GET', '/menu/hoy')),
  ]);

  const fallidas = respuestasVenta.filter((r) => r.s !== 201 && r.s !== 200);
  assert.equal(fallidas.length, 0, fallidas.map((r) => r.texto).join(' | '));
  assert.equal(lecturas.filter((r) => r.s !== 200).length, 0);

  const filaVentas = registrar('Ventas en caja, 12 simultáneas', respuestasVenta.map((r) => r.ms), fallidas.length);
  const filaLecturas = registrar('Menú público durante las ventas', lecturas.map((r) => r.ms), 0);
  assert.ok(filaVentas.p95 < LIMITE_P95_MS, `ventas p95 ${filaVentas.p95} ms`);
  assert.ok(filaLecturas.p95 < LIMITE_P95_MS, `lecturas p95 ${filaLecturas.p95} ms`);

  const { rows: composicion } = await pool.query(
    `SELECT c.nombre AS categoria, t.nombre AS tipo, cc.grupo_opcion
     FROM composicion_combo cc
     JOIN categoria_menu c ON c.id_categoria_menu = cc.id_categoria_menu
     JOIN tipo_componente t ON t.id_tipo_componente = cc.id_tipo_componente`
  );
  const esperado = new Map();
  const sumar = (clave) => esperado.set(clave, (esperado.get(clave) || 0) + 1);
  for (const v of ventas) {
    sumar(`Plato Principal|${v.categoria}`);
    for (const fila of composicion.filter((f) => f.categoria === v.categoria)) {
      if (fila.grupo_opcion === null || fila.tipo === v.opcion) sumar(`${fila.tipo}|`);
    }
  }

  const despues = (await s.api('GET', '/jornada/hoy', undefined, admin)).d;
  for (const comp of despues.componentes) {
    const clave = `${comp.componente}|${comp.componente === 'Plato Principal' ? comp.categoria : ''}`;
    const previo = antes.componentes.find((c) => c.id_menu_preparacion === comp.id_menu_preparacion).restante;
    assert.equal(comp.restante, previo - (esperado.get(clave) || 0), `stock de ${clave}`);
  }

  const vendidasHoy = despues.componentes.find((c) => c.componente === 'Plato Principal' && c.categoria === 'General').vendidas;
  assert.equal(vendidasHoy, ventas.filter((v) => v.categoria === 'General').length + (antes.componentes.find((c) => c.componente === 'Plato Principal' && c.categoria === 'General').vendidas));
});

test('REN-03 anular ventas en paralelo nunca devuelve stock dos veces', async () => {
  const antes = (await s.api('GET', '/jornada/hoy', undefined, admin)).d;
  const venta = await s.api('POST', '/jornada/ventas', { categoria: 'Hipocalórico' }, cajeros[0].token);
  assert.ok(venta.s < 300, venta.texto);
  const idVenta = venta.d.id_venta_combo;

  const intentos = await Promise.all(Array.from({ length: 10 }, () => s.api('POST', `/jornada/ventas/${idVenta}/anular`, {}, cajeros[1].token)));
  assert.equal(intentos.filter((r) => r.s < 300).length, 1, intentos.map((r) => r.s).join(','));

  const despues = (await s.api('GET', '/jornada/hoy', undefined, admin)).d;
  assert.equal(restanteDe(despues, 'Plato Principal', 'Hipocalórico'), restanteDe(antes, 'Plato Principal', 'Hipocalórico'));
});

test('REN-04 en el agotamiento con dos cajas a la vez, cada venta aceptada queda registrada y el público ve agotado', async () => {
  const hoy = (await s.api('GET', '/jornada/hoy', undefined, admin)).d;
  const comp = hoy.componentes.find((c) => c.componente === 'Plato Principal' && c.categoria === 'JUNAEB');
  const ajuste = await s.api('POST', `/jornada/componentes/${comp.id_menu_preparacion}/stock`, { accion: 'quedan', cantidad: 3 }, admin);
  assert.equal(ajuste.d.restante, 3);

  const respuestas = await Promise.all(Array.from({ length: 8 }, (_, i) => s.api('POST', '/jornada/ventas', { categoria: 'JUNAEB' }, cajeros[i % 2].token)));
  const aceptadas = respuestas.filter((r) => r.s === 201);
  assert.equal(aceptadas.length, 8);
  assert.equal(new Set(aceptadas.map((r) => r.d.id_venta_combo)).size, 8);

  const despues = (await s.api('GET', '/jornada/hoy', undefined, admin)).d;
  assert.equal(despues.componentes.find((c) => c.id_menu_preparacion === comp.id_menu_preparacion).restante, 3 - 8);

  const publico = (await s.api('GET', '/menu/hoy')).d.preparaciones.find((p) => p.id_menu_preparacion === comp.id_menu_preparacion);
  assert.equal(publico.disponibilidad, 'agotado');
  assert.ok(publico.cantidad_restante <= 0);
});

test('REN-05 50 personas del personal inician sesión en el mismo instante', async () => {
  const cuentas = await Promise.all(Array.from({ length: 5 }, (_, i) => s.crearUsuario(admin, 'Cajero', `masivo${i}`)));
  const resultados = await Promise.all(Array.from({ length: 50 }, (_, i) => s.api('POST', '/auth/login', { email: cuentas[i % 5].email, password: 'Test1234' })));
  const errores = resultados.filter((r) => r.s !== 200).length;
  const fila = registrar('Inicio de sesión, 50 a la vez', resultados.map((r) => r.ms), errores);
  assert.equal(errores, 0);
  assert.ok(fila.p95 < LIMITE_P95_MS * 2, `p95 ${fila.p95} ms`);
});

test('REN-06 tiempo real: 300 pantallas conectadas reciben el aviso de una venta en menos de 2 segundos', async () => {
  const conexiones = await Promise.all(Array.from({ length: 300 }, async () => {
    const control = new AbortController();
    const r = await fetch(`${s.base}/menu/eventos`, { signal: control.signal });
    assert.equal(r.status, 200);
    const lector = r.body.getReader();
    const decodificador = new TextDecoder();
    let buffer = '';
    const aviso = (async () => {
      while (true) {
        const { value, done } = await lector.read();
        if (done) return null;
        buffer += decodificador.decode(value, { stream: true });
        if (buffer.includes('event: cambio')) return performance.now();
      }
    })().catch(() => null);
    return { control, aviso };
  }));

  await new Promise((r) => setTimeout(r, 200));
  const inicio = performance.now();
  const venta = await s.api('POST', '/jornada/ventas', { categoria: 'General', opcion: 'Postre' }, cajeros[0].token);
  assert.ok(venta.s < 300, venta.texto);

  const llegadas = await Promise.all(conexiones.map(({ aviso }) => Promise.race([aviso, new Promise((r) => setTimeout(() => r(null), 3000))])));
  conexiones.forEach(({ control }) => control.abort());

  const recibidas = llegadas.filter(Boolean).map((t) => t - inicio);
  const fila = registrar('Aviso SSE a 300 pantallas', recibidas, 300 - recibidas.length);
  assert.equal(recibidas.length, 300, `${300 - recibidas.length} pantallas no recibieron el aviso`);
  assert.ok(fila.max < 2000, `el último aviso tardó ${fila.max} ms`);
});

test('REN-07 la caché evita consultar la base en cada visita al menú', async () => {
  let consultas = 0;
  const original = pool.query.bind(pool);
  pool.query = (...args) => {
    if (typeof args[0] === 'string' && /FROM\s+menu\b/i.test(args[0])) consultas += 1;
    return original(...args);
  };
  try {
    await s.api('GET', '/menu/hoy');
    consultas = 0;
    await Promise.all(Array.from({ length: 100 }, () => s.api('GET', '/menu/hoy')));
  } finally {
    pool.query = original;
  }
  assert.ok(consultas <= 5, `100 visitas hicieron ${consultas} consultas al menú`);
});
