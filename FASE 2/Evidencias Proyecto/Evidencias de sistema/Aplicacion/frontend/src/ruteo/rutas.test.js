import { describe, it, expect } from 'vitest';
import { PERMISOS, NAVEGACION, ROLES_PANEL, rutaInicial } from './rutas';

describe('rutas y permisos del panel', () => {
  it('cada rol aterriza en su pantalla de trabajo', () => {
    expect(rutaInicial('Estudiante', false)).toBe('/');
    expect(rutaInicial('Cajero', false)).toBe('/panel/caja');
    expect(rutaInicial('Cajero', true)).toBe('/panel/caja');
    expect(rutaInicial('Personal Casino', true)).toBe('/panel/kiosco');
    expect(rutaInicial('Administrador', false)).toBe('/panel/menu');
    expect(rutaInicial('Nutricionista', false)).toBe('/panel/menu');
  });

  it('la ruta inicial de cada rol está dentro de sus permisos', () => {
    for (const rol of ROLES_PANEL) {
      const inicio = rutaInicial(rol, false);
      expect(PERMISOS[inicio], `${rol} -> ${inicio}`).toContain(rol);
    }
  });

  it('solo el administrador gestiona usuarios', () => {
    expect(PERMISOS['/panel/usuarios']).toEqual(['Administrador']);
  });

  it('ningún estudiante tiene permiso en el panel', () => {
    for (const roles of Object.values(PERMISOS)) expect(roles).not.toContain('Estudiante');
  });

  it('todas las entradas del menú lateral tienen permisos definidos', () => {
    for (const { ruta } of NAVEGACION) expect(PERMISOS[ruta], ruta).toBeDefined();
  });
});
