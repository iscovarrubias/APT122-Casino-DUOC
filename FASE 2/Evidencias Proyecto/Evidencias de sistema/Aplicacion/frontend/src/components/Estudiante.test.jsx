import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../utils/useEstudiante', () => ({ useEstudiante: vi.fn() }));
vi.mock('../api/cliente', () => ({ pedir: vi.fn() }));
vi.mock('../api/gestion', () => ({ consultarOpinionesDePlato: vi.fn() }));
vi.mock('../ruteo/useRuta', () => ({ navegar: vi.fn() }));

import { useEstudiante } from '../utils/useEstudiante';
import { pedir } from '../api/cliente';
import { consultarOpinionesDePlato } from '../api/gestion';
import { navegar } from '../ruteo/useRuta';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import PerfilEstudianteModal from './PerfilEstudianteModal';
import Opinion from './Opinion';
import OpinionModal from './OpinionModal';
import BotonFavorito from './BotonFavorito';
import AvisoAlergias from './AvisoAlergias';
import ErrorBoundary from './ErrorBoundary';
import Ayuda from './Ayuda';

const estudiante = (extra = {}) => ({
  usuario: { rol: 'Estudiante', nombre: 'Ana' },
  alergias: [],
  favoritos: [],
  calificaciones: [],
  categoriaPreferida: null,
  calificacionDe: () => null,
  guardarCalificacion: vi.fn(async () => {}),
  quitarCalificacion: vi.fn(async () => {}),
  marcarFavorito: vi.fn(async () => {}),
  quitarFavorito: vi.fn(async () => {}),
  guardarCategoriaPreferida: vi.fn(async () => {}),
  ...extra,
});

describe('PerfilEstudianteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pedir.mockImplementation(async (ruta) =>
      ruta === '/api/preparaciones/alergenos'
        ? [
            { id_alergeno: 1, nombre: 'Gluten' },
            { id_alergeno: 2, nombre: 'Lácteos' },
          ]
        : {}
    );
  });

  it('guarda alergias y categoría preferida y avisa al resto de la página', async () => {
    const ctx = estudiante({ alergias: ['Gluten'], categoriaPreferida: 'General' });
    useEstudiante.mockReturnValue(ctx);
    const aviso = vi.fn();
    window.addEventListener('estudiante-perfil-actualizado', aviso);
    const usuario = userEvent.setup();
    render(<PerfilEstudianteModal onCerrar={() => {}} />);
    const gluten = await screen.findByRole('button', { name: 'Gluten' });
    expect(gluten).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(gluten);
    await usuario.click(screen.getByRole('button', { name: 'Lácteos' }));
    await usuario.click(screen.getByRole('button', { name: 'Vegetariano' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(pedir).toHaveBeenCalledWith('/api/estudiante/alergias', { metodo: 'PUT', cuerpo: { alergenos: ['Lácteos'] } })
    );
    expect(ctx.guardarCategoriaPreferida).toHaveBeenCalledWith('Vegetariano');
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(aviso).toHaveBeenCalled();
    window.removeEventListener('estudiante-perfil-actualizado', aviso);
  });

  it('carga y guarda las preferencias de avisos por correo', async () => {
    useEstudiante.mockReturnValue(estudiante({ favoritos: [{ id_preparacion: 1, nombre: 'Pastel de choclo' }] }));
    pedir.mockImplementation(async (ruta) => {
      if (ruta === '/api/preparaciones/alergenos') return [];
      if (ruta === '/api/estudiante/correos') return { menu_semanal: true, avisos_favoritos: false };
      return {};
    });
    render(<PerfilEstudianteModal onCerrar={() => {}} />);
    const menu = await screen.findByRole('checkbox', { name: /Menú de la semana/ });
    await waitFor(() => expect(menu).toBeChecked());
    const favoritos = screen.getByRole('checkbox', { name: /Avisos de mis favoritos/ });
    expect(favoritos).not.toBeChecked();
    expect(screen.queryByText(/recibirás un solo correo/)).not.toBeInTheDocument();
    await userEvent.click(favoritos);
    expect(screen.getByText(/recibirás un solo correo: el menú semanal con tus favoritos destacados/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(pedir).toHaveBeenCalledWith('/api/estudiante/correos', {
        metodo: 'PUT',
        cuerpo: { menu_semanal: true, avisos_favoritos: true },
      })
    );
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
  });

  it('activar avisos de favoritos sin favoritos sugiere marcar alguno', async () => {
    useEstudiante.mockReturnValue(estudiante());
    render(<PerfilEstudianteModal onCerrar={() => {}} />);
    await userEvent.click(await screen.findByRole('checkbox', { name: /Avisos de mis favoritos/ }));
    expect(screen.getByText('Marca platos con el corazón para recibir sus avisos.')).toBeInTheDocument();
  });

  it('tocar de nuevo la categoría preferida la quita', async () => {
    const ctx = estudiante({ categoriaPreferida: 'JUNAEB' });
    useEstudiante.mockReturnValue(ctx);
    const usuario = userEvent.setup();
    render(<PerfilEstudianteModal onCerrar={() => {}} />);
    await usuario.click(await screen.findByRole('button', { name: 'JUNAEB' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(ctx.guardarCategoriaPreferida).toHaveBeenCalledWith(null));
  });

  it('si algo falla al guardar muestra el motivo', async () => {
    useEstudiante.mockReturnValue(
      estudiante({
        guardarCategoriaPreferida: vi.fn(async () => {
          throw new Error('Sin conexión');
        }),
      })
    );
    const usuario = userEvent.setup();
    render(<PerfilEstudianteModal onCerrar={() => {}} />);
    await usuario.click(await screen.findByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  });

  it('lista los favoritos y permite quitarlos', async () => {
    const ctx = estudiante({ favoritos: [{ id_preparacion: 7, nombre: 'Budín' }] });
    useEstudiante.mockReturnValue(ctx);
    const usuario = userEvent.setup();
    render(<PerfilEstudianteModal onCerrar={() => {}} />);
    await usuario.click(await screen.findByRole('button', { name: 'Quitar' }));
    expect(ctx.quitarFavorito).toHaveBeenCalledWith(7);
  });

  it('sin conexión no muestra el botón de guardar', async () => {
    pedir.mockRejectedValue(new Error('offline'));
    useEstudiante.mockReturnValue(estudiante());
    render(<PerfilEstudianteModal onCerrar={() => {}} />);
    expect(await screen.findByText(/Revisa tu conexión a internet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });
});

describe('Opinion: calificar un plato', () => {
  const ITEM = { id_preparacion: 7, nombre: 'Budín', categoria: 'Vegetariano', calificacion_promedio: 4.25, calificaciones_total: 4 };
  const montar = (item = ITEM) =>
    render(
      <ConfirmacionProvider>
        <Opinion item={item} />
      </ConfirmacionProvider>
    );
  beforeEach(() => vi.clearAllMocks());

  it('muestra el promedio y la cantidad de votos', () => {
    useEstudiante.mockReturnValue(estudiante());
    montar();
    expect(screen.getByText('4.3 - 4 votos')).toBeInTheDocument();
  });

  it('sin votos lo dice', () => {
    useEstudiante.mockReturnValue(estudiante());
    montar({ ...ITEM, calificacion_promedio: null, calificaciones_total: 0 });
    expect(screen.getByText('Todavía sin calificaciones')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver opiniones' })).not.toBeInTheDocument();
  });

  it('sin sesión invita a iniciar sesión', async () => {
    useEstudiante.mockReturnValue(estudiante({ usuario: null }));
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Inicia sesión para dejar tu opinión' }));
    expect(navegar).toHaveBeenCalledWith('/login');
  });

  it('exige al menos una estrella y luego guarda con la categoría del menú', async () => {
    const ctx = estudiante();
    useEstudiante.mockReturnValue(ctx);
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole('button', { name: 'Calificar' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('Elige al menos una estrella.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: '4 estrellas' }));
    await usuario.type(screen.getByRole('textbox'), '  Muy rico  ');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(ctx.guardarCalificacion).toHaveBeenCalledWith(7, 4, 'Muy rico', 'Vegetariano'));
  });

  it('con una calificación previa permite editarla o borrarla con confirmación', async () => {
    const ctx = estudiante({ calificacionDe: () => ({ estrellas: 5, comentario: 'Excelente' }) });
    useEstudiante.mockReturnValue(ctx);
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole('button', { name: 'Editar mi calificación' }));
    expect(screen.getByRole('textbox')).toHaveValue('Excelente');
    expect(screen.getByRole('button', { name: '5 estrellas' })).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(screen.getByRole('button', { name: 'Borrar' }));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(ctx.quitarCalificacion).toHaveBeenCalledWith(7));
  });

  it('ver opiniones abre la lista pública del plato', async () => {
    useEstudiante.mockReturnValue(estudiante());
    consultarOpinionesDePlato.mockResolvedValue({ opiniones: [] });
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole('button', { name: 'Ver opiniones' }));
    expect(screen.getByRole('dialog', { name: 'Opiniones de Budín' })).toBeInTheDocument();
  });
});

describe('OpinionModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('promedia las opiniones con texto y las lista', async () => {
    consultarOpinionesDePlato.mockResolvedValue({
      opiniones: [
        { id_calificacion: 1, autor: 'Ana P.', estrellas: 5, comentario: 'Rico', actualizado_en: '2026-11-16T13:00:00' },
        { id_calificacion: 2, autor: 'Beto R.', estrellas: 2, comentario: 'Frío', actualizado_en: '2026-11-17T13:00:00' },
      ],
    });
    render(<OpinionModal idPreparacion={7} nombrePlato="Budín" onCerrar={() => {}} />);
    expect(await screen.findByText('3.5')).toBeInTheDocument();
    expect(screen.getByText('- 2 opiniones con texto')).toBeInTheDocument();
    expect(screen.getByText('Frío')).toBeInTheDocument();
  });

  it('sin comentarios explica que las calificaciones igual cuentan', async () => {
    consultarOpinionesDePlato.mockResolvedValue({ opiniones: [] });
    render(<OpinionModal idPreparacion={7} nombrePlato="Budín" onCerrar={() => {}} />);
    expect(await screen.findByText(/Todavía no hay comentarios con texto/)).toBeInTheDocument();
  });

  it('si no carga muestra el error', async () => {
    consultarOpinionesDePlato.mockRejectedValue(Object.assign(new Error('caído'), { estado: 500 }));
    render(<OpinionModal idPreparacion={7} nombrePlato="Budín" onCerrar={() => {}} />);
    expect(await screen.findByRole('button', { name: /Reintentar|Intentar/i })).toBeInTheDocument();
  });
});

describe('BotonFavorito y AvisoAlergias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('el corazón solo aparece para estudiantes', () => {
    useEstudiante.mockReturnValue(estudiante({ usuario: { rol: 'Administrador' } }));
    const { container } = render(<BotonFavorito idPreparacion={7} nombre="Budín" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marca y quita favoritos', async () => {
    const ctx = estudiante();
    useEstudiante.mockReturnValue(ctx);
    const { rerender } = render(<BotonFavorito idPreparacion={7} nombre="Budín" />);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar Budín como favorito' }));
    expect(ctx.marcarFavorito).toHaveBeenCalledWith(7);
    useEstudiante.mockReturnValue({ ...ctx, favoritos: [{ id_preparacion: 7 }] });
    rerender(<BotonFavorito idPreparacion={7} nombre="Budín" />);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar Budín de favoritos' }));
    expect(ctx.quitarFavorito).toHaveBeenCalledWith(7);
  });

  it('un error al marcar no rompe la tarjeta', async () => {
    useEstudiante.mockReturnValue(
      estudiante({
        marcarFavorito: vi.fn(async () => {
          throw new Error('x');
        }),
      })
    );
    render(<BotonFavorito idPreparacion={7} nombre="Budín" />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('avisa los alérgenos del menú que coinciden con el perfil, sin repetir', () => {
    useEstudiante.mockReturnValue(estudiante({ alergias: ['Gluten', 'Huevo'] }));
    render(<AvisoAlergias componentes={[{ alergenos: ['Gluten', 'Lácteos'] }, { alergenos: ['Gluten', 'Huevo'] }]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Contiene alérgenos que registraste: Gluten, Huevo');
  });

  it('no avisa si no hay coincidencias o si el perfil no tiene alergias', () => {
    useEstudiante.mockReturnValue(estudiante({ alergias: ['Maní'] }));
    const { container, rerender } = render(<AvisoAlergias componentes={[{ alergenos: ['Gluten'] }]} />);
    expect(container).toBeEmptyDOMElement();
    useEstudiante.mockReturnValue(estudiante({ alergias: [] }));
    rerender(<AvisoAlergias componentes={[{ alergenos: ['Gluten'] }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ErrorBoundary y Ayuda', () => {
  it('si un componente explota muestra una página de error sin detalles técnicos en vez de la pantalla en blanco', () => {
    const original = console.error;
    console.error = () => {};
    const Roto = () => {
      throw new Error('se cayó la tarjeta');
    };
    render(
      <ErrorBoundary>
        <Roto />
      </ErrorBoundary>
    );
    console.error = original;
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.queryByText(/se cayó la tarjeta/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar|Intentar|Recargar/i })).toBeInTheDocument();
  });

  it('sin errores muestra el contenido normal', () => {
    render(
      <ErrorBoundary>
        <p>todo bien</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('todo bien')).toBeInTheDocument();
  });

  it('la ayuda se abre con el teclado y se cierra con Escape', async () => {
    const usuario = userEvent.setup();
    render(<Ayuda titulo="Consumo">Lo vendido frente a lo planificado.</Ayuda>);
    await usuario.tab();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Lo vendido frente a lo planificado.');
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
