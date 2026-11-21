import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({
  consultarJornadaHoy: vi.fn(),
  anularVenta: vi.fn(),
  consultarPrediccionHoy: vi.fn(),
  registrarVenta: vi.fn(),
  iniciarJornada: vi.fn(),
  cerrarJornada: vi.fn(),
  reabrirJornada: vi.fn(),
  corregirCierre: vi.fn(),
}));
vi.mock('../utils/eventos', () => ({ suscribirCambios: vi.fn(() => () => {}) }));

import * as api from '../api/gestion';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import CajaPage from './CajaPage';

const comp = (id, componente, categoria, preparacion, restante = 20) => ({
  id_menu_preparacion: id,
  componente,
  categoria,
  preparacion,
  restante,
  cantidad_planificada: 20,
  total_disponible: 20,
  vendidas: 20 - restante,
  disponibilidad: restante > 0 ? 'disponible' : 'agotado',
  precio: 3500,
});
const COMPONENTES = [
  comp(1, 'Plato Principal', 'General', 'Pollo arvejado'),
  comp(2, 'Plato Principal', 'JUNAEB', 'Arroz con pollo'),
  comp(3, 'Plato Principal', 'Vegetariano', 'Budín de zapallitos'),
  comp(4, 'Plato Principal', 'Hipocalórico', 'Pollo a la plancha'),
  comp(5, 'Postre', null, 'Flan'),
  comp(6, 'Fruta', null, 'Manzana'),
  comp(7, 'Bebida', null, 'Jugo'),
];
const COMPOSICION = {
  General: [
    { tipo: 'Postre', grupo_opcion: 1 },
    { tipo: 'Fruta', grupo_opcion: 1 },
    { tipo: 'Bebida', grupo_opcion: null },
  ],
  JUNAEB: [{ tipo: 'Bebida', grupo_opcion: null }],
  Vegetariano: [
    { tipo: 'Postre', grupo_opcion: 1 },
    { tipo: 'Fruta', grupo_opcion: 1 },
  ],
  Hipocalórico: [{ tipo: 'Fruta', grupo_opcion: null }],
};
const MENU = { id_menu: 1, publicado: true };
const ABIERTA = {
  menu: MENU,
  jornada: { estado: 'abierta', iniciada_en: '2026-11-20T12:00:00' },
  componentes: COMPONENTES,
  composicion: COMPOSICION,
  ventas_recientes: [],
  ventas_por_categoria: [],
};

const montar = () =>
  render(
    <ConfirmacionProvider>
      <CajaPage />
    </ConfirmacionProvider>
  );

describe('CajaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.consultarPrediccionHoy.mockResolvedValue({ categorias: [] });
    api.registrarVenta.mockResolvedValue({});
  });

  it('sin menú planificado avisa que hay que hablar con la cocina', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ menu: null, jornada: null, componentes: [] });
    montar();
    expect(await screen.findByText(/Todavía no hay un menú planificado/)).toBeInTheDocument();
  });

  it('con el menú sin publicar no deja iniciar la jornada', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ menu: { ...MENU, publicado: false }, jornada: null, componentes: COMPONENTES });
    montar();
    expect(await screen.findByText(/aún no está publicado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar jornada' })).not.toBeInTheDocument();
  });

  it('inicia la jornada con las cantidades ajustadas, después de confirmar', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ menu: MENU, jornada: null, componentes: COMPONENTES, composicion: COMPOSICION });
    api.iniciarJornada.mockResolvedValue({});
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByText('Ajustar cantidades antes de iniciar'));
    const campo = screen
      .getAllByText('Pollo arvejado', { exact: false })
      .map((n) => n.closest('label'))
      .find(Boolean)
      .querySelector('input');
    await usuario.clear(campo);
    await usuario.type(campo, '35');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar jornada' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(api.iniciarJornada).not.toHaveBeenCalled();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Iniciar jornada' }));
    await waitFor(() => expect(api.iniciarJornada).toHaveBeenCalledWith({ 1: '35' }));
  });

  it('con la jornada abierta, tocar JUNAEB vende el combo y muestra el aviso', async () => {
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /^JUNAEB/ }));
    await waitFor(() => expect(api.registrarVenta).toHaveBeenCalledWith('JUNAEB', null, 'combo'));
    expect(await screen.findByText('JUNAEB registrado')).toBeInTheDocument();
  });

  it('Hipocalórico incluye la fruta sin preguntar', async () => {
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /^Hipocalórico/ }));
    await waitFor(() => expect(api.registrarVenta).toHaveBeenCalledWith('Hipocalórico', null, 'combo'));
  });

  it('deshacer una venta reciente la anula', async () => {
    api.consultarJornadaHoy.mockResolvedValue({
      ...ABIERTA,
      ventas_recientes: [
        { id_venta_combo: 77, categoria: 'General', opcion: 'Postre', registrada_en: '2026-11-20T12:10:00', anulada: false },
      ],
    });
    api.anularVenta.mockResolvedValue({});
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(api.anularVenta).toHaveBeenCalledWith(77));
    expect(await screen.findByText('Venta anulada.')).toBeInTheDocument();
  });

  it('cerrar la jornada pide confirmación y luego cierra', async () => {
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    api.cerrarJornada.mockResolvedValue({});
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar jornada' }));
    const dialogo = screen.getByRole('alertdialog');
    await usuario.click(within(dialogo).getAllByRole('button').at(-1));
    await waitFor(() => expect(api.cerrarJornada).toHaveBeenCalled());
    expect(await screen.findByText('Jornada cerrada.')).toBeInTheDocument();
  });

  it('con la jornada cerrada muestra el resumen y permite reabrir', async () => {
    api.consultarJornadaHoy.mockResolvedValue({
      ...ABIERTA,
      jornada: { estado: 'cerrada', cierre_automatico: false },
      ventas_por_categoria: [{ categoria: 'General', ventas: 12 }],
    });
    api.reabrirJornada.mockResolvedValue({});
    const usuario = userEvent.setup();
    montar();
    expect(await screen.findByText('Jornada cerrada')).toBeInTheDocument();
    expect(screen.getByText('12', { exact: false })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reabrir jornada' }));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reabrir' }));
    await waitFor(() => expect(api.reabrirJornada).toHaveBeenCalled());
  });

  it('un cierre automático no se puede reabrir', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ ...ABIERTA, jornada: { estado: 'cerrada', cierre_automatico: true } });
    montar();
    expect(await screen.findByText('Jornada cerrada (cierre automático)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reabrir jornada' })).not.toBeInTheDocument();
  });

  it('si la caja no puede cargar ofrece reintentar', async () => {
    api.consultarJornadaHoy.mockRejectedValueOnce(Object.assign(new Error('sin conexión'), { estado: 0 }));
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /Reintentar|Intentar/i }));
    expect(await screen.findByRole('button', { name: 'Cerrar jornada' })).toBeInTheDocument();
  });
});
