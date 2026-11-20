import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecetaModal from './RecetaModal';

const BUDIN = {
  id_preparacion: 7, nombre: 'Budín de Zapallitos', tipo: 'Plato Principal', activa: true, porciones_receta: 10,
  descripcion: 'Budín gratinado.', base_nombre: null,
  ingredientes_detalle: [
    { id_ingrediente: 1, nombre: 'Zapallito italiano', cantidad_g: 2500 },
    { id_ingrediente: 2, nombre: 'Queso', cantidad_g: 300 },
    { id_ingrediente: 3, nombre: 'Sal', cantidad_g: null },
  ],
  alergenos: ['Lácteos', 'Huevo'],
  nutricion: { calorias: 380, proteinas_g: 18, carbohidratos_g: 35, grasas_g: 18 },
};

describe('RecetaModal', () => {
  it('muestra ingredientes con cantidades, alérgenos y nutrición', () => {
    render(<RecetaModal preparacion={BUDIN} puedeCrearVariacion={false} onCrearVariacion={vi.fn()} onCerrar={vi.fn()} />);
    expect(screen.getByText('Zapallito italiano')).toBeInTheDocument();
    expect(screen.getByText('2.500 g')).toBeInTheDocument();
    expect(screen.getByText('Sin cantidad')).toBeInTheDocument();
    expect(screen.getByText('Lácteos')).toBeInTheDocument();
    expect(screen.getByText('380 kcal')).toBeInTheDocument();
    expect(screen.getByText(/receta para 10 porciones/)).toBeInTheDocument();
  });

  it('sin permiso no ofrece crear variación', () => {
    render(<RecetaModal preparacion={BUDIN} puedeCrearVariacion={false} onCrearVariacion={vi.fn()} onCerrar={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Crear variación' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cerrar' }).length).toBeGreaterThan(0);
  });

  it('con permiso, crear variación entrega la receta original', async () => {
    const onCrearVariacion = vi.fn();
    render(<RecetaModal preparacion={BUDIN} puedeCrearVariacion onCrearVariacion={onCrearVariacion} onCerrar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear variación' }));
    expect(onCrearVariacion).toHaveBeenCalledWith(BUDIN);
  });

  it('indica de qué plato es variación', () => {
    render(<RecetaModal preparacion={{ ...BUDIN, nombre: 'Budín sin queso', base_nombre: 'Budín de Zapallitos' }} puedeCrearVariacion={false} onCrearVariacion={vi.fn()} onCerrar={vi.fn()} />);
    expect(screen.getByText('Variación de Budín de Zapallitos')).toBeInTheDocument();
  });
});
