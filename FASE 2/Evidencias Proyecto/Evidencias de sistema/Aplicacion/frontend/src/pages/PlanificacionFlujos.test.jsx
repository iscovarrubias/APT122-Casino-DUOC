import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({
  consultarPlanificacion: vi.fn(), listarPreparaciones: vi.fn(), agregarComponente: vi.fn(), actualizarComponente: vi.fn(),
  quitarComponente: vi.fn(), publicarMenu: vi.fn(), despublicarMenu: vi.fn(), consultarMes: vi.fn(), copiarMenus: vi.fn(),
  consultarSugerencias: vi.fn(), listarCatalogoAlergenos: vi.fn(), listarIngredientes: vi.fn(),
  crearPreparacion: vi.fn(), actualizarPreparacion: vi.fn(), asignarAlergenos: vi.fn(), guardarNutricion: vi.fn(),
  subirImagen: vi.fn(), calcularNutricionApi: vi.fn(), desactivarPreparacion: vi.fn(), reactivarPreparacion: vi.fn(), eliminarPreparacion: vi.fn(),
}));
vi.mock('../api/menu', () => ({ obtenerMenuHoy: vi.fn() }));
vi.mock('../context/auth-context', () => ({ useAuth: () => ({ usuario: { rol: 'Administrador' } }) }));
vi.mock('../components/ExportarMenu', () => ({ default: ({ vistaMes, onCerrar }) => <div role="dialog" aria-label="Exportar menú">{vistaMes ? 'mes' : 'semana'}<button type="button" onClick={onCerrar}>Cerrar exportar</button></div> }));

import * as api from '../api/gestion';
import { obtenerMenuHoy } from '../api/menu';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import PlanificacionPage from './PlanificacionPage';

const p = (id, nombre, tipo = 'Plato Principal', extra = {}) => ({ id_preparacion: id, nombre, tipo, activa: true, ingredientes: [], ingredientes_detalle: [], alergenos: [], nutricion: null, id_preparacion_base: null, ...extra });
const PREPARACIONES = [
  p(1, 'Pollo arvejado'), p(2, 'Arroz con pollo'), p(3, 'Budín de zapallitos'), p(4, 'Pollo a la plancha'),
  p(10, 'Ensalada chilena', 'Ensalada'), p(11, 'Sopa de verduras', 'Sopa'), p(12, 'Pan amasado', 'Pan'),
  p(13, 'Flan', 'Postre'), p(14, 'Manzana', 'Fruta'), p(15, 'Jugo de naranja', 'Bebida'), p(16, 'Agua mineral', 'Bebida'),
  p(17, 'Charquicán', 'Plato Principal', { activa: false }),
];
const comp = (id, componente, categoria, id_preparacion, preparacion, cantidad = 50, precio = null) => ({ id_menu_preparacion: id, componente, categoria, id_preparacion, preparacion, cantidad_planificada: cantidad, precio });
const VACIO = { menu: null, componentes: [], precios_recientes: { General: 3500, JUNAEB: 0 } };
const PARCIAL = {
  menu: { id_menu: 9, publicado: false },
  componentes: [comp(100, 'Plato Principal', 'General', 1, 'Pollo arvejado', 120, 3500), comp(101, 'Bebida', null, 15, 'Jugo de naranja', 200)],
  precios_recientes: {},
};

const montar = () => render(<ConfirmacionProvider><PlanificacionPage /></ConfirmacionProvider>);
const tarjeta = (titulo) => screen.getByRole('combobox', { name: `Preparación para ${titulo}` }).closest('article');

describe('Planificación: editar un día', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T15:00:00Z'));
    vi.clearAllMocks();
    api.listarPreparaciones.mockResolvedValue(PREPARACIONES);
    api.consultarSugerencias.mockResolvedValue({ categorias: [{ categoria: 'General', estimacion: { sugerido: 135, minimo: 120, maximo: 150, n: 4, base: 'mismo_dia' } }], compartidos: { por_tipo: { Bebida: 260 } } });
    ['agregarComponente', 'actualizarComponente', 'quitarComponente', 'publicarMenu', 'despublicarMenu'].forEach((f) => api[f].mockResolvedValue({}));
  });
  afterEach(() => vi.useRealTimers());

  it('un día vacío indica que faltan los 9 componentes y propone el último precio', async () => {
    api.consultarPlanificacion.mockResolvedValue(VACIO);
    montar();
    expect(await screen.findByText('Faltan 9 de 9 componentes requeridos para completar el día.')).toBeInTheDocument();
    expect(within(tarjeta('General')).getByLabelText('Precio del combo (CLP)')).toHaveValue(3500);
    expect(screen.getByText('Hoy - miércoles')).toBeInTheDocument();
  });

  it('las preparaciones desactivadas no se ofrecen', async () => {
    api.consultarPlanificacion.mockResolvedValue(VACIO);
    montar();
    await screen.findByText(/Faltan 9/);
    expect(within(tarjeta('General')).queryByRole('option', { name: 'Charquicán' })).not.toBeInTheDocument();
    expect(within(tarjeta('Bebida')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Elegir preparación', 'Jugo de naranja', 'Agua mineral']);
  });

  it('agrega un plato usando la sugerencia de cantidad', async () => {
    api.consultarPlanificacion.mockResolvedValue(VACIO);
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Faltan 9/);
    const general = tarjeta('General');
    expect(within(general).getByText('últimos 4 miércoles')).toBeInTheDocument();
    await usuario.selectOptions(within(general).getByRole('combobox'), '1');
    await usuario.click(within(general).getByRole('button', { name: 'Usar' }));
    expect(within(general).getByLabelText('Cantidad planificada')).toHaveValue(135);
    await usuario.click(within(general).getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(api.agregarComponente).toHaveBeenCalledWith({ fecha: '2026-11-18', id_preparacion: 1, cantidad_planificada: 135, tipo_componente: 'Plato Principal', categoria: 'General', precio: 3500 }));
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
  });

  it('un componente cargado solo se puede guardar si cambió algo', async () => {
    api.consultarPlanificacion.mockResolvedValue(PARCIAL);
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Faltan 7/);
    const general = tarjeta('General');
    expect(within(general).getByText('Cargado')).toBeInTheDocument();
    const guardar = within(general).getByRole('button', { name: 'Guardar cambios' });
    expect(guardar).toBeDisabled();
    await usuario.clear(within(general).getByLabelText('Cantidad planificada'));
    await usuario.type(within(general).getByLabelText('Cantidad planificada'), '140');
    await usuario.click(guardar);
    await waitFor(() => expect(api.actualizarComponente).toHaveBeenCalledWith(100, { id_preparacion: 1, cantidad_planificada: 140, precio: 3500 }));
  });

  it('quitar un componente pide confirmación', async () => {
    api.consultarPlanificacion.mockResolvedValue(PARCIAL);
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Faltan 7/);
    await usuario.click(screen.getByRole('button', { name: 'Quitar Bebida del menú' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(dialogo).toHaveTextContent('¿Quitar "Jugo de naranja" del menú?');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(api.quitarComponente).toHaveBeenCalledWith(101));
  });

  it('publica y despublica el menú', async () => {
    api.consultarPlanificacion.mockResolvedValueOnce(PARCIAL).mockResolvedValue({ ...PARCIAL, menu: { id_menu: 9, publicado: true } });
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: 'Publicar menú' }));
    await waitFor(() => expect(api.publicarMenu).toHaveBeenCalledWith(9));
    expect(await screen.findByText('Menú publicado. Ya lo ven los estudiantes.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Despublicar menú' }));
    await waitFor(() => expect(api.despublicarMenu).toHaveBeenCalledWith(9));
  });

  it('guardar todo no agrega nada si falta algún componente y dice cuáles', async () => {
    api.consultarPlanificacion.mockResolvedValue(VACIO);
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Faltan 9/);
    await usuario.selectOptions(within(tarjeta('General')).getByRole('combobox'), '1');
    await usuario.click(screen.getByRole('button', { name: 'Guardar todo el menú' }));
    expect(await screen.findByText(/No se agregó nada\. Falta: Plato Principal - General: falta la cantidad, Plato Principal - JUNAEB: falta el plato/)).toBeInTheDocument();
    expect(api.agregarComponente).not.toHaveBeenCalled();
  });

  it('guardar todo agrega los 9 requeridos de una vez (el pan es opcional)', async () => {
    api.consultarPlanificacion.mockResolvedValue(VACIO);
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Faltan 9/);
    const llenar = async (titulo, id, cantidad, precio) => {
      const t = tarjeta(titulo);
      await usuario.selectOptions(within(t).getByRole('combobox'), String(id));
      await usuario.type(within(t).getByLabelText(/Cantidad/), String(cantidad));
      if (precio !== undefined) {
        await usuario.clear(within(t).getByLabelText('Precio del combo (CLP)'));
        await usuario.type(within(t).getByLabelText('Precio del combo (CLP)'), String(precio));
      }
    };
    await llenar('General', 1, 100, 3500);
    await llenar('JUNAEB', 2, 80, 0);
    await llenar('Vegetariano', 3, 40, 3500);
    await llenar('Hipocalórico', 4, 30, 3800);
    await llenar('Ensalada', 10, 150);
    await llenar('Sopa', 11, 150);
    await llenar('Postre', 13, 120);
    await llenar('Fruta', 14, 80);
    await llenar('Bebida', 15, 250);
    await usuario.click(screen.getByRole('button', { name: 'Guardar todo el menú' }));
    await waitFor(() => expect(api.agregarComponente).toHaveBeenCalledTimes(9));
    expect(api.agregarComponente).toHaveBeenCalledWith(expect.objectContaining({ tipo_componente: 'Plato Principal', categoria: 'JUNAEB', precio: 0 }));
    expect(api.agregarComponente).not.toHaveBeenCalledWith(expect.objectContaining({ tipo_componente: 'Pan' }));
    expect(await screen.findByText('9 cambio(s) guardado(s).')).toBeInTheDocument();
  }, 20000);

  it('crea un acompañamiento especial solo para un menú', async () => {
    api.consultarPlanificacion.mockResolvedValue(PARCIAL);
    obtenerMenuHoy.mockResolvedValue({ composicion: { JUNAEB: [{ tipo: 'Bebida' }], General: [{ tipo: 'Postre' }, { tipo: 'Bebida' }] } });
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /Especial para un menú/ }));
    const d = screen.getByRole('dialog');
    await usuario.click(within(d).getByRole('button', { name: 'Crear especial' }));
    expect(await within(d).findByText('Elige la categoría del menú.')).toBeInTheDocument();
    const [categoria] = within(d).getAllByRole('combobox');
    await usuario.selectOptions(categoria, 'JUNAEB');
    await waitFor(() => expect(within(d).getAllByRole('combobox')[1]).toBeInTheDocument());
    expect(within(within(d).getAllByRole('combobox')[1]).getAllByRole('option').map((o) => o.textContent)).toEqual(['Elegir tipo', 'Bebida']);
    await usuario.selectOptions(within(d).getAllByRole('combobox')[1], 'Bebida');
    await usuario.selectOptions(within(d).getAllByRole('combobox')[2], '16');
    await usuario.type(within(d).getByRole('spinbutton'), '60');
    await usuario.click(within(d).getByRole('button', { name: 'Crear especial' }));
    await waitFor(() => expect(api.agregarComponente).toHaveBeenCalledWith({ fecha: '2026-11-18', id_preparacion: 16, cantidad_planificada: 60, tipo_componente: 'Bebida', categoria: 'JUNAEB' }));
    expect(await screen.findByText('Acompañamiento especial creado.')).toBeInTheDocument();
  });

  it('un especial cargado aparece aparte y el compartido indica la excepción', async () => {
    api.consultarPlanificacion.mockResolvedValue({ ...PARCIAL, componentes: [...PARCIAL.componentes, comp(102, 'Bebida', 'JUNAEB', 16, 'Agua mineral', 60)] });
    montar();
    expect(await screen.findByText('Especiales de este día')).toBeInTheDocument();
    expect(screen.getByText('En todos los menús - excepto JUNAEB')).toBeInTheDocument();
    expect(screen.getByText('Bebida - JUNAEB')).toBeInTheDocument();
  });

  it('si el servidor rechaza un cambio muestra el motivo', async () => {
    api.consultarPlanificacion.mockResolvedValue(VACIO);
    api.agregarComponente.mockRejectedValue(new Error('La categoría JUNAEB no admite precio.'));
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Faltan 9/);
    const junaeb = tarjeta('JUNAEB');
    await usuario.selectOptions(within(junaeb).getByRole('combobox'), '2');
    await usuario.type(within(junaeb).getByLabelText('Cantidad planificada'), '80');
    await usuario.click(within(junaeb).getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByText('La categoría JUNAEB no admite precio.')).toBeInTheDocument();
  });

  it('si la planificación no carga ofrece reintentar', async () => {
    api.consultarPlanificacion.mockRejectedValueOnce(Object.assign(new Error('caído'), { estado: 502 })).mockResolvedValue(VACIO);
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: /Reintentar|Intentar/i }));
    expect(await screen.findByText(/Faltan 9/)).toBeInTheDocument();
  });

  it('exportar abre la ventana en modo semana desde la vista de día', async () => {
    api.consultarPlanificacion.mockResolvedValue(VACIO);
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Faltan 9/);
    await usuario.click(screen.getByRole('button', { name: /Exportar/ }));
    expect(screen.getByRole('dialog', { name: 'Exportar menú' })).toHaveTextContent('semana');
  });
});

describe('Planificación: vista mensual y copiar y pegar', () => {
  const MES = { dias: [
    { fecha: '2026-11-16', publicado: true, componentes: [{ componente: 'Plato Principal', categoria: 'JUNAEB', preparacion: 'Arroz con pollo' }, { componente: 'Plato Principal', categoria: 'General', preparacion: 'Pollo arvejado' }] },
    { fecha: '2026-11-17', publicado: false, componentes: [{ componente: 'Plato Principal', categoria: 'General', preparacion: 'Cazuela' }] },
  ] };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T15:00:00Z'));
    vi.clearAllMocks();
    api.listarPreparaciones.mockResolvedValue(PREPARACIONES);
    api.consultarSugerencias.mockResolvedValue(null);
    api.consultarPlanificacion.mockResolvedValue(VACIO);
    api.consultarMes.mockResolvedValue(MES);
    api.copiarMenus.mockResolvedValue({ copiados: 1, omitidos: [] });
  });
  afterEach(() => vi.useRealTimers());

  async function abrirMes(usuario) {
    montar();
    await screen.findByText(/Faltan 9/);
    await usuario.click(screen.getByRole('button', { name: 'Mes' }));
    await screen.findByText('Noviembre de 2026');
  }
  const celda = (dia) => screen.getAllByRole('button').find((b) => b.classList.contains('mes-celda') && b.querySelector('.mes-dia')?.textContent === String(dia));

  it('muestra el estado de cada día y los platos ordenados por categoría', async () => {
    const usuario = userEvent.setup();
    await abrirMes(usuario);
    expect(within(celda(16)).getByText('Publicado')).toBeInTheDocument();
    expect([...celda(16).querySelectorAll('.mes-pildora')].map((n) => n.textContent)).toEqual(['Pollo arvejado', 'Arroz con pollo']);
    expect(within(celda(17)).getByText('Borrador')).toBeInTheDocument();
    expect(within(celda(18)).getByText('Sin menú')).toBeInTheDocument();
    expect(celda(18)).toHaveClass('hoy');
    expect(celda(21)).toBeUndefined();
  });

  it('se mueve entre meses', async () => {
    const usuario = userEvent.setup();
    await abrirMes(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(await screen.findByText('Diciembre de 2026')).toBeInTheDocument();
    expect(api.consultarMes).toHaveBeenLastCalledWith('2026-12');
  });

  it('tocar un día abre su planificación en una ventana', async () => {
    const usuario = userEvent.setup();
    await abrirMes(usuario);
    await usuario.click(celda(20));
    const dialogo = screen.getByRole('dialog', { name: 'Planificar día' });
    expect(within(dialogo).getByText('Viernes 20 de noviembre')).toBeInTheDocument();
    expect(within(dialogo).getByText('En 2 días')).toBeInTheDocument();
    await waitFor(() => expect(api.consultarPlanificacion).toHaveBeenLastCalledWith('2026-11-20'));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Planificar día' })).not.toBeInTheDocument();
  });

  it('copia un día: solo deja elegir como origen días con menú', async () => {
    api.copiarMenus.mockResolvedValue({ copiados: 1, omitidos: [] });
    const usuario = userEvent.setup();
    await abrirMes(usuario);
    await usuario.click(screen.getByRole('button', { name: /Copiar y pegar/ }));
    expect(celda(20)).toBeDisabled();
    await usuario.click(celda(16));
    expect(screen.getByText('lunes 16/11')).toBeInTheDocument();
    await usuario.click(celda(23));
    await usuario.click(screen.getByLabelText('Reemplazar lo que ya esté cargado en el destino'));
    await usuario.click(screen.getByRole('button', { name: 'Pegar' }));
    await waitFor(() => expect(api.copiarMenus).toHaveBeenCalledWith([{ origen: '2026-11-16', destino: '2026-11-23' }], true));
    expect(await screen.findByText('Se copiaron 1 día(s); quedaron sin publicar.')).toBeInTheDocument();
  });

  it('copia una semana completa de lunes a sábado e informa lo omitido', async () => {
    api.copiarMenus.mockResolvedValue({ copiados: 2, omitidos: [{ fecha: '2026-11-25', motivo: 'Ya tiene una jornada iniciada.' }, { fecha: '2026-11-27', motivo: 'El origen no tiene menú.' }] });
    const usuario = userEvent.setup();
    await abrirMes(usuario);
    await usuario.click(screen.getByRole('button', { name: /Copiar y pegar/ }));
    await usuario.click(screen.getByRole('button', { name: 'Una semana' }));
    await usuario.click(celda(18));
    await usuario.click(celda(26));
    await usuario.click(screen.getByRole('button', { name: 'Pegar' }));
    await waitFor(() => expect(api.copiarMenus).toHaveBeenCalled());
    const [pares, sobrescribir] = api.copiarMenus.mock.calls[0];
    expect(pares).toHaveLength(6);
    expect(pares[0]).toEqual({ origen: '2026-11-16', destino: '2026-11-23' });
    expect(pares[5]).toEqual({ origen: '2026-11-21', destino: '2026-11-28' });
    expect(sobrescribir).toBe(false);
    expect(await screen.findByText(/Omitidos: 25\/11 \(Ya tiene una jornada iniciada\)\./)).toBeInTheDocument();
  });

  it('si la copia falla muestra el motivo en el panel', async () => {
    api.copiarMenus.mockRejectedValue(new Error('No puedes copiar sobre días pasados.'));
    const usuario = userEvent.setup();
    await abrirMes(usuario);
    await usuario.click(screen.getByRole('button', { name: /Copiar y pegar/ }));
    await usuario.click(celda(17));
    await usuario.click(celda(2));
    await usuario.click(screen.getByRole('button', { name: 'Pegar' }));
    expect(await screen.findByText('No puedes copiar sobre días pasados.')).toBeInTheDocument();
  });

  it('si el mes no carga ofrece reintentar', async () => {
    api.consultarMes.mockRejectedValueOnce(Object.assign(new Error('caído'), { estado: 500 })).mockResolvedValue(MES);
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Faltan 9/);
    await usuario.click(screen.getByRole('button', { name: 'Mes' }));
    await usuario.click(await screen.findByRole('button', { name: /Reintentar|Intentar/i }));
    expect(await screen.findByText('Noviembre de 2026')).toBeInTheDocument();
  });
});
