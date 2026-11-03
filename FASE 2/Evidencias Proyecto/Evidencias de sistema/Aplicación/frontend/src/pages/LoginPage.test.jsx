import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({
  identificarCorreo: vi.fn(),
  urlInicioMicrosoft: (email) => `http://api.test/microsoft/inicio?login_hint=${encodeURIComponent(email)}`,
}));
vi.mock('../context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../ruteo/useRuta', () => ({ navegar: vi.fn() }));

import { identificarCorreo } from '../api/gestion';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import LoginPage from './LoginPage';

const iniciarSesion = vi.fn();
const iniciarSesionDuoc = vi.fn();

async function escribirCorreo(correo) {
  await userEvent.type(screen.getByLabelText('Correo'), correo);
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAuth.mockReturnValue({ iniciarSesion, iniciarSesionDuoc });
  });

  it('pide solo el correo al comienzo', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
  });

  it('pide contraseña cuando el correo es de personal e ingresa al panel', async () => {
    identificarCorreo.mockResolvedValue({ metodo: 'clave' });
    iniciarSesion.mockResolvedValue({ usuario: { rol: 'Administrador' }, kiosco: false });
    render(<LoginPage />);
    await escribirCorreo('admin@duocuc.cl');
    await userEvent.type(await screen.findByLabelText('Contraseña'), 'secreto123');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(iniciarSesion).toHaveBeenCalledWith('admin@duocuc.cl', 'secreto123', false));
    expect(navegar).toHaveBeenCalledWith('/panel/preparaciones');
  });

  it('ofrece continuar con Microsoft cuando corresponde', async () => {
    identificarCorreo.mockResolvedValue({ metodo: 'microsoft' });
    render(<LoginPage />);
    await escribirCorreo('alumno@duocuc.cl');
    const enlace = await screen.findByRole('link', { name: 'Continuar con Microsoft' });
    expect(enlace).toHaveAttribute('href', 'http://api.test/microsoft/inicio?login_hint=alumno%40duocuc.cl');
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
  });

  it('entra directo como estudiante en el modo de demostración', async () => {
    identificarCorreo.mockResolvedValue({ metodo: 'duoc' });
    iniciarSesionDuoc.mockResolvedValue({});
    render(<LoginPage />);
    await escribirCorreo('alumno@duocuc.cl');
    await userEvent.click(await screen.findByRole('button', { name: 'Ingresar con mi cuenta DUOC' }));
    await waitFor(() => expect(navegar).toHaveBeenCalledWith('/'));
  });

  it('muestra el mensaje de error del servidor', async () => {
    identificarCorreo.mockRejectedValue(new Error('Usa tu correo institucional (@duocuc.cl).'));
    render(<LoginPage />);
    await escribirCorreo('alguien@gmail.com');
    expect(await screen.findByText('Usa tu correo institucional (@duocuc.cl).')).toBeInTheDocument();
  });

  it('permite cambiar de correo después de identificarlo', async () => {
    identificarCorreo.mockResolvedValue({ metodo: 'clave' });
    render(<LoginPage />);
    await escribirCorreo('admin@duocuc.cl');
    await userEvent.click(await screen.findByTitle('Usar otro correo'));
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
  });

  it('muestra el error que dejó la vuelta desde Microsoft', () => {
    sessionStorage.setItem('casino_login_error', 'Cancelaste el inicio de sesión con Microsoft.');
    render(<LoginPage />);
    expect(screen.getByText('Cancelaste el inicio de sesión con Microsoft.')).toBeInTheDocument();
  });
});
