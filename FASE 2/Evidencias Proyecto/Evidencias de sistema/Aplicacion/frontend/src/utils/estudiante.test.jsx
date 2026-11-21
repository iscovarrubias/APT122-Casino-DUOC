import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';

vi.mock('../api/cliente', () => ({ pedir: vi.fn() }));
vi.mock('../context/auth-context', () => ({ useAuth: vi.fn() }));

import { pedir } from '../api/cliente';
import { useAuth } from '../context/auth-context';
import { EstudianteProvider } from './estudiante';
import { useEstudiante } from './useEstudiante';
import { infoError, ERRORES } from './errores';

const PERFIL = {
  alergias: ['Gluten'],
  categoria_preferida: 'Vegetariano',
  favoritos: [{ id_preparacion: 7, nombre: 'Budín' }],
  calificaciones: [{ id_preparacion: 7, estrellas: 5, comentario: 'Rico' }],
};

const espia = { ctx: null };
function Espia() {
  const c = useEstudiante();
  useEffect(() => {
    espia.ctx = c;
  });
  return <p>{`alergias:${c.alergias.join(',')} favoritos:${c.favoritos.length} preferida:${c.categoriaPreferida ?? '-'}`}</p>;
}
const montar = () =>
  render(
    <EstudianteProvider>
      <Espia />
    </EstudianteProvider>
  );

describe('EstudianteProvider: perfil del estudiante', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pedir.mockImplementation(async (ruta) => (ruta === '/api/estudiante/perfil' ? PERFIL : {}));
  });

  it('para un estudiante carga alergias, favoritos y categoría preferida', async () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Estudiante' } });
    montar();
    expect(await screen.findByText('alergias:Gluten favoritos:1 preferida:Vegetariano')).toBeInTheDocument();
    expect(espia.ctx.calificacionDe(7)).toMatchObject({ estrellas: 5 });
    expect(espia.ctx.calificacionDe(99)).toBe(null);
  });

  it('para el personal o sin sesión no consulta el perfil', async () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Administrador' } });
    montar();
    await screen.findByText(/alergias: favoritos:0/);
    expect(pedir).not.toHaveBeenCalled();
  });

  it('si el perfil no carga queda vacío sin romper el menú', async () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Estudiante' } });
    pedir.mockRejectedValue(new Error('caído'));
    montar();
    expect(await screen.findByText(/alergias: favoritos:0/)).toBeInTheDocument();
  });

  it('cada acción llama a su ruta y vuelve a cargar el perfil', async () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Estudiante' } });
    montar();
    await screen.findByText(/Gluten/);
    await act(() => espia.ctx.guardarCalificacion(7, 4, 'Bien', 'General'));
    await act(() => espia.ctx.quitarCalificacion(7));
    await act(() => espia.ctx.marcarFavorito(8));
    await act(() => espia.ctx.quitarFavorito(8));
    await act(() => espia.ctx.guardarCategoriaPreferida('JUNAEB'));
    const llamadas = pedir.mock.calls.filter(([ruta]) => ruta !== '/api/estudiante/perfil');
    expect(llamadas).toEqual([
      ['/api/estudiante/calificaciones/7', { metodo: 'PUT', cuerpo: { estrellas: 4, comentario: 'Bien', categoria: 'General' } }],
      ['/api/estudiante/calificaciones/7', { metodo: 'DELETE' }],
      ['/api/estudiante/favoritos/8', { metodo: 'PUT' }],
      ['/api/estudiante/favoritos/8', { metodo: 'DELETE' }],
      ['/api/estudiante/categoria-preferida', { metodo: 'PUT', cuerpo: { categoria: 'JUNAEB' } }],
    ]);
    expect(pedir.mock.calls.filter(([ruta]) => ruta === '/api/estudiante/perfil')).toHaveLength(6);
  });

  it('se recarga cuando otra parte de la página avisa que el perfil cambió', async () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Estudiante' } });
    montar();
    await screen.findByText(/Gluten/);
    act(() => {
      window.dispatchEvent(new Event('estudiante-perfil-actualizado'));
    });
    await waitFor(() => expect(pedir.mock.calls.filter(([r]) => r === '/api/estudiante/perfil')).toHaveLength(2));
  });

  it('fuera del proveedor useEstudiante entrega valores vacíos seguros', () => {
    render(<Espia />);
    expect(screen.getByText('alergias: favoritos:0 preferida:-')).toBeInTheDocument();
    expect(espia.ctx.calificacionDe(1)).toBe(null);
    expect(() => espia.ctx.marcarFavorito(1)).not.toThrow();
  });
});

describe('Mensajes de error para cada código', () => {
  it('todos los errores conocidos tienen título, mensaje e ícono', () => {
    for (const [codigo, info] of Object.entries(ERRORES)) {
      expect(info.titulo, codigo).toBeTruthy();
      expect(info.mensaje, codigo).toBeTruthy();
      expect(info.icono, codigo).toBeTruthy();
    }
  });

  it('sin conexión y errores del servidor permiten reintentar, los de permisos no', () => {
    expect(infoError(0).reintentar).toBe(true);
    expect(infoError(500).reintentar).toBe(true);
    expect(infoError(403).reintentar).toBe(false);
    expect(infoError(401).accion).toBe('login');
  });

  it('un código desconocido cae en un mensaje genérico según su familia', () => {
    expect(infoError(418).titulo).toBeTruthy();
    expect(infoError(503).tipo).toBe('servidor');
    expect(infoError(null).titulo).toBeTruthy();
    expect(infoError('404').titulo).toBe(ERRORES[404].titulo);
  });
});
