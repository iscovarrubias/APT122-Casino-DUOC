import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({
  listarIngredientes: vi.fn(),
  listarCategoriasIngrediente: vi.fn(),
  listarCatalogoAlergenos: vi.fn(),
  crearIngrediente: vi.fn(),
  actualizarIngrediente: vi.fn(),
  eliminarIngrediente: vi.fn(),
}));

import * as api from '../api/gestion';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import IngredientesPage from './IngredientesPage';

const CATEGORIAS = [
  { id_categoria_ingrediente: 1, nombre: 'Carnes y aves' },
  { id_categoria_ingrediente: 2, nombre: 'Lácteos y huevos' },
];
const ALERGENOS = [
  { id_alergeno: 1, nombre: 'Lácteos' },
  { id_alergeno: 2, nombre: 'Huevo' },
];
const ing = (id, nombre, cat, extra = {}) => ({
  id_ingrediente: id,
  nombre,
  id_categoria_ingrediente: cat,
  calorias_100g: '120',
  proteinas_100g: '20',
  carbohidratos_100g: '0',
  grasas_100g: '4',
  sin_cuantificar: false,
  alergenos: [],
  usos: 2,
  ...extra,
});
const LISTA = [
  ing(1, 'Pechuga de pollo', 1),
  ing(2, 'Queso mantecoso', 2, { alergenos: ['Lácteos'], usos: 0 }),
  ing(3, 'Comino', null, {
    sin_cuantificar: true,
    calorias_100g: null,
    proteinas_100g: null,
    carbohidratos_100g: null,
    grasas_100g: null,
    usos: 1,
  }),
  ing(4, 'Ricota', 2, { calorias_100g: null, usos: 0 }),
];

const montar = () =>
  render(
    <ConfirmacionProvider>
      <IngredientesPage />
    </ConfirmacionProvider>
  );
const filaDe = async (nombre) => (await screen.findByText(nombre)).closest('tr');

describe('IngredientesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listarIngredientes.mockResolvedValue(LISTA);
    api.listarCategoriasIngrediente.mockResolvedValue(CATEGORIAS);
    api.listarCatalogoAlergenos.mockResolvedValue(ALERGENOS);
    api.crearIngrediente.mockResolvedValue({});
    api.actualizarIngrediente.mockResolvedValue({ recalculadas: 0, sin_datos: 0 });
    api.eliminarIngrediente.mockResolvedValue({});
  });

  it('agrupa por categoría y deja al final los que no tienen', async () => {
    montar();
    const titulos = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent);
    expect(titulos).toEqual(['Carnes y aves 1', 'Lácteos y huevos 2', 'Sin categoría 1']);
  });

  it('muestra usos, sin cuantificar y valores faltantes con guion', async () => {
    montar();
    expect(within(await filaDe('Pechuga de pollo')).getByText('Usado en 2 preparaciones')).toBeInTheDocument();
    expect(within(await filaDe('Comino')).getByText('- sin cuantificar')).toBeInTheDocument();
    expect(within(await filaDe('Ricota')).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('solo se pueden borrar los ingredientes que no se usan', async () => {
    montar();
    expect(within(await filaDe('Pechuga de pollo')).queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument();
    expect(within(await filaDe('Queso mantecoso')).getByRole('button', { name: 'Borrar' })).toBeInTheDocument();
  });

  it('el filtro de incompletos ignora los sin cuantificar y cuenta los que faltan', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByLabelText(/Solo sin información nutricional \(1\)/));
    expect(screen.getByText('Ricota')).toBeInTheDocument();
    expect(screen.queryByText('Comino')).not.toBeInTheDocument();
    expect(screen.queryByText('Pechuga de pollo')).not.toBeInTheDocument();
  });

  it('busca sin importar mayúsculas y avisa cuando no hay coincidencias', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.type(await screen.findByLabelText('Buscar ingrediente'), 'QUESO');
    expect(screen.getByText('Queso mantecoso')).toBeInTheDocument();
    expect(screen.queryByText('Pechuga de pollo')).not.toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Buscar ingrediente'), 'xyz');
    expect(screen.getByText('Ningún ingrediente coincide con la búsqueda.')).toBeInTheDocument();
  });

  it('se puede plegar una categoría', async () => {
    const usuario = userEvent.setup();
    montar();
    const cabeza = (await screen.findByText('Carnes y aves', { exact: false })).closest('button');
    expect(cabeza).toHaveAttribute('aria-expanded', 'true');
    await usuario.click(cabeza);
    expect(cabeza).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Pechuga de pollo')).not.toBeInTheDocument();
  });

  it('crea un ingrediente con categoría, alérgenos y los cuatro nutrientes', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /Nuevo ingrediente/ }));
    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getAllByRole('textbox')[0], '  Huevo de gallina ');
    await usuario.selectOptions(within(dialogo).getByRole('combobox'), '2');
    await usuario.click(within(dialogo).getByLabelText('Huevo'));
    await usuario.type(within(dialogo).getByLabelText('Calorías (kcal)'), '143');
    await usuario.type(within(dialogo).getByLabelText('Proteínas (g)'), '12.6');
    await usuario.type(within(dialogo).getByLabelText('Carbohidratos (g)'), '0.7');
    await usuario.type(within(dialogo).getByLabelText('Grasas (g)'), '9.5');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar ingrediente' }));
    await waitFor(() =>
      expect(api.crearIngrediente).toHaveBeenCalledWith({
        nombre: 'Huevo de gallina',
        id_categoria_ingrediente: 2,
        sin_cuantificar: false,
        alergenos: ['Huevo'],
        calorias_100g: 143,
        proteinas_100g: 12.6,
        carbohidratos_100g: 0.7,
        grasas_100g: 9.5,
      })
    );
    expect(await screen.findByText('Ingrediente creado.')).toBeInTheDocument();
  });

  it('no deja guardar nutrientes a medias', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /Nuevo ingrediente/ }));
    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getAllByRole('textbox')[0], 'Avena');
    await usuario.type(within(dialogo).getByLabelText('Calorías (kcal)'), '380');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar ingrediente' }));
    expect(await within(dialogo).findByText('Completa los cuatro valores nutricionales o déjalos todos vacíos.')).toBeInTheDocument();
    expect(api.crearIngrediente).not.toHaveBeenCalled();
  });

  it('al editar informa cuántas preparaciones se recalcularon', async () => {
    api.actualizarIngrediente.mockResolvedValue({ recalculadas: 3, sin_datos: 1 });
    const usuario = userEvent.setup();
    montar();
    await usuario.click(within(await filaDe('Pechuga de pollo')).getByRole('button', { name: 'Editar' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getAllByRole('textbox')[0]).toHaveValue('Pechuga de pollo');
    expect(within(dialogo).getByLabelText('Calorías (kcal)')).toHaveValue(120);
    await usuario.clear(within(dialogo).getByLabelText('Calorías (kcal)'));
    await usuario.type(within(dialogo).getByLabelText('Calorías (kcal)'), '165');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(api.actualizarIngrediente).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ calorias_100g: 165, id_categoria_ingrediente: 1 })
      )
    );
    expect(
      await screen.findByText(/3 preparación\(es\) con nutrición calculada se recalcularon; 1 quedaron sin información/)
    ).toBeInTheDocument();
  });

  it('borrar pide confirmación y no borra si se cancela', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(within(await filaDe('Queso mantecoso')).getByRole('button', { name: 'Borrar' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('¿Borrar "Queso mantecoso" definitivamente?')).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(api.eliminarIngrediente).not.toHaveBeenCalled();
    await usuario.click(within(await filaDe('Queso mantecoso')).getByRole('button', { name: 'Borrar' }));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(api.eliminarIngrediente).toHaveBeenCalledWith(2));
    expect(await screen.findByText('Ingrediente borrado.')).toBeInTheDocument();
  });

  it('si el servidor rechaza el borrado muestra el motivo', async () => {
    api.eliminarIngrediente.mockRejectedValue(new Error('El ingrediente está en uso.'));
    const usuario = userEvent.setup();
    montar();
    await usuario.click(within(await filaDe('Queso mantecoso')).getByRole('button', { name: 'Borrar' }));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Borrar' }));
    expect(await screen.findByText('El ingrediente está en uso.')).toBeInTheDocument();
  });

  it('si no carga ofrece reintentar', async () => {
    api.listarIngredientes.mockRejectedValueOnce(Object.assign(new Error('caído'), { estado: 500 }));
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /Reintentar|Intentar/i }));
    expect(await screen.findByText('Pechuga de pollo')).toBeInTheDocument();
  });
});
