import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({
  listarPreparaciones: vi.fn(), listarCatalogoAlergenos: vi.fn(), crearPreparacion: vi.fn(), actualizarPreparacion: vi.fn(),
  desactivarPreparacion: vi.fn(), reactivarPreparacion: vi.fn(), eliminarPreparacion: vi.fn(), asignarAlergenos: vi.fn(),
  guardarNutricion: vi.fn(), subirImagen: vi.fn(), listarIngredientes: vi.fn(), calcularNutricionApi: vi.fn(),
}));
vi.mock('../components/RecortarImagen', () => ({
  default: ({ archivo, onConfirmar, onCancelar }) => (
    <div role="dialog" aria-label="Recortar">
      <button type="button" onClick={() => onConfirmar(archivo)}>Usar recorte</button>
      <button type="button" onClick={onCancelar}>Cancelar recorte</button>
    </div>
  ),
}));

import * as api from '../api/gestion';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import PreparacionesPage from './PreparacionesPage';

const NUT = { calorias: 420, proteinas_g: 30, carbohidratos_g: 40, grasas_g: 12, origen: 'calculada' };
const prep = (id, nombre, extra = {}) => ({
  id_preparacion: id, nombre, tipo: 'Plato Principal', activa: true, descripcion: '', imagen_url: null, porciones_receta: 10,
  ingredientes: ['Pollo'], ingredientes_detalle: [{ id_ingrediente: 1, nombre: 'Pollo', cantidad_g: 1500 }], alergenos: [], nutricion: NUT,
  id_preparacion_base: null, base_nombre: null, ...extra,
});
const LISTA = [
  prep(1, 'Pollo arvejado'),
  prep(2, 'Pollo arvejado sin arvejas', { id_preparacion_base: 1, base_nombre: 'Pollo arvejado', nutricion: null }),
  prep(3, 'Charquicán', { activa: false }),
  prep(4, 'Flan de caramelo', { tipo: 'Postre', alergenos: ['Huevo', 'Lácteos'] }),
];
const INGREDIENTES = [
  { id_ingrediente: 1, nombre: 'Pollo', categoria: 'Carnes y aves', alergenos: [] },
  { id_ingrediente: 2, nombre: 'Huevo', categoria: 'Lácteos y huevos', alergenos: ['Huevo'] },
  { id_ingrediente: 3, nombre: 'Sal', categoria: null, alergenos: [] },
];
const ALERGENOS = [{ id_alergeno: 1, nombre: 'Huevo' }, { id_alergeno: 2, nombre: 'Lácteos' }, { id_alergeno: 3, nombre: 'Gluten' }];

const montar = (props = {}) => render(<ConfirmacionProvider><PreparacionesPage {...props} /></ConfirmacionProvider>);
const columna = (titulo) => screen.getByRole('heading', { name: new RegExp(`^${titulo}`) }).closest('section');
const tarjeta = (nombre) => screen.getByText(nombre, { selector: 'strong' }).closest('article');
const abrirMenu = async (usuario, nombre) => usuario.click(screen.getByRole('button', { name: `Más acciones de ${nombre}` }));

describe('PreparacionesPage: listado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listarPreparaciones.mockResolvedValue(LISTA);
    api.listarCatalogoAlergenos.mockResolvedValue(ALERGENOS);
    api.listarIngredientes.mockResolvedValue(INGREDIENTES);
    ['desactivarPreparacion', 'reactivarPreparacion', 'eliminarPreparacion', 'asignarAlergenos'].forEach((f) => api[f].mockResolvedValue({}));
    api.guardarNutricion.mockResolvedValue({});
  });

  it('separa platos de acompañamientos y marca variaciones, desactivadas y sin nutrición', async () => {
    montar();
    await screen.findByText('Pollo arvejado', { selector: 'strong' });
    expect(within(columna('Platos')).getAllByRole('article')).toHaveLength(3);
    expect(within(columna('Acompañamientos')).getByText('Flan de caramelo')).toBeInTheDocument();
    expect(within(tarjeta('Pollo arvejado sin arvejas')).getByText('Variación de Pollo arvejado')).toBeInTheDocument();
    expect(within(tarjeta('Pollo arvejado sin arvejas')).getByText('Sin información nutricional')).toBeInTheDocument();
    expect(within(tarjeta('Charquicán')).getByText('Desactivada')).toBeInTheDocument();
    expect(within(tarjeta('Pollo arvejado')).getByText('420 kcal')).toBeInTheDocument();
  });

  it('el detalle muestra ingredientes y alérgenos', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText('Flan de caramelo');
    await usuario.click(within(tarjeta('Flan de caramelo')).getAllByRole('button')[0]);
    expect(within(tarjeta('Flan de caramelo')).getByText('Alérgenos: Huevo, Lácteos')).toBeInTheDocument();
  });

  it('busca dentro de cada columna y oculta las desactivadas', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText('Charquicán');
    await usuario.type(screen.getByLabelText('Buscar en platos'), 'sin arvejas');
    expect(within(columna('Platos')).getAllByRole('article')).toHaveLength(1);
    await usuario.clear(screen.getByLabelText('Buscar en platos'));
    await usuario.click(screen.getByLabelText('Ocultar desactivadas'));
    expect(screen.queryByText('Charquicán')).not.toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Buscar en platos'), 'zzz');
    expect(within(columna('Platos')).getByText('Ninguno coincide con la búsqueda.')).toBeInTheDocument();
  });

  it('una preparación activa no se borra: primero hay que desactivarla', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText('Pollo arvejado', { selector: 'strong' });
    await abrirMenu(usuario, 'Pollo arvejado');
    await usuario.click(screen.getByRole('menuitem', { name: 'Borrar' }));
    expect(screen.getByText('Primero desactívala')).toBeInTheDocument();
    expect(api.eliminarPreparacion).not.toHaveBeenCalled();
  });

  it('desactivar pide confirmación; reactivar no', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText('Charquicán');
    await abrirMenu(usuario, 'Pollo arvejado');
    await usuario.click(screen.getByRole('menuitem', { name: 'Desactivar' }));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(api.desactivarPreparacion).toHaveBeenCalledWith(1));
    await abrirMenu(usuario, 'Charquicán');
    await usuario.click(screen.getByRole('menuitem', { name: 'Reactivar' }));
    await waitFor(() => expect(api.reactivarPreparacion).toHaveBeenCalledWith(3));
    expect(await screen.findByText('Reactivada.')).toBeInTheDocument();
  });

  it('borrar una desactivada pide confirmación y muestra el rechazo del servidor si ya se usó', async () => {
    api.eliminarPreparacion.mockRejectedValue(new Error('No se puede borrar: ya aparece en un menú.'));
    const usuario = userEvent.setup();
    montar();
    await screen.findByText('Charquicán');
    await abrirMenu(usuario, 'Charquicán');
    await usuario.click(screen.getByRole('menuitem', { name: 'Borrar' }));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Borrar' }));
    expect(await screen.findByText('No se puede borrar: ya aparece en un menú.')).toBeInTheDocument();
  });

  it('el menú de acciones se cierra con Escape', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText('Charquicán');
    await abrirMenu(usuario, 'Charquicán');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('si no carga ofrece reintentar', async () => {
    api.listarPreparaciones.mockRejectedValueOnce(Object.assign(new Error('caído'), { estado: 0 }));
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /Reintentar|Intentar/i }));
    expect(await screen.findByText('Charquicán')).toBeInTheDocument();
  });
});

describe('PreparacionesPage: formulario de receta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listarPreparaciones.mockResolvedValue(LISTA);
    api.listarCatalogoAlergenos.mockResolvedValue(ALERGENOS);
    api.listarIngredientes.mockResolvedValue(INGREDIENTES);
    api.crearPreparacion.mockResolvedValue({ id_preparacion: 50 });
    api.actualizarPreparacion.mockResolvedValue({ id_preparacion: 1 });
    api.asignarAlergenos.mockResolvedValue({});
    api.guardarNutricion.mockResolvedValue({});
  });

  async function nuevoPlato(usuario) {
    await usuario.click(await screen.findByRole('button', { name: /Nuevo plato/ }));
    return screen.getByRole('dialog');
  }

  it('crea un plato con ingredientes, calcula la nutrición y guarda todo', async () => {
    api.calcularNutricionApi.mockResolvedValue({ completo: true, por_porcion: { calorias: 350.5, proteinas_g: 25, carbohidratos_g: 30, grasas_g: 10 }, omitidos: ['Sal'] });
    const usuario = userEvent.setup();
    montar();
    const d = await nuevoPlato(usuario);
    await usuario.type(within(d).getAllByRole('textbox')[0], '  Tortilla de pollo ');
    await usuario.click(within(d).getByRole('button', { name: /Agregar ingrediente/ }));
    await usuario.selectOptions(within(d).getByLabelText('Ingrediente 1'), '1');
    await usuario.type(within(d).getByLabelText('Gramos del ingrediente 1'), '800');
    await usuario.click(within(d).getByRole('button', { name: /Agregar ingrediente/ }));
    await usuario.selectOptions(within(d).getByLabelText('Ingrediente 2'), '2');
    await usuario.type(within(d).getByLabelText('Gramos del ingrediente 2'), '400');
    await usuario.type(within(d).getByLabelText('La receta rinde (porciones)'), '4');
    expect(within(d).getByText('Alérgenos sugeridos')).toBeInTheDocument();
    await usuario.click(within(d).getByRole('button', { name: 'Agregar los sugeridos' }));
    expect(within(d).getByLabelText('Huevo')).toBeChecked();
    await usuario.click(within(d).getByRole('button', { name: /Calcular desde los ingredientes/ }));
    expect(api.calcularNutricionApi).toHaveBeenCalledWith({ porciones_receta: 4, ingredientes: [{ id_ingrediente: 1, cantidad_g: 800 }, { id_ingrediente: 2, cantidad_g: 400 }] });
    expect(await within(d).findByText(/No se contó: Sal/)).toBeInTheDocument();
    expect(within(d).getByLabelText('Calorías (kcal)')).toHaveValue(350.5);
    await usuario.click(within(d).getByRole('button', { name: 'Guardar plato' }));
    await waitFor(() => expect(api.crearPreparacion).toHaveBeenCalledWith({
      nombre: 'Tortilla de pollo', descripcion: '', imagen_url: '', porciones_receta: 4, tipo: undefined,
      ingredientes: [{ id_ingrediente: 1, cantidad_g: 800 }, { id_ingrediente: 2, cantidad_g: 400 }],
    }));
    expect(api.asignarAlergenos).toHaveBeenCalledWith(50, ['Huevo']);
    expect(api.guardarNutricion).toHaveBeenCalledWith(50, { calorias: 350.5, proteinas_g: 25, carbohidratos_g: 30, grasas_g: 10, origen: 'calculada' });
    expect(await screen.findByText('Preparación creada.')).toBeInTheDocument();
  });

  it('si la receta cambia después de calcular, obliga a recalcular antes de guardar', async () => {
    api.calcularNutricionApi.mockResolvedValue({ completo: true, por_porcion: { calorias: 300, proteinas_g: 20, carbohidratos_g: 20, grasas_g: 10 }, omitidos: [] });
    const usuario = userEvent.setup();
    montar();
    const d = await nuevoPlato(usuario);
    await usuario.type(within(d).getAllByRole('textbox')[0], 'Algo');
    await usuario.click(within(d).getByRole('button', { name: /Agregar ingrediente/ }));
    await usuario.selectOptions(within(d).getByLabelText('Ingrediente 1'), '1');
    await usuario.type(within(d).getByLabelText('Gramos del ingrediente 1'), '500');
    await usuario.click(within(d).getByRole('button', { name: /Calcular desde los ingredientes/ }));
    await within(d).findByText('Calculado');
    await usuario.type(within(d).getByLabelText('Gramos del ingrediente 1'), '0');
    expect(within(d).getByText(/vuelve a presionar/)).toBeInTheDocument();
    await usuario.click(within(d).getByRole('button', { name: 'Guardar plato' }));
    expect(await within(d).findByText(/presiona "Calcular desde los ingredientes" de nuevo/)).toBeInTheDocument();
    expect(api.crearPreparacion).not.toHaveBeenCalled();
  });

  it('explica por qué todavía no se puede calcular', async () => {
    api.calcularNutricionApi.mockResolvedValue({ completo: false, problemas: ['porciones_invalidas'], sin_datos: [{ nombre: 'Huevo', motivo: 'sin_cantidad' }] });
    const usuario = userEvent.setup();
    montar();
    const d = await nuevoPlato(usuario);
    await usuario.click(within(d).getByRole('button', { name: /Calcular desde los ingredientes/ }));
    expect(await within(d).findByText('Indica cuántas porciones rinde la receta (número entero mayor a 0).')).toBeInTheDocument();
    expect(within(d).getByText('Huevo: falta la cantidad.')).toBeInTheDocument();
  });

  it('valida gramos y porciones antes de enviar', async () => {
    const usuario = userEvent.setup();
    montar();
    const d = await nuevoPlato(usuario);
    await usuario.type(within(d).getAllByRole('textbox')[0], 'Algo');
    await usuario.click(within(d).getByRole('button', { name: /Agregar ingrediente/ }));
    await usuario.type(within(d).getByLabelText('Gramos del ingrediente 1'), '0');
    await usuario.click(within(d).getByRole('button', { name: 'Guardar plato' }));
    expect(await within(d).findByText(/deben ser números mayores a 0/)).toBeInTheDocument();
    await usuario.click(within(d).getByRole('button', { name: 'Quitar ingrediente 1' }));
    await usuario.type(within(d).getByLabelText('La receta rinde (porciones)'), '2.5');
    fireEvent.submit(d.querySelector('form'));
    expect(await within(d).findByText(/entero mayor a 0/)).toBeInTheDocument();
    expect(api.crearPreparacion).not.toHaveBeenCalled();
  });

  it('un acompañamiento exige elegir su tipo', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /Nuevo acompañamiento/ }));
    const d = screen.getByRole('dialog');
    await usuario.type(within(d).getAllByRole('textbox')[0], 'Jalea');
    await usuario.selectOptions(within(d).getByRole('combobox', { name: 'Tipo de componente' }), 'Postre');
    await usuario.click(within(d).getByRole('button', { name: 'Guardar acompañamiento' }));
    await waitFor(() => expect(api.crearPreparacion).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Jalea', tipo: 'Postre' })));
    expect(api.guardarNutricion).not.toHaveBeenCalled();
  });

  it('editar carga la receta guardada y actualiza alérgenos y nutrición', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: 'Editar Flan de caramelo' }));
    const d = screen.getByRole('dialog');
    expect(within(d).getAllByRole('textbox')[0]).toHaveValue('Flan de caramelo');
    expect(within(d).getByLabelText('Gramos del ingrediente 1')).toHaveValue(1500);
    expect(within(d).getByLabelText('Lácteos')).toBeChecked();
    await usuario.click(within(d).getByLabelText('Lácteos'));
    await usuario.clear(within(d).getByLabelText('Calorías (kcal)'));
    await usuario.type(within(d).getByLabelText('Calorías (kcal)'), '280');
    await usuario.click(within(d).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(api.actualizarPreparacion).toHaveBeenCalledWith(4, expect.objectContaining({ tipo: 'Postre' })));
    expect(api.asignarAlergenos).toHaveBeenCalledWith(1, ['Huevo']);
    expect(api.guardarNutricion).toHaveBeenCalledWith(1, expect.objectContaining({ calorias: 280, origen: 'manual' }));
  });

  it('sube una foto pasando por el recorte y la puede quitar', async () => {
    api.subirImagen.mockResolvedValue({ imagen_url: '/api/imagenes/abc' });
    const usuario = userEvent.setup();
    montar();
    const d = await nuevoPlato(usuario);
    const archivo = new File(['x'], 'foto.png', { type: 'image/png' });
    await usuario.upload(d.querySelector('input[type="file"]'), archivo);
    await usuario.click(screen.getByRole('button', { name: 'Usar recorte' }));
    await waitFor(() => expect(api.subirImagen).toHaveBeenCalledWith(archivo));
    await usuario.click(await within(d).findByRole('button', { name: 'Quitar foto' }));
    expect(within(d).getByText('Sube una foto')).toBeInTheDocument();
  });

  it('si la foto se rechaza muestra el motivo', async () => {
    api.subirImagen.mockRejectedValue(new Error('La imagen supera el tamaño máximo de 3 MB.'));
    const usuario = userEvent.setup();
    montar();
    const d = await nuevoPlato(usuario);
    await usuario.upload(d.querySelector('input[type="file"]'), new File(['x'], 'grande.png', { type: 'image/png' }));
    await usuario.click(screen.getByRole('button', { name: 'Usar recorte' }));
    expect(await within(d).findByText('La imagen supera el tamaño máximo de 3 MB.')).toBeInTheDocument();
  });

  it('acepta una foto por enlace', async () => {
    const usuario = userEvent.setup();
    montar();
    const d = await nuevoPlato(usuario);
    await usuario.type(within(d).getAllByRole('textbox')[0], 'Con enlace');
    await usuario.type(within(d).getByLabelText('Enlace de la imagen'), 'https://ejemplo.cl/foto.jpg');
    await usuario.click(within(d).getByRole('button', { name: 'Guardar plato' }));
    await waitFor(() => expect(api.crearPreparacion).toHaveBeenCalledWith(expect.objectContaining({ imagen_url: 'https://ejemplo.cl/foto.jpg' })));
  });
});
