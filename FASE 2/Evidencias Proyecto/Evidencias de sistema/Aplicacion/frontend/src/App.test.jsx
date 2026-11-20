import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('./context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('./context/AuthProvider', () => ({ default: ({ children }) => children }));
vi.mock('./utils/estudiante', () => ({ EstudianteProvider: ({ children }) => children }));
vi.mock('./utils/splash', () => ({ debeMostrarSplash: () => false, marcarSplashVisto: vi.fn(), SPLASH_DURACION_MS: 0, SPLASH_SALIDA_MS: 0 }));
vi.mock('./components/PanelSidebar', () => ({ default: () => <nav>menú lateral</nav> }));
vi.mock('./pages/VistaPublica', () => ({ default: () => <p>Página menú público</p> }));
vi.mock('./pages/LoginPage', () => ({ default: () => <p>Página login</p> }));
vi.mock('./pages/AccesoPage', () => ({ default: () => <p>Página acceso</p> }));
vi.mock('./pages/CajaPage', () => ({ default: () => <p>Página caja</p> }));
vi.mock('./pages/KioscoPage', () => ({ default: () => <p>Página disponibilidad</p> }));
vi.mock('./pages/PlanificacionPage', () => ({ default: () => <p>Página planificación</p> }));
vi.mock('./pages/IngredientesPage', () => ({ default: () => <p>Página ingredientes</p> }));
vi.mock('./pages/PreparacionesPage', () => ({ default: () => <p>Página preparaciones</p> }));
vi.mock('./pages/UsuariosPage', () => ({ default: () => <p>Página usuarios</p> }));
vi.mock('./pages/AnalisisPage', () => ({ default: () => <p>Página análisis</p> }));

import { useAuth } from './context/auth-context';
import App from './App';

const sesion = (rol, extra = {}) => useAuth.mockReturnValue({ usuario: rol ? { nombre: 'Prueba', rol } : null, kiosco: false, cargando: false, ...extra });
const ir = (ruta) => { window.location.hash = ruta; };

describe('App: guardias de ruta del panel', () => {
  beforeEach(() => { vi.clearAllMocks(); ir('/'); });

  it('sin sesión, cualquier ruta del panel lleva al login', async () => {
    sesion(null);
    ir('/panel/usuarios');
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe('#/login'));
  });

  it('mientras se comprueba la sesión no muestra el panel', () => {
    sesion(null, { cargando: true });
    ir('/panel/usuarios');
    render(<App />);
    expect(screen.queryByText('Página usuarios')).not.toBeInTheDocument();
    expect(screen.getByText(/Comprobando tu sesión/)).toBeInTheDocument();
  });

  it('un estudiante que escribe la ruta del panel vuelve al menú público', async () => {
    sesion('Estudiante');
    ir('/panel/analisis');
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe('#/'));
  });

  it('el cajero solo puede estar en la caja', async () => {
    sesion('Cajero');
    ir('/panel/usuarios');
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe('#/panel/caja'));
  });

  it('en modo kiosco el personal queda fijo en Disponibilidad', async () => {
    sesion('Personal Casino', { kiosco: true });
    ir('/panel/menu');
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe('#/panel/kiosco'));
  });

  it('la nutricionista no ve Usuarios: aparece un 403 dentro del panel', async () => {
    sesion('Nutricionista');
    ir('/panel/usuarios');
    render(<App />);
    expect(await screen.findByText(/no tiene acceso a esta sección/)).toBeInTheDocument();
    expect(screen.queryByText('Página usuarios')).not.toBeInTheDocument();
  });

  it('el administrador entra a Usuarios', async () => {
    sesion('Administrador');
    ir('/panel/usuarios');
    render(<App />);
    expect(await screen.findByText('Página usuarios')).toBeInTheDocument();
    expect(document.title).toBe('Usuarios - Casinos DUOC UC');
  });

  it('una ruta del panel que no existe lleva a la página inicial del rol', async () => {
    sesion('Nutricionista');
    ir('/panel/inventada');
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe('#/panel/menu'));
  });

  it('con sesión iniciada, el login redirige al panel', async () => {
    sesion('Administrador');
    ir('/login');
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe('#/panel/menu'));
  });

  it('una ruta pública inexistente muestra la página 404', () => {
    sesion(null);
    ir('/no-existe');
    render(<App />);
    expect(document.title).toBe('Página no encontrada - Casinos DUOC UC');
  });

  it('la raíz muestra el menú público sin pedir sesión', () => {
    sesion(null);
    render(<App />);
    expect(screen.getByText('Página menú público')).toBeInTheDocument();
  });
});
