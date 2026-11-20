import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-easy-crop', () => ({
  default: ({ onCropComplete, image }) => (
    <button type="button" onClick={() => onCropComplete({}, { x: 10, y: 20, width: 3200, height: 1800 })}>encuadrar {image ? 'con imagen' : 'sin imagen'}</button>
  ),
}));
vi.mock('../api/gestion', () => ({ consultarOpiniones: vi.fn(), consultarOpinionesDetalle: vi.fn(), consultarFavoritosDetalle: vi.fn() }));
vi.mock('./ExportarAnalisis', () => ({ default: ({ tipo }) => <div role="dialog" aria-label="Exportar">{tipo}</div> }));

import * as api from '../api/gestion';
import RecortarImagen from './RecortarImagen';
import OpinionesPanel from './OpinionesPanel';

describe('RecortarImagen', () => {
  let dibujado;
  beforeEach(() => {
    dibujado = null;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:foto');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: (...args) => { dibujado = args; } });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function entregar(cb) { cb(new Blob(['jpg'], { type: 'image/jpeg' })); });
    Object.defineProperty(globalThis.Image.prototype, 'src', {
      configurable: true,
      set(valor) { this._src = valor; setTimeout(() => this.dispatchEvent(new Event(valor === 'blob:rota' ? 'error' : 'load'))); },
      get() { return this._src; },
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('no deja confirmar hasta que se encuadra la foto', () => {
    render(<RecortarImagen archivo={new File(['x'], 'a.png')} onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Usar esta foto' })).toBeDisabled();
  });

  it('recorta, limita el lado mayor a 1600 px y entrega un JPG', async () => {
    const onConfirmar = vi.fn();
    const usuario = userEvent.setup();
    render(<RecortarImagen archivo={new File(['x'], 'a.png')} onConfirmar={onConfirmar} onCancelar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: /encuadrar con imagen/ }));
    await usuario.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalled());
    const archivo = onConfirmar.mock.calls[0][0];
    expect(archivo.name).toBe('foto.jpg');
    expect(archivo.type).toBe('image/jpeg');
    expect(dibujado.slice(1)).toEqual([10, 20, 3200, 1800, 0, 0, 1600, 900]);
  });

  it('si la imagen no se puede leer muestra el error', async () => {
    URL.createObjectURL.mockReturnValue('blob:rota');
    const usuario = userEvent.setup();
    render(<RecortarImagen archivo={new File(['x'], 'a.png')} onConfirmar={() => {}} onCancelar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: /encuadrar/ }));
    await usuario.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    expect(await screen.findByText('No se pudo leer la imagen.')).toBeInTheDocument();
  });

  it('el zoom se ajusta con el control deslizante y cancelar cierra', async () => {
    const onCancelar = vi.fn();
    render(<RecortarImagen archivo={new File(['x'], 'a.png')} onConfirmar={() => {}} onCancelar={onCancelar} />);
    const zoom = screen.getByLabelText('Zoom de la foto');
    zoom.value = '2';
    zoom.dispatchEvent(new Event('input', { bubbles: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
  });
});

describe('OpinionesPanel', () => {
  const op = (id, extra) => ({ id_opinion: id, id_preparacion: 1, preparacion: 'Pollo arvejado', estrellas: 4, estado: 'vigente', comentario: 'Rico', autor: 'Ana P.', correo: 'an.p@duocuc.cl', categoria: 'General', fecha_menu: '2026-11-16', creado_en: '2026-11-16T13:05:00', ...extra });
  const DETALLE = {
    opiniones: [op(1), op(2, { estado: 'eliminada', comentario: '', cerrada_en: '2026-11-17T09:00:00', categoria: null, fecha_menu: null }), op(3, { estado: 'editada', cerrada_en: '2026-11-18T10:00:00', id_preparacion: 2, preparacion: 'Flan' })],
    preparaciones: [{ id_preparacion: 1, nombre: 'Pollo arvejado', total: 2 }, { id_preparacion: 2, nombre: 'Flan', total: 1 }],
    resumen: { total: 3, con_comentario: 2, promedio_vigentes: 4, eliminadas: 1, editadas: 1 },
  };
  beforeEach(() => {
    vi.clearAllMocks();
    api.consultarOpinionesDetalle.mockResolvedValue(DETALLE);
    api.consultarOpiniones.mockResolvedValue({ promedios: [{ id_preparacion: 1, nombre: 'Pollo arvejado', promedio: 4, total: 2 }], favoritos: [{ id_preparacion: 2, nombre: 'Flan', total: 5 }] });
    api.consultarFavoritosDetalle.mockResolvedValue({ resumen: { total: 5, estudiantes: 3, preparaciones: 1 }, por_preparacion: [{ id_preparacion: 2, nombre: 'Flan', total: 5 }], favoritos: [{ id_preparacion: 2, preparacion: 'Flan', autor: 'Ana P.', correo: 'an.p@duocuc.cl', creado_en: '2026-11-16T12:00:00' }] });
  });

  it('muestra las opiniones con su estado y conserva las eliminadas y editadas', async () => {
    render(<OpinionesPanel />);
    expect((await screen.findAllByText('“Rico”', { exact: false })).length).toBe(2);
    expect(screen.getByText(/Eliminada por el estudiante el 17\/11\/2026 09:00/)).toBeInTheDocument();
    expect(screen.getByText(/Versión anterior: el estudiante la editó el 18\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByText('Solo calificó, sin comentario.')).toBeInTheDocument();
    expect(screen.getByText('Menú sin registrar')).toBeInTheDocument();
    expect(screen.getAllByText('Menú del lunes 16 de noviembre').length).toBeGreaterThan(0);
  });

  it('los filtros se envían al servidor y se pueden limpiar', async () => {
    const usuario = userEvent.setup();
    render(<OpinionesPanel />);
    await screen.findByText('Opiniones de los estudiantes');
    const combo = async (i) => (await screen.findAllByRole('combobox'))[i];
    await usuario.selectOptions(await combo(2), '5');
    await usuario.selectOptions(await combo(3), 'eliminada');
    await usuario.selectOptions(await combo(1), 'JUNAEB');
    await usuario.click(await screen.findByLabelText('Solo con comentario'));
    await waitFor(() => expect(api.consultarOpinionesDetalle).toHaveBeenLastCalledWith(expect.objectContaining({ estrellas: '5', estado: 'eliminada', categoria: 'JUNAEB', con_comentario: true })));
    await screen.findByText('Opiniones de los estudiantes');
    await usuario.click(await screen.findByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() => expect(api.consultarOpinionesDetalle).toHaveBeenLastCalledWith(expect.objectContaining({ estrellas: '', estado: '', con_comentario: false })));
  });

  it('al cambiar un filtro mantiene la página montada y marca que se está actualizando', async () => {
    const usuario = userEvent.setup();
    render(<OpinionesPanel />);
    const combo = (await screen.findAllByRole('combobox'))[2];
    let resolver;
    api.consultarOpinionesDetalle.mockImplementationOnce(() => new Promise((r) => { resolver = r; }));
    await usuario.selectOptions(combo, '5');
    expect(combo).toBeInTheDocument();
    expect(combo).toHaveValue('5');
    expect(screen.queryByText('Cargando opiniones…')).not.toBeInTheDocument();
    const resultados = document.querySelector('.opiniones-resultados');
    expect(resultados).toHaveClass('actualizando');
    expect(resultados).toHaveAttribute('aria-busy', 'true');
    resolver(DETALLE);
    await waitFor(() => expect(resultados).not.toHaveClass('actualizando'));
    expect(resultados).toHaveAttribute('aria-busy', 'false');
    expect((await screen.findAllByRole('combobox'))[2]).toBe(combo);
  });

  it('en favoritos, cambiar el filtro tampoco desmonta la página', async () => {
    const usuario = userEvent.setup();
    render(<OpinionesPanel />);
    await usuario.click(await screen.findByRole('button', { name: /Favoritos/ }));
    const combo = (await screen.findAllByRole('combobox'))[0];
    let resolver;
    api.consultarFavoritosDetalle.mockImplementationOnce(() => new Promise((r) => { resolver = r; }));
    await usuario.selectOptions(combo, '2');
    expect(screen.queryByText('Cargando favoritos…')).not.toBeInTheDocument();
    expect(document.querySelector('.opiniones-resultados')).toHaveClass('actualizando');
    resolver({ resumen: { total: 5, estudiantes: 3, preparaciones: 1 }, por_preparacion: [{ id_preparacion: 2, nombre: 'Flan', total: 5 }], favoritos: [] });
    await waitFor(() => expect(document.querySelector('.opiniones-resultados')).not.toHaveClass('actualizando'));
    expect(screen.getAllByRole('combobox')[0]).toBe(combo);
  });

  it('tocar el nombre de un plato filtra por ese plato', async () => {
    const usuario = userEvent.setup();
    render(<OpinionesPanel />);
    await usuario.click((await screen.findAllByRole('button', { name: 'Flan' }))[0]);
    await waitFor(() => expect(api.consultarOpinionesDetalle).toHaveBeenLastCalledWith(expect.objectContaining({ id_preparacion: '2' })));
  });

  it('abre los promedios por preparación y los favoritos más marcados', async () => {
    const usuario = userEvent.setup();
    render(<OpinionesPanel />);
    await usuario.click(await screen.findByRole('button', { name: /Promedio por preparación y favoritos/ }));
    expect(screen.getByText('Calificación promedio (solo opiniones vigentes)')).toBeInTheDocument();
    expect(screen.getByText('Flan:', { exact: false })).toHaveTextContent('Flan: 5');
  });

  it('sin resultados lo explica', async () => {
    api.consultarOpinionesDetalle.mockResolvedValue({ ...DETALLE, opiniones: [] });
    render(<OpinionesPanel />);
    expect(await screen.findByText('No hay opiniones con estos filtros.')).toBeInTheDocument();
  });

  it('la vista de favoritos muestra quién marcó cada plato y filtra', async () => {
    const usuario = userEvent.setup();
    render(<OpinionesPanel />);
    await usuario.click(await screen.findByRole('button', { name: /Favoritos/ }));
    expect(await screen.findByText('Favoritos de los estudiantes')).toBeInTheDocument();
    expect(screen.getByText('an.p@duocuc.cl')).toBeInTheDocument();
    expect(screen.getByText('16/11/2026')).toBeInTheDocument();
    await usuario.click(within(screen.getByText('Más marcadas como favoritas').closest('section')).getByRole('button', { name: 'Flan' }));
    await waitFor(() => expect(api.consultarFavoritosDetalle).toHaveBeenLastCalledWith(expect.objectContaining({ id_preparacion: '2' })));
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await usuario.click(screen.getByRole('button', { name: /Exportar/ }));
    expect(screen.getByRole('dialog', { name: 'Exportar' })).toHaveTextContent('opiniones');
  });

  it('si falla la carga ofrece reintentar y vuelve a consultar', async () => {
    api.consultarOpinionesDetalle.mockRejectedValueOnce(Object.assign(new Error('caído'), { estado: 500 }));
    const usuario = userEvent.setup();
    render(<OpinionesPanel />);
    await usuario.click(await screen.findByRole('button', { name: /Reintentar|Intentar/i }));
    expect(await screen.findByText('Opiniones de los estudiantes')).toBeInTheDocument();
  });

  it('un filtro que llega desde Análisis se aplica una vez', async () => {
    const onFiltroAplicado = vi.fn();
    render(<OpinionesPanel filtroInicial={{ id_preparacion: 2 }} onFiltroAplicado={onFiltroAplicado} />);
    await waitFor(() => expect(api.consultarOpinionesDetalle).toHaveBeenLastCalledWith(expect.objectContaining({ id_preparacion: '2' })));
    expect(onFiltroAplicado).toHaveBeenCalledTimes(1);
  });
});
