import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaError from './PaginaError';
import { infoError } from '../utils/errores';

describe('PaginaError', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('muestra el 404 con el botón de volver al menú', async () => {
    render(<PaginaError codigo={404} rutaInicio="/otra" />);
    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¡Ups! Parece que este plato no está en el menú.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Ir al Menú Principal/ }));
    expect(window.location.hash).toBe('#/otra');
  });

  it('en el 401 ofrece iniciar sesión', async () => {
    render(<PaginaError codigo={401} />);
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));
    expect(window.location.hash).toBe('#/login');
  });

  it('en errores del servidor ofrece reintentar y llama a la función indicada', async () => {
    const alReintentar = vi.fn();
    render(<PaginaError codigo={503} onReintentar={alReintentar} />);
    expect(screen.getByText('Servicio no disponible por ahora')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(alReintentar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('el código 0 es "sin conexión" y no muestra "Error 0"', () => {
    render(<PaginaError codigo={0} compacta />);
    expect(screen.getByText('No pudimos conectar con el servidor')).toBeInTheDocument();
    expect(screen.queryByText(/Error 0/)).not.toBeInTheDocument();
  });

  it('permite cambiar el texto y no muestra detalle técnico', () => {
    render(<PaginaError codigo={500} titulo="Algo salió mal" mensaje="Texto propio" detalle="TypeError: x is undefined" />);
    expect(screen.getByText('Texto propio')).toBeInTheDocument();
    expect(screen.queryByText('TypeError: x is undefined')).not.toBeInTheDocument();
    expect(screen.queryByText('Detalle técnico')).not.toBeInTheDocument();
  });

  it('un código desconocido usa un mensaje genérico según su rango', () => {
    render(<PaginaError codigo={418} />);
    expect(screen.getByText('Error 418')).toBeInTheDocument();
    expect(screen.getByText('No pudimos procesar tu solicitud')).toBeInTheDocument();
  });
});

describe('infoError', () => {
  it('cubre cada código usado por el sistema', () => {
    for (const c of [0, 400, 401, 403, 404, 408, 409, 413, 429, 500, 502, 503, 504]) {
      expect(infoError(c).titulo).toBeTruthy();
    }
  });

  it('los 5xx desconocidos son genéricos del servidor y lo ilegible es genérico', () => {
    expect(infoError(599).tipo).toBe('servidor');
    expect(infoError(undefined).codigo).toBeNull();
    expect(infoError('abc').codigo).toBeNull();
  });
});
