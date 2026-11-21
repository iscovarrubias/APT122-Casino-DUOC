import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/menu', () => ({
  obtenerMenuHoy: vi.fn(),
  obtenerHistorialMenu: vi.fn(),
  obtenerPrediccionPublica: vi.fn(() => Promise.resolve({ categorias: [] })),
}));
vi.mock('../utils/eventos', () => ({ suscribirCambios: () => () => {} }));
vi.mock('../components/Sidebar', () => ({
  default: ({ vistaActiva, onCambiarVista }) => (
    <nav aria-label="lateral" data-activa={String(vistaActiva)}>
      <button type="button" onClick={() => onCambiarVista('preguntas')}>
        Ir a preguntas
      </button>
    </nav>
  ),
}));
vi.mock('../ruteo/useRuta', () => ({ navegar: vi.fn() }));
vi.mock('../components/PerfilEstudianteModal', () => ({ default: () => null }));

import { obtenerMenuHoy, obtenerHistorialMenu, obtenerPrediccionPublica } from '../api/menu';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import VistaPublica from './VistaPublica';
import { navegar } from '../ruteo/useRuta';

const montar = () =>
  render(
    <ConfirmacionProvider>
      <VistaPublica />
    </ConfirmacionProvider>
  );

const plato = (extra) => ({
  id_menu_preparacion: 1,
  id_preparacion: 1,
  nombre: 'Charquicán con huevo',
  componente: 'Plato Principal',
  categoria: 'General',
  precio: 4800,
  disponibilidad: 'disponible',
  ingredientes: [],
  alergenos: [],
  informacion_nutricional: null,
  ...extra,
});

describe('VistaPublica - avisos de la jornada', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    obtenerHistorialMenu.mockResolvedValue({ menus: [], composicion: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('el fin de semana sin menú invita a revisar el menú semanal', async () => {
    vi.setSystemTime(new Date('2026-11-21T10:00:00-03:00'));
    obtenerMenuHoy.mockResolvedValue({ fecha: '2026-11-21', preparaciones: [], composicion: {} });
    montar();
    expect(await screen.findByText('Los fines de semana no hay menú disponible')).toBeInTheDocument();
    expect(screen.queryByText(/Todavía no hay un menú publicado/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver menú semanal' }));
    expect(obtenerHistorialMenu).toHaveBeenCalled();
  });

  it('un día hábil sin menú mantiene el mensaje de siempre', async () => {
    vi.setSystemTime(new Date('2026-11-23T10:00:00-03:00'));
    obtenerMenuHoy.mockResolvedValue({ fecha: '2026-11-23', preparaciones: [], composicion: {} });
    montar();
    expect(await screen.findByText(/Todavía no hay un menú publicado/)).toBeInTheDocument();
    expect(screen.queryByText('Los fines de semana no hay menú disponible')).not.toBeInTheDocument();
  });

  it('con la jornada cerrada avisa que terminó y sigue mostrando el menú', async () => {
    vi.setSystemTime(new Date('2026-11-23T16:00:00-03:00'));
    obtenerMenuHoy.mockResolvedValue({
      fecha: '2026-11-23',
      composicion: {},
      preparaciones: [plato({ jornada_estado: 'cerrada', cantidad_restante: 3 })],
    });
    montar();
    expect(await screen.findByText('La jornada de almuerzos de hoy ya cerró')).toBeInTheDocument();
    expect(screen.getByText('Charquicán con huevo')).toBeInTheDocument();
  });

  it('con la jornada abierta muestra el reloj con la hora estimada de agotamiento', async () => {
    vi.setSystemTime(new Date('2026-11-23T12:30:00-03:00'));
    obtenerPrediccionPublica.mockResolvedValueOnce({ categorias: [{ categoria: 'General', estado: 'se_agota', hora: '13:20' }] });
    obtenerMenuHoy.mockResolvedValue({
      fecha: '2026-11-23',
      composicion: {},
      preparaciones: [plato({ jornada_estado: 'abierta', cantidad_restante: 12 })],
    });
    montar();
    const reloj = await screen.findByRole('button', { name: 'Hora estimada de agotamiento del menú General' });
    reloj.focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Se agotaría cerca de las 13:20');
  });

  it('si la estimación falla, el menú se muestra igual sin el reloj', async () => {
    vi.setSystemTime(new Date('2026-11-23T12:30:00-03:00'));
    obtenerPrediccionPublica.mockRejectedValueOnce(new Error('sin red'));
    obtenerMenuHoy.mockResolvedValue({
      fecha: '2026-11-23',
      composicion: {},
      preparaciones: [plato({ jornada_estado: 'abierta', cantidad_restante: 12 })],
    });
    montar();
    expect(await screen.findByText('Charquicán con huevo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hora estimada de agotamiento/ })).not.toBeInTheDocument();
  });

  it('con la jornada cerrada no muestra la estimación', async () => {
    vi.setSystemTime(new Date('2026-11-23T16:00:00-03:00'));
    obtenerPrediccionPublica.mockResolvedValueOnce({ categorias: [{ categoria: 'General', estado: 'se_agota', hora: '13:20' }] });
    obtenerMenuHoy.mockResolvedValue({
      fecha: '2026-11-23',
      composicion: {},
      preparaciones: [plato({ jornada_estado: 'cerrada', cantidad_restante: 3 })],
    });
    montar();
    expect(await screen.findByText('Charquicán con huevo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hora estimada de agotamiento/ })).not.toBeInTheDocument();
  });

  it('antes de iniciar la jornada no muestra el aviso de cierre', async () => {
    vi.setSystemTime(new Date('2026-11-23T09:00:00-03:00'));
    obtenerMenuHoy.mockResolvedValue({
      fecha: '2026-11-23',
      composicion: {},
      preparaciones: [plato({ jornada_estado: null, cantidad_restante: null })],
    });
    montar();
    expect(await screen.findAllByText('Aún no inicia la jornada')).not.toHaveLength(0);
    expect(screen.queryByText('La jornada de almuerzos de hoy ya cerró')).not.toBeInTheDocument();
  });
});

describe('VistaPublica - documentos legales', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    obtenerMenuHoy.mockResolvedValue({ fecha: '2026-11-20', preparaciones: [], composicion: {} });
  });
  afterEach(() => vi.clearAllMocks());

  it('muestra el documento con su título y sin marcar ninguna sección del menú', () => {
    render(
      <ConfirmacionProvider>
        <VistaPublica legal="privacidad" />
      </ConfirmacionProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidad' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'lateral' })).toHaveAttribute('data-activa', 'null');
    expect(document.title).toBe('Política de Privacidad - Casinos DUOC UC');
    expect(obtenerMenuHoy).not.toHaveBeenCalled();
  });

  it('elegir una sección del menú lateral sale del documento y vuelve al inicio', async () => {
    render(
      <ConfirmacionProvider>
        <VistaPublica legal="terminos" />
      </ConfirmacionProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ir a preguntas' }));
    expect(navegar).toHaveBeenCalledWith('/');
  });
});
