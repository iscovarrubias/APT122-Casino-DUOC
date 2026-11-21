import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('../ruteo/useRuta', () => ({ navegar: vi.fn() }));

import { navegar } from '../ruteo/useRuta';
import DocumentoLegal from './DocumentoLegal';
import { URL_PRIVACIDAD_DUOC, ACTUALIZACION_LEGAL } from '../utils/legal';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function archivosFuente(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'pruebas' ? [] : archivosFuente(ruta);
    return /\.(js|jsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [ruta] : [];
  });
}

function clavesDelNavegador() {
  const claves = new Set();
  for (const archivo of archivosFuente(SRC)) {
    const texto = fs.readFileSync(archivo, 'utf8');
    const constantes = Object.fromEntries([...texto.matchAll(/const (\w+) = '([^']+)'/g)].map((m) => [m[1], m[2]]));
    for (const [, arg] of texto.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*([^,]+),/g)) {
      const literal = arg.trim().match(/^'([^']+)'$/);
      const valor = literal ? literal[1] : constantes[arg.trim()];
      if (valor) claves.add(valor);
    }
  }
  return [...claves];
}

describe('DocumentoLegal: Términos y Condiciones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra la fecha de actualización, el resumen y las diez secciones', () => {
    render(<DocumentoLegal tipo="terminos" />);
    expect(screen.getByText(`Última actualización: ${ACTUALIZACION_LEGAL}`)).toBeInTheDocument();
    expect(screen.getByText(/En corto: la plataforma te informa del menú/)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(10);
  });

  it('advierte que los alérgenos son referenciales y que se confirme con el personal', () => {
    render(<DocumentoLegal tipo="terminos" />);
    const seccion = screen.getByRole('region', { name: '4. Alérgenos e información nutricional' });
    expect(within(seccion).getByText(/no reemplaza la consulta con el personal del casino/)).toBeInTheDocument();
  });

  it('explica qué ven otros estudiantes de una opinión y enlaza a la política de privacidad', async () => {
    render(<DocumentoLegal tipo="terminos" />);
    expect(screen.getByText(/verán tu nombre, la inicial de tu apellido/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Política de Privacidad' }));
    expect(navegar).toHaveBeenCalledWith('/privacidad');
  });

  it('las pestañas cambian de documento y el pie vuelve al menú', async () => {
    render(<DocumentoLegal tipo="terminos" />);
    expect(screen.getByRole('button', { name: 'Términos' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Privacidad' }));
    expect(navegar).toHaveBeenLastCalledWith('/privacidad');
    await userEvent.click(screen.getByRole('button', { name: 'Volver al menú' }));
    expect(navegar).toHaveBeenLastCalledWith('/');
  });
});

describe('DocumentoLegal: Política de Privacidad', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enlaza a la política oficial de Duoc UC en una pestaña nueva y segura', () => {
    render(<DocumentoLegal tipo="privacidad" />);
    const enlace = screen.getByRole('link', { name: /Política de Privacidad de Duoc UC/ });
    expect(enlace).toHaveAttribute('href', URL_PRIVACIDAD_DUOC);
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('cita la Ley 19.628 y la Ley 21.719 con sus principios', () => {
    render(<DocumentoLegal tipo="privacidad" />);
    const marco = screen.getByRole('region', { name: '2. Marco legal' });
    expect(within(marco).getByText(/Ley N° 19\.628/)).toBeInTheDocument();
    expect(within(marco).getByText(/Ley N° 21\.719/)).toBeInTheDocument();
    expect(within(marco).getByText(/proporcionalidad/)).toBeInTheDocument();
  });

  it('trata las alergias como dato sensible y voluntario', () => {
    render(<DocumentoLegal tipo="privacidad" />);
    const seccion = screen.getByRole('region', { name: '4. Alergias: un dato sensible' });
    expect(within(seccion).getByText(/datos relativos a la salud/)).toBeInTheDocument();
    expect(within(seccion).getByText(/son voluntarias/)).toBeInTheDocument();
  });

  it('explica que los avisos por correo son opcionales y se pueden desactivar con un clic', () => {
    render(<DocumentoLegal tipo="privacidad" />);
    const seccion = screen.getByRole('region', { name: '6.1 Avisos por correo' });
    expect(within(seccion).getByText(/vienen desactivados/)).toBeInTheDocument();
    expect(within(seccion).getByText(/un solo correo semanal/)).toBeInTheDocument();
    expect(within(seccion).getByText(/dejar de\s+recibirlos con un clic/)).toBeInTheDocument();
  });

  it('informa que las opiniones editadas o eliminadas se conservan para moderación', () => {
    render(<DocumentoLegal tipo="privacidad" />);
    expect(screen.getByText(/el casino conserva la versión anterior para moderar/)).toBeInTheDocument();
  });

  it('enumera los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo', () => {
    render(<DocumentoLegal tipo="privacidad" />);
    expect(screen.getByText(/acceso, rectificación, supresión, oposición, portabilidad y bloqueo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /repositorio del proyecto/ })).toHaveAttribute('href', expect.stringContaining('github.com'));
  });

  it('declara todo lo que la aplicación guarda en el navegador', () => {
    render(<DocumentoLegal tipo="privacidad" />);
    const tabla = screen.getByRole('table');
    const declaradas = within(tabla)
      .getAllByRole('row')
      .slice(1)
      .map((fila) => within(fila).getAllByRole('cell')[0].textContent);
    const usadas = clavesDelNavegador();
    expect(usadas.length).toBeGreaterThan(0);
    expect(declaradas.sort()).toEqual(usadas.sort());
  });
});
