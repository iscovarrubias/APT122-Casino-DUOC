import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({
  consultarPlanificacion: vi.fn(),
  listarPreparaciones: vi.fn(),
  agregarComponente: vi.fn(),
  actualizarComponente: vi.fn(),
  quitarComponente: vi.fn(),
  publicarMenu: vi.fn(),
  despublicarMenu: vi.fn(),
  consultarMes: vi.fn(),
  copiarMenus: vi.fn(),
  consultarSugerencias: vi.fn(),
  listarCatalogoAlergenos: vi.fn(),
  listarIngredientes: vi.fn(),
  crearPreparacion: vi.fn(),
  actualizarPreparacion: vi.fn(),
  asignarAlergenos: vi.fn(),
  guardarNutricion: vi.fn(),
  subirImagen: vi.fn(),
  calcularNutricionApi: vi.fn(),
  desactivarPreparacion: vi.fn(),
  reactivarPreparacion: vi.fn(),
  eliminarPreparacion: vi.fn(),
}));
vi.mock('../context/auth-context', () => ({ useAuth: vi.fn() }));

import * as api from '../api/gestion';
import { useAuth } from '../context/auth-context';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import PlanificacionPage from './PlanificacionPage';

const BUDIN = {
  id_preparacion: 7,
  nombre: 'Budín de Zapallitos',
  tipo: 'Plato Principal',
  activa: true,
  porciones_receta: 10,
  descripcion: '',
  imagen_url: null,
  id_preparacion_base: null,
  base_nombre: null,
  ingredientes: ['Queso', 'Zapallito italiano'],
  ingredientes_detalle: [
    { id_ingrediente: 1, nombre: 'Zapallito italiano', cantidad_g: 2500 },
    { id_ingrediente: 2, nombre: 'Queso', cantidad_g: 300 },
  ],
  alergenos: ['Lácteos'],
  nutricion: { calorias: 380, proteinas_g: 18, carbohidratos_g: 35, grasas_g: 18, origen: 'manual' },
};
const VARIACION = {
  ...BUDIN,
  id_preparacion: 8,
  nombre: 'Budín de Zapallitos (sin queso)',
  id_preparacion_base: 7,
  base_nombre: 'Budín de Zapallitos',
  alergenos: [],
};

const montar = () =>
  render(
    <ConfirmacionProvider>
      <PlanificacionPage />
    </ConfirmacionProvider>
  );

describe('PlanificacionPage - receta y variaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.consultarPlanificacion.mockResolvedValue({ menu: { id_menu: 1, publicado: false }, componentes: [], precios_recientes: {} });
    api.consultarSugerencias.mockResolvedValue(null);
    api.listarPreparaciones.mockResolvedValue([BUDIN]);
    api.listarCatalogoAlergenos.mockResolvedValue([
      { id_alergeno: 1, nombre: 'Lácteos' },
      { id_alergeno: 2, nombre: 'Huevo' },
    ]);
    api.listarIngredientes.mockResolvedValue([
      { id_ingrediente: 1, nombre: 'Zapallito italiano', alergenos: [] },
      { id_ingrediente: 2, nombre: 'Queso', alergenos: ['Lácteos'] },
    ]);
    api.crearPreparacion.mockResolvedValue({ id_preparacion: 8 });
    api.asignarAlergenos.mockResolvedValue({});
    api.guardarNutricion.mockResolvedValue({});
  });

  it('el personal puede ver la receta pero no crear variaciones', async () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Personal Casino' } });
    montar();
    await userEvent.selectOptions(await screen.findByLabelText('Preparación para General'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Ver receta de General' }));
    const modal = screen.getByRole('dialog', { name: 'Receta de Budín de Zapallitos' });
    expect(within(modal).getByText('Zapallito italiano')).toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: 'Crear variación' })).not.toBeInTheDocument();
  });

  it('el botón de receta está deshabilitado hasta elegir un plato', async () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Administrador' } });
    montar();
    await screen.findByLabelText('Preparación para General');
    expect(screen.getByRole('button', { name: 'Ver receta de General' })).toBeDisabled();
  });

  it('crea una variación a partir de la receta y la deja seleccionada en la tarjeta', async () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Administrador' } });
    montar();
    await userEvent.selectOptions(await screen.findByLabelText('Preparación para General'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Ver receta de General' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear variación' }));

    const formulario = await screen.findByRole('dialog', { name: 'Nueva preparación' });
    const nombre = within(formulario).getByDisplayValue('Budín de Zapallitos (variación)');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Budín de Zapallitos (sin queso)');

    api.listarPreparaciones.mockResolvedValue([BUDIN, VARIACION]);
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar variación' }));

    await waitFor(() => expect(api.crearPreparacion).toHaveBeenCalled());
    expect(api.crearPreparacion.mock.calls[0][0]).toMatchObject({
      nombre: 'Budín de Zapallitos (sin queso)',
      id_preparacion_base: 7,
      tipo: 'Plato Principal',
    });
    await waitFor(() => expect(screen.getByLabelText('Preparación para General')).toHaveValue('8'));
    expect(
      within(screen.getByLabelText('Preparación para General')).getByRole('option', { name: '↳ Budín de Zapallitos (sin queso)' })
    ).toBeInTheDocument();
    expect(await screen.findByText(/Variación creada/)).toBeInTheDocument();
  });
});
