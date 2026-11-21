import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../ruteo/useRuta', () => ({ navegar: vi.fn() }));
vi.mock('../utils/tema', () => ({ useTema: vi.fn() }));

import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { useTema } from '../utils/tema';
import PanelSidebar from './PanelSidebar';
import Sidebar from './Sidebar';
import AccesoPage from '../pages/AccesoPage';

const sesion = (rol, extra = {}) => ({
  usuario: rol ? { nombre: 'Isabella Covarrubias', rol } : null,
  kiosco: false,
  cerrarSesion: vi.fn(),
  iniciarConTicket: vi.fn(),
  ...extra,
});

describe('PanelSidebar', () => {
  let alternar;
  beforeEach(() => {
    vi.clearAllMocks();
    alternar = vi.fn();
    useTema.mockReturnValue({ esOscuro: false, alternar });
  });

  it('saluda por el primer nombre y muestra solo las secciones del rol', () => {
    useAuth.mockReturnValue(sesion('Nutricionista'));
    render(<PanelSidebar ruta="/panel/menu" />);
    expect(screen.getAllByText('¡Hola, Isabella!').length).toBeGreaterThan(0);
    const nav = screen.getByRole('navigation', { name: 'Secciones del panel' });
    const secciones = within(nav)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'));
    expect(secciones).toEqual(['Planificación del menú', 'Preparaciones', 'Ingredientes', 'Análisis']);
    expect(within(nav).getByRole('button', { name: 'Planificación del menú' })).toHaveAttribute('aria-current', 'page');
  });

  it('el administrador ve todas las secciones', () => {
    useAuth.mockReturnValue(sesion('Administrador'));
    render(<PanelSidebar ruta="/panel/usuarios" />);
    expect(within(screen.getByRole('navigation', { name: 'Secciones del panel' })).getAllByRole('button')).toHaveLength(6);
  });

  it('en modo kiosco no muestra el menú de secciones', () => {
    useAuth.mockReturnValue(sesion('Personal Casino', { kiosco: true }));
    render(<PanelSidebar ruta="/panel/kiosco" />);
    expect(screen.queryByRole('navigation', { name: 'Secciones del panel' })).not.toBeInTheDocument();
  });

  it('cambiar de sección navega a esa ruta', async () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    useAuth.mockReturnValue(sesion('Administrador'));
    render(<PanelSidebar ruta="/panel/menu" />);
    await userEvent.click(screen.getByRole('button', { name: 'Análisis' }));
    expect(navegar).toHaveBeenCalledWith('/panel/analisis');
  });

  it('cerrar sesión limpia la sesión y vuelve al menú público', async () => {
    const s = sesion('Administrador');
    useAuth.mockReturnValue(s);
    render(<PanelSidebar ruta="/panel/menu" />);
    await userEvent.click(screen.getAllByRole('button', { name: /Cerrar sesión/ })[0]);
    expect(s.cerrarSesion).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('la hoja de configuración del celular cambia el tema y se cierra al tocar fuera', async () => {
    useAuth.mockReturnValue(sesion('Administrador'));
    const usuario = userEvent.setup();
    render(<PanelSidebar ruta="/panel/menu" />);
    await usuario.click(screen.getByRole('button', { name: 'Abrir configuración' }));
    const hoja = screen.getByRole('dialog', { name: 'Configuración' });
    await usuario.click(within(hoja).getByRole('button', { name: 'Cambiar a modo oscuro' }));
    expect(alternar).toHaveBeenCalled();
    await usuario.click(hoja.parentElement);
    expect(screen.queryByRole('dialog', { name: 'Configuración' })).not.toBeInTheDocument();
  });

  it('en modo oscuro usa el logo claro y ofrece volver al modo claro', () => {
    useTema.mockReturnValue({ esOscuro: true, alternar });
    useAuth.mockReturnValue(sesion('Administrador'));
    render(<PanelSidebar ruta="/panel/menu" />);
    expect(screen.getAllByRole('img', { name: 'Casinos DuocUC' }).map((i) => i.getAttribute('src'))).toContain('/logooscuro.svg');
    expect(screen.getAllByRole('button', { name: 'Cambiar a modo claro' }).length).toBeGreaterThan(0);
  });
});

describe('Sidebar del menú público', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTema.mockReturnValue({ esOscuro: false, alternar: vi.fn() });
    window.matchMedia = vi.fn(() => ({ matches: true }));
  });

  it('sin sesión invita a iniciar sesión', async () => {
    useAuth.mockReturnValue(sesion(null));
    render(<Sidebar vistaActiva="diario" onCambiarVista={() => {}} onAbrirPerfil={() => {}} />);
    expect(screen.getAllByText('Menú del casino').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));
    expect(navegar).toHaveBeenCalledWith('/login');
  });

  it('un estudiante puede abrir su perfil', async () => {
    const onAbrirPerfil = vi.fn();
    useAuth.mockReturnValue(sesion('Estudiante'));
    render(<Sidebar vistaActiva="diario" onCambiarVista={() => {}} onAbrirPerfil={onAbrirPerfil} />);
    expect(screen.getAllByText('Sede Valparaíso').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /Mi perfil/ }));
    expect(onAbrirPerfil).toHaveBeenCalled();
  });

  it('el personal tiene un acceso directo a su panel', async () => {
    useAuth.mockReturnValue(sesion('Cajero'));
    render(<Sidebar vistaActiva="diario" onCambiarVista={() => {}} onAbrirPerfil={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Ir al panel/ }));
    expect(navegar).toHaveBeenCalledWith('/panel/caja');
  });

  it('cambia entre menú diario, semanal y preguntas', async () => {
    const onCambiarVista = vi.fn();
    useAuth.mockReturnValue(sesion(null));
    render(<Sidebar vistaActiva="diario" onCambiarVista={onCambiarVista} onAbrirPerfil={() => {}} />);
    expect(screen.getByRole('button', { name: /Menú diario/ })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: /Semanal/ }));
    expect(onCambiarVista).toHaveBeenCalledWith('semanal');
  });

  it('desde la hoja del celular se llega al centro de ayuda', async () => {
    const onCambiarVista = vi.fn();
    useAuth.mockReturnValue(sesion('Estudiante'));
    const usuario = userEvent.setup();
    render(<Sidebar vistaActiva="diario" onCambiarVista={onCambiarVista} onAbrirPerfil={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Abrir configuración' }));
    await usuario.click(within(screen.getByRole('dialog', { name: 'Configuración' })).getByRole('button', { name: /Centro de ayuda/ }));
    expect(onCambiarVista).toHaveBeenCalledWith('preguntas');
    expect(screen.queryByRole('dialog', { name: 'Configuración' })).not.toBeInTheDocument();
  });

  it('la animación de cambio de sección espera la salida de la página', async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn(() => ({ matches: false }));
    const pagina = document.createElement('div');
    pagina.className = 'pagina';
    document.body.appendChild(pagina);
    const onCambiarVista = vi.fn();
    useAuth.mockReturnValue(sesion(null));
    render(<Sidebar vistaActiva="diario" onCambiarVista={onCambiarVista} onAbrirPerfil={() => {}} />);
    act(() => {
      screen.getByRole('button', { name: /Semanal/ }).click();
    });
    expect(pagina.classList.contains('saliendo')).toBe(true);
    expect(onCambiarVista).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onCambiarVista).toHaveBeenCalledWith('semanal');
    pagina.remove();
    vi.useRealTimers();
  });
});

describe('AccesoPage: vuelta desde Microsoft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
  });

  it('canjea el ticket y lleva al personal a su panel', async () => {
    const s = sesion(null, { iniciarConTicket: vi.fn(async () => ({ usuario: { rol: 'Nutricionista' }, kiosco: false })) });
    useAuth.mockReturnValue(s);
    window.location.hash = '/acceso?ticket=abc123';
    render(<AccesoPage />);
    await waitFor(() => expect(navegar).toHaveBeenCalledWith('/panel/menu'));
    expect(s.iniciarConTicket).toHaveBeenCalledWith('abc123');
  });

  it('un estudiante vuelve al menú público', async () => {
    useAuth.mockReturnValue(sesion(null, { iniciarConTicket: vi.fn(async () => ({ usuario: { rol: 'Estudiante' } })) }));
    window.location.hash = '/acceso?ticket=t';
    render(<AccesoPage />);
    await waitFor(() => expect(navegar).toHaveBeenCalledWith('/'));
  });

  it('si Microsoft devuelve un error lo explica en el login', async () => {
    useAuth.mockReturnValue(sesion(null));
    window.location.hash = '/acceso?error=cuenta_no_permitida';
    render(<AccesoPage />);
    await waitFor(() => expect(navegar).toHaveBeenCalledWith('/login'));
    expect(sessionStorage.getItem('casino_login_error')).toMatch(/@duocuc\.cl/);
  });

  it('sin ticket ni error usa un mensaje genérico', async () => {
    useAuth.mockReturnValue(sesion(null));
    window.location.hash = '/acceso';
    render(<AccesoPage />);
    await waitFor(() => expect(navegar).toHaveBeenCalledWith('/login'));
    expect(sessionStorage.getItem('casino_login_error')).toMatch(/No pudimos completar/);
  });

  it('si el canje falla muestra el motivo del servidor', async () => {
    useAuth.mockReturnValue(
      sesion(null, {
        iniciarConTicket: vi.fn(async () => {
          throw new Error('El ticket ya fue usado.');
        }),
      })
    );
    window.location.hash = '/acceso?ticket=viejo';
    render(<AccesoPage />);
    await waitFor(() => expect(sessionStorage.getItem('casino_login_error')).toBe('El ticket ya fue usado.'));
  });
});
