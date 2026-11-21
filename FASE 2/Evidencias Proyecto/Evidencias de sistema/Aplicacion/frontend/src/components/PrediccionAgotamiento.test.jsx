import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PrediccionAgotamiento from './PrediccionAgotamiento';

describe('PrediccionAgotamiento', () => {
  it('no muestra nada sin estimación o si ya está agotado', () => {
    const { container, rerender } = render(<PrediccionAgotamiento categoria="General" estimacion={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PrediccionAgotamiento categoria="General" estimacion={{ estado: 'agotado' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('el reloj muestra la hora estimada al pulsarlo', async () => {
    render(<PrediccionAgotamiento categoria="General" estimacion={{ estado: 'se_agota', hora: '13:20' }} />);
    const reloj = screen.getByRole('button', { name: 'Hora estimada de agotamiento del menú General' });
    expect(reloj).toHaveAttribute('aria-expanded', 'false');
    act(() => reloj.focus());
    const globo = screen.getByRole('tooltip');
    expect(globo).toHaveTextContent('Se agotaría cerca de las 13:20');
    expect(globo).toHaveTextContent('Es una estimación y se actualiza con cada venta.');
    expect(globo).not.toHaveTextContent('Según');
  });

  it('si alcanza hasta el cierre lo dice', async () => {
    render(<PrediccionAgotamiento categoria="Vegetariano" estimacion={{ estado: 'alcanza' }} />);
    act(() => screen.getByRole('button', { name: /Vegetariano/ }).focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent('Debería alcanzar hasta el cierre');
  });

  it('se distingue visualmente cuando se agotaría', () => {
    const { container } = render(<PrediccionAgotamiento categoria="General" estimacion={{ estado: 'se_agota', hora: '13:20' }} />);
    expect(container.querySelector('.prediccion-agotamiento--pronto')).not.toBeNull();
  });
});
