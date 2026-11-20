import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('./cliente', () => ({
  pedir: vi.fn(async () => ({})),
  pedirArchivo: vi.fn(async () => ({})),
  ErrorApi: class ErrorApi extends Error {},
}));

import { pedir, pedirArchivo } from './cliente';
import * as gestion from './gestion';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SRC_FRONT = path.resolve(aqui, '..');
const SRC_BACK = path.resolve(aqui, '../../../backend/src');

function leerRutasBackend() {
  const app = fs.readFileSync(path.join(SRC_BACK, 'app.js'), 'utf8');
  const archivos = Object.fromEntries([...app.matchAll(/const (\w+) = require\('\.\/routes\/([\w.]+)'\)/g)].map((m) => [m[1], m[2]]));
  const rutas = [];
  for (const [, prefijo, variable] of app.matchAll(/app\.use\('([^']+)',\s*(\w+)\)/g)) {
    if (!archivos[variable]) continue;
    const fuente = fs.readFileSync(path.join(SRC_BACK, 'routes', `${archivos[variable]}.js`), 'utf8');
    for (const [, metodo, ruta] of fuente.matchAll(/router\.(get|post|put|patch|delete)\('([^']+)'/g)) {
      const completa = `${prefijo}${ruta === '/' ? '' : ruta}`;
      rutas.push({ metodo: metodo.toUpperCase(), ruta: completa, patron: new RegExp(`^${completa.replace(/:[^/]+/g, '[^/]+')}$`) });
    }
  }
  return rutas;
}

let rutas;
beforeAll(() => { rutas = leerRutasBackend(); });

const existe = (metodo, url) => {
  const sinQuery = url.split('?')[0];
  return rutas.some((r) => (metodo === '*' || r.metodo === metodo) && r.patron.test(sinQuery));
};

const ARGUMENTOS = {
  iniciarSesionApi: ['a@duocuc.cl', 'x', false], actualizarIngrediente: [5, {}], eliminarIngrediente: [5],
  actualizarPreparacion: [5, {}], desactivarPreparacion: [5], reactivarPreparacion: [5], eliminarPreparacion: [5],
  asignarAlergenos: [5, []], guardarNutricion: [5, {}], consultarPlanificacion: ['2026-11-20'], actualizarComponente: [5, {}],
  quitarComponente: [5], publicarMenu: [5], despublicarMenu: [5], cambiarDisponibilidad: [5, 'agotado'],
  ajustarStock: [5, { accion: 'quedan', cantidad: 3 }], registrarVenta: ['General', 'Postre'], anularVenta: [5],
  listarUsuarios: ['ana', 'Cajero'], actualizarUsuario: [5, {}], cambiarClave: [5, 'Clave1234'],
  consultarAnalisis: ['2026-11-01', '2026-11-30'], consultarAnalisisDetalle: ['2026-11-01', '2026-11-30', { id_preparacion: 3, categoria: 'General' }],
  consultarOpinionesDetalle: [{ desde: '2026-11-01', con_comentario: true }], consultarMensual: ['2026-11'],
  consultarFavoritosDetalle: [{ desde: '2026-11-01' }], consultarMes: ['2026-11'], copiarMenus: [[], false],
  consultarSugerencias: ['2026-11-20'], identificarCorreo: ['a@duocuc.cl'], canjearTicketMicrosoft: ['t'],
  iniciarSesionDuoc: ['a@duocuc.cl'], actualizarCategoriaPreferida: ['General'], consultarOpinionesDePlato: [5],
};

describe('Contrato entre el frontend y el backend', () => {
  it('el backend expone las rutas que se leen desde su código', () => {
    expect(rutas.length).toBeGreaterThan(50);
    expect(existe('POST', '/api/jornada/ventas')).toBe(true);
    expect(existe('DELETE', '/api/jornada/ventas')).toBe(false);
  });

  it('cada función de api/gestion.js llama a una ruta y método que existen en el backend', async () => {
    const llamadas = [];
    for (const [nombre, funcion] of Object.entries(gestion)) {
      if (typeof funcion !== 'function') continue;
      pedir.mockClear();
      pedirArchivo.mockClear();
      const resultado = await funcion(...(ARGUMENTOS[nombre] || []));
      if (typeof resultado === 'string') {
        llamadas.push({ nombre, metodo: 'GET', url: new URL(resultado).pathname });
        continue;
      }
      const [ruta, opciones = {}] = pedir.mock.calls[0] || [];
      if (ruta) llamadas.push({ nombre, metodo: opciones.metodo || 'GET', url: ruta });
      const [rutaArchivo] = pedirArchivo.mock.calls[0] || [];
      if (rutaArchivo) llamadas.push({ nombre, metodo: 'POST', url: rutaArchivo });
    }
    expect(llamadas.length).toBeGreaterThanOrEqual(50);
    const huerfanas = llamadas.filter((l) => !existe(l.metodo, l.url)).map((l) => `${l.nombre}: ${l.metodo} ${l.url}`);
    expect(huerfanas).toEqual([]);
  });

  it('las rutas públicas no envían el token y las privadas sí', async () => {
    pedir.mockClear();
    await gestion.consultarOpinionesDePlato(5);
    await gestion.iniciarSesionApi('a@duocuc.cl', 'x', false);
    await gestion.listarUsuarios();
    expect(pedir.mock.calls[0][1].conToken).toBe(false);
    expect(pedir.mock.calls[1][1].conToken).toBe(false);
    expect(pedir.mock.calls[2][1]?.conToken).toBeUndefined();
  });

  it('las consultas arman bien sus parámetros', async () => {
    pedir.mockClear();
    await gestion.listarUsuarios('ana maría', 'Cajero');
    await gestion.listarUsuarios();
    await gestion.consultarOpinionesDetalle({ desde: '2026-11-01', estado: '', con_comentario: true, limite: 0 });
    await gestion.consultarMensual({ desde: '2026-11-01', hasta: '2026-11-30' });
    const urls = pedir.mock.calls.map((c) => c[0]);
    expect(urls[0]).toBe('/api/usuarios?q=ana+mar%C3%ADa&rol=Cajero');
    expect(urls[1]).toBe('/api/usuarios');
    expect(urls[2]).toBe('/api/opiniones/detalle?desde=2026-11-01&con_comentario=1&limite=0');
    expect(urls[3]).toBe('/api/analisis/mensual?desde=2026-11-01&hasta=2026-11-30');
  });

  it('ninguna ruta /api escrita en el código del frontend apunta a algo que no existe', () => {
    const encontradas = [];
    const recorrer = (dir) => {
      for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
        const ruta = path.join(dir, entrada.name);
        if (entrada.isDirectory()) recorrer(ruta);
        else if (/\.(js|jsx)$/.test(entrada.name) && !/\.test\./.test(entrada.name)) {
          const texto = fs.readFileSync(ruta, 'utf8');
          for (const [, url] of texto.matchAll(/[`'"](\/api\/[^`'"\s]*)[`'"]/g)) {
            encontradas.push({ archivo: path.relative(SRC_FRONT, ruta), url: url.replace(/\$\{[^}]+\}/g, 'X') });
          }
        }
      }
    };
    recorrer(SRC_FRONT);
    expect(encontradas.length).toBeGreaterThan(50);
    const rotas = encontradas
      .filter(({ url }) => !url.endsWith('/'))
      .filter(({ url }) => !existe('*', url))
      .map(({ archivo, url }) => `${archivo}: ${url}`);
    expect(rotas).toEqual([]);
  });
});
