import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/cliente', async (original) => ({ ...(await original()), pedir: vi.fn(async () => ({})) }));
vi.mock('../context/auth-context', () => ({ useAuth: vi.fn(() => ({ usuario: null })) }));

import { pedir } from '../api/cliente';
import { useAuth } from '../context/auth-context';

class EventSourceFalso {
  static CLOSED = 2;
  static instancias = [];
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.oyentes = {};
    this.cerrado = false;
    EventSourceFalso.instancias.push(this);
  }
  addEventListener(tipo, fn) { (this.oyentes[tipo] = this.oyentes[tipo] || []).push(fn); }
  emitir(tipo) { (this.oyentes[tipo] || []).forEach((fn) => fn()); }
  close() { this.cerrado = true; this.readyState = 2; }
}

describe('eventos en tiempo real', () => {
  let suscribirCambios;
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    EventSourceFalso.instancias = [];
    globalThis.EventSource = EventSourceFalso;
    ({ suscribirCambios } = await import('./eventos'));
  });
  afterEach(() => { vi.useRealTimers(); delete globalThis.EventSource; });

  it('abre una sola conexión aunque haya varias pantallas suscritas', () => {
    const a = suscribirCambios(() => {});
    const b = suscribirCambios(() => {});
    expect(EventSourceFalso.instancias).toHaveLength(1);
    expect(EventSourceFalso.instancias[0].url).toMatch(/\/api\/menu\/eventos$/);
    a(); b();
  });

  it('cada aviso de cambio llega a todos los suscritos', () => {
    const uno = vi.fn();
    const dos = vi.fn();
    const bajas = [suscribirCambios(uno), suscribirCambios(dos)];
    EventSourceFalso.instancias[0].emitir('cambio');
    vi.runAllTimers();
    expect(uno).toHaveBeenCalledTimes(1);
    expect(dos).toHaveBeenCalledTimes(1);
    bajas.forEach((b) => b());
  });

  it('con dispersión los avisos se reparten en el tiempo para no saturar al servidor', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const cb = vi.fn();
    const baja = suscribirCambios(cb, { dispersionMs: 4000 });
    EventSourceFalso.instancias[0].emitir('cambio');
    vi.advanceTimersByTime(1999);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
    baja();
  });

  it('un suscriptor que falla no impide avisar a los demás', () => {
    const sano = vi.fn();
    const bajas = [suscribirCambios(() => { throw new Error('roto'); }), suscribirCambios(sano)];
    EventSourceFalso.instancias[0].emitir('cambio');
    vi.runAllTimers();
    expect(sano).toHaveBeenCalled();
    bajas.forEach((b) => b());
  });

  it('cuando se va el último suscriptor cierra la conexión', () => {
    const baja = suscribirCambios(() => {});
    baja();
    expect(EventSourceFalso.instancias[0].cerrado).toBe(true);
  });

  it('si el servidor corta la conexión reintenta a los 15 segundos', () => {
    const baja = suscribirCambios(() => {});
    const primera = EventSourceFalso.instancias[0];
    primera.readyState = EventSourceFalso.CLOSED;
    primera.emitir('error');
    vi.advanceTimersByTime(14999);
    expect(EventSourceFalso.instancias).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(EventSourceFalso.instancias).toHaveLength(2);
    baja();
  });

  it('si nadie sigue suscrito no reintenta', () => {
    const baja = suscribirCambios(() => {});
    const primera = EventSourceFalso.instancias[0];
    baja();
    primera.readyState = EventSourceFalso.CLOSED;
    primera.emitir('error');
    vi.advanceTimersByTime(30000);
    expect(EventSourceFalso.instancias).toHaveLength(1);
  });
});

describe('pantalla de bienvenida', () => {
  let splash;
  beforeEach(async () => {
    vi.resetModules();
    sessionStorage.clear();
    window.location.hash = '';
    window.matchMedia = vi.fn(() => ({ matches: false }));
    splash = await import('./splash');
  });

  it('se muestra la primera vez en el menú público y no se repite en la misma sesión', () => {
    expect(splash.debeMostrarSplash()).toBe(true);
    splash.marcarSplashVisto();
    expect(splash.debeMostrarSplash()).toBe(false);
  });

  it('no se muestra en el panel ni en el login', () => {
    window.location.hash = '/panel/caja';
    expect(splash.debeMostrarSplash()).toBe(false);
    window.location.hash = '/login';
    expect(splash.debeMostrarSplash()).toBe(false);
  });

  it('respeta a quien pidió reducir las animaciones', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    expect(splash.debeMostrarSplash()).toBe(false);
  });

  it('si el navegador bloquea el almacenamiento no rompe la página', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(splash.debeMostrarSplash()).toBe(false);
    expect(() => splash.marcarSplashVisto()).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe('tema claro y oscuro', () => {
  let tema;
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.dataset.theme = '';
    pedir.mockClear();
    tema = await import('./tema');
  });

  function Boton() {
    const { esOscuro, alternar } = tema.useTema();
    return <button type="button" onClick={alternar}>{esOscuro ? 'oscuro' : 'claro'}</button>;
  }

  it('parte en claro y recuerda el oscuro entre visitas', async () => {
    render(<Boton />);
    expect(screen.getByRole('button')).toHaveTextContent('claro');
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('oscuro');
    expect(document.documentElement.dataset.theme).toBe('oscuro');
    expect(localStorage.getItem('casino_tema')).toBe('oscuro');
  });

  it('sin sesión no guarda la preferencia en el servidor', async () => {
    render(<Boton />);
    await userEvent.click(screen.getByRole('button'));
    expect(pedir).not.toHaveBeenCalled();
  });

  it('con sesión guarda la preferencia en la cuenta', async () => {
    useAuth.mockReturnValue({ usuario: { id_usuario: 1 } });
    render(<Boton />);
    await userEvent.click(screen.getByRole('button'));
    expect(pedir).toHaveBeenCalledWith('/api/auth/tema', { metodo: 'PATCH', cuerpo: { tema: 'oscuro' } });
    useAuth.mockReturnValue({ usuario: null });
  });

  it('aplicarTema actualiza todas las pantallas abiertas', () => {
    render(<><Boton /><Boton /></>);
    act(() => tema.aplicarTema('oscuro'));
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['oscuro', 'oscuro']);
  });
});

describe('api/menu: consultas públicas', () => {
  let menu;
  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock('../api/cliente');
    menu = await import('../api/menu');
    globalThis.fetch = vi.fn();
  });

  it('arma la consulta del menú del día con categoría y fecha', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ preparaciones: [] }) });
    await menu.obtenerMenuHoy('Vegetariano', '2026-11-20');
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/menu\/hoy\?categoria=Vegetariano&fecha=2026-11-20$/);
    await menu.obtenerHistorialMenu('2026-11-16', '2026-11-20');
    expect(fetch.mock.calls[1][0]).toMatch(/\/api\/menu\/historial\?desde=2026-11-16&hasta=2026-11-20$/);
    await menu.obtenerPreparaciones();
    expect(fetch.mock.calls[2][0]).toMatch(/\/api\/preparaciones$/);
  });

  it('un error del servidor se informa con su código', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(menu.obtenerMenuHoy()).rejects.toMatchObject({ estado: 500, message: 'Error al consultar el menú (500)' });
  });

  it('sin conexión avisa con un mensaje claro', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(menu.obtenerPreparaciones()).rejects.toMatchObject({ estado: 0 });
  });
});
