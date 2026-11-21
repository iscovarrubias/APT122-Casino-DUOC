import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

vi.mock('../api/gestion', () => ({
  iniciarSesionApi: vi.fn(),
  consultarSesion: vi.fn(),
  iniciarSesionDuoc: vi.fn(),
  canjearTicketMicrosoft: vi.fn(),
}));
vi.mock('../api/cliente', () => ({ configurarCliente: vi.fn() }));
vi.mock('../utils/tema', () => ({ aplicarTema: vi.fn() }));

import * as api from '../api/gestion';
import { configurarCliente } from '../api/cliente';
import { aplicarTema } from '../utils/tema';
import AuthProvider from './AuthProvider';
import { useAuth } from './auth-context';

const espia = { auth: null };
function Espia() {
  const a = useAuth();
  useEffect(() => {
    espia.auth = a;
  });
  return <p>{a.cargando ? 'cargando' : a.usuario ? `hola ${a.usuario.nombre}${a.kiosco ? ' (kiosco)' : ''}` : 'sin sesión'}</p>;
}
const montar = () =>
  render(
    <AuthProvider>
      <Espia />
    </AuthProvider>
  );
const ADMIN = { id_usuario: 1, nombre: 'Isa', rol: 'Administrador', tema_preferido: 'oscuro' };
const guardada = () => JSON.parse(localStorage.getItem('casino_sesion'));

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('sin sesión guardada termina de cargar sin consultar al servidor', async () => {
    montar();
    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
    expect(api.consultarSesion).not.toHaveBeenCalled();
  });

  it('con una sesión guardada la valida con el servidor y aplica el tema preferido', async () => {
    localStorage.setItem('casino_sesion', JSON.stringify({ token: 'tok', usuario: { nombre: 'viejo' }, kiosco: true }));
    api.consultarSesion.mockResolvedValue({ usuario: ADMIN });
    montar();
    expect(screen.getByText('cargando')).toBeInTheDocument();
    expect(await screen.findByText('hola Isa (kiosco)')).toBeInTheDocument();
    expect(configurarCliente).toHaveBeenCalledWith({ token: 'tok' });
    expect(aplicarTema).toHaveBeenCalledWith('oscuro');
  });

  it('si el token guardado ya no sirve, borra la sesión', async () => {
    localStorage.setItem('casino_sesion', JSON.stringify({ token: 'vencido' }));
    api.consultarSesion.mockRejectedValue(new Error('401'));
    montar();
    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
    expect(localStorage.getItem('casino_sesion')).toBe(null);
    expect(configurarCliente).toHaveBeenCalledWith({ token: null });
  });

  it('una sesión guardada corrupta no rompe la aplicación', async () => {
    localStorage.setItem('casino_sesion', '{esto no es json');
    montar();
    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
  });

  it('iniciar sesión guarda el token y el modo kiosco', async () => {
    api.iniciarSesionApi.mockResolvedValue({ token: 'nuevo', usuario: ADMIN, kiosco: true });
    montar();
    await screen.findByText('sin sesión');
    await act(() => espia.auth.iniciarSesion('is@duocuc.cl', 'Clave1234', true));
    expect(api.iniciarSesionApi).toHaveBeenCalledWith('is@duocuc.cl', 'Clave1234', true);
    expect(screen.getByText('hola Isa (kiosco)')).toBeInTheDocument();
    expect(guardada()).toMatchObject({ token: 'nuevo', kiosco: true });
    expect(configurarCliente).toHaveBeenCalledWith({ token: 'nuevo' });
  });

  it('un error al iniciar sesión no deja una sesión a medias', async () => {
    api.iniciarSesionApi.mockRejectedValue(new Error('Correo o contraseña incorrectos.'));
    montar();
    await screen.findByText('sin sesión');
    await expect(espia.auth.iniciarSesion('x@duocuc.cl', 'mala')).rejects.toThrow('incorrectos');
    expect(screen.getByText('sin sesión')).toBeInTheDocument();
    expect(localStorage.getItem('casino_sesion')).toBe(null);
  });

  it('el acceso DUOC nunca queda en modo kiosco', async () => {
    api.iniciarSesionDuoc.mockResolvedValue({ token: 'est', usuario: { nombre: 'Ana', rol: 'Estudiante' }, kiosco: true });
    montar();
    await screen.findByText('sin sesión');
    await act(() => espia.auth.iniciarSesionDuoc('an@duocuc.cl'));
    expect(screen.getByText('hola Ana')).toBeInTheDocument();
    expect(guardada().kiosco).toBe(false);
  });

  it('el ticket de Microsoft se canjea por una sesión', async () => {
    api.canjearTicketMicrosoft.mockResolvedValue({
      token: 'ms',
      usuario: { nombre: 'Diego', rol: 'Nutricionista', tema_preferido: 'claro' },
    });
    montar();
    await screen.findByText('sin sesión');
    await act(() => espia.auth.iniciarConTicket('ticket-1'));
    expect(api.canjearTicketMicrosoft).toHaveBeenCalledWith('ticket-1');
    expect(screen.getByText('hola Diego')).toBeInTheDocument();
    expect(aplicarTema).toHaveBeenCalledWith('claro');
  });

  it('cerrar sesión borra todo y el cliente avisa al recibir un 401', async () => {
    api.iniciarSesionApi.mockResolvedValue({ token: 'nuevo', usuario: ADMIN, kiosco: false });
    montar();
    await screen.findByText('sin sesión');
    await act(() => espia.auth.iniciarSesion('is@duocuc.cl', 'Clave1234'));
    const { alSesionInvalida } = configurarCliente.mock.calls.find((c) => c[0].alSesionInvalida)[0];
    act(() => alSesionInvalida());
    await waitFor(() => expect(screen.getByText('sin sesión')).toBeInTheDocument());
    expect(localStorage.getItem('casino_sesion')).toBe(null);
  });

  it('useAuth fuera del proveedor avisa del error de programación', () => {
    const original = console.error;
    console.error = () => {};
    expect(() => render(<Espia />)).toThrow('useAuth debe usarse dentro de AuthProvider.');
    console.error = original;
  });
});
