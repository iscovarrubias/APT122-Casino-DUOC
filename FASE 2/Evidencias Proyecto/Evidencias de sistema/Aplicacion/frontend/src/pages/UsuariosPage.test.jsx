import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({ listarUsuarios: vi.fn(), crearUsuario: vi.fn(), actualizarUsuario: vi.fn(), cambiarClave: vi.fn() }));
vi.mock('../context/auth-context', () => ({ useAuth: () => ({ usuario: { id_usuario: 1, rol: 'Administrador' } }) }));

import * as api from '../api/gestion';
import UsuariosPage from './UsuariosPage';

const YO = { id_usuario: 1, nombre: 'Isabella Admin', email: 'is.admin@duocuc.cl', rol: 'Administrador', activo: true };
const CAJERA = { id_usuario: 2, nombre: 'Carla Caja', email: 'ca.caja@duocuc.cl', rol: 'Cajero', activo: true };
const INACTIVO = { id_usuario: 3, nombre: 'Pedro Antiguo', email: 'pe.antiguo@duocuc.cl', rol: 'Personal Casino', activo: false };

const filaDe = async (nombre) => (await screen.findByText(nombre)).closest('tr');

describe('UsuariosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listarUsuarios.mockResolvedValue([YO, CAJERA, INACTIVO]);
  });

  it('lista al personal y marca la cuenta propia', async () => {
    render(<UsuariosPage />);
    expect(await screen.findByText('Carla Caja')).toBeInTheDocument();
    expect(within(await filaDe('Isabella Admin')).getByText('(tú)')).toBeInTheDocument();
    expect(within(await filaDe('Pedro Antiguo')).getByText('Desactivado')).toBeInTheDocument();
  });

  it('no permite cambiarse el rol ni desactivarse a sí misma', async () => {
    render(<UsuariosPage />);
    const fila = await filaDe('Isabella Admin');
    expect(within(fila).getByLabelText('Rol de Isabella Admin')).toBeDisabled();
    expect(within(fila).queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
  });

  it('crea un usuario limpiando espacios del nombre y el correo', async () => {
    api.crearUsuario.mockResolvedValue({});
    const usuario = userEvent.setup();
    render(<UsuariosPage />);
    await screen.findByText('Carla Caja');
    await usuario.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
    const dialogo = screen.getByRole('dialog');
    const [nombre, correo] = within(dialogo).getAllByRole('textbox');
    await usuario.type(nombre, '  Nueva Persona  ');
    await usuario.type(correo, 'nu.persona@duocuc.cl');
    await usuario.type(dialogo.querySelector('input[type="password"]'), 'ClaveSegura1');
    await usuario.selectOptions(within(dialogo).getByRole('combobox'), 'Nutricionista');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }));
    await waitFor(() =>
      expect(api.crearUsuario).toHaveBeenCalledWith({
        nombre: 'Nueva Persona',
        email: 'nu.persona@duocuc.cl',
        password: 'ClaveSegura1',
        rol: 'Nutricionista',
      })
    );
    expect(await screen.findByText('Usuario creado.')).toBeInTheDocument();
  });

  it('si el correo ya existe, el error aparece dentro del formulario y no se pierde lo escrito', async () => {
    api.crearUsuario.mockRejectedValue(new Error('El registro ya existe (valor duplicado).'));
    const usuario = userEvent.setup();
    render(<UsuariosPage />);
    await screen.findByText('Carla Caja');
    await usuario.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
    const dialogo = screen.getByRole('dialog');
    const [nombre, correo] = within(dialogo).getAllByRole('textbox');
    await usuario.type(nombre, 'Repetida');
    await usuario.type(correo, 'ca.caja@duocuc.cl');
    await usuario.type(dialogo.querySelector('input[type="password"]'), 'ClaveSegura1');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }));
    expect(await within(screen.getByRole('dialog')).findByText(/ya existe/)).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getAllByRole('textbox')[0]).toHaveValue('Repetida');
  });

  it('cambia el rol de otra persona', async () => {
    api.actualizarUsuario.mockResolvedValue({});
    const usuario = userEvent.setup();
    render(<UsuariosPage />);
    await usuario.selectOptions(within(await filaDe('Carla Caja')).getByLabelText('Rol de Carla Caja'), 'Personal Casino');
    await waitFor(() => expect(api.actualizarUsuario).toHaveBeenCalledWith(2, { rol: 'Personal Casino' }));
    expect(await screen.findByText('Rol actualizado.')).toBeInTheDocument();
  });

  it('desactiva y reactiva cuentas', async () => {
    api.actualizarUsuario.mockResolvedValue({});
    const usuario = userEvent.setup();
    render(<UsuariosPage />);
    await usuario.click(within(await filaDe('Carla Caja')).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(api.actualizarUsuario).toHaveBeenCalledWith(2, { activo: false }));
    await usuario.click(within(await filaDe('Pedro Antiguo')).getByRole('button', { name: 'Reactivar' }));
    await waitFor(() => expect(api.actualizarUsuario).toHaveBeenCalledWith(3, { activo: true }));
  });

  it('cambia la contraseña de otra persona', async () => {
    api.cambiarClave.mockResolvedValue({});
    const usuario = userEvent.setup();
    render(<UsuariosPage />);
    await usuario.click(within(await filaDe('Carla Caja')).getByRole('button', { name: 'Cambiar contraseña' }));
    await usuario.type(screen.getByLabelText('Nueva contraseña de Carla Caja'), 'OtraClave99');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.cambiarClave).toHaveBeenCalledWith(2, 'OtraClave99'));
    expect(await screen.findByText('Contraseña actualizada.')).toBeInTheDocument();
  });

  it('busca por texto y filtra por rol', async () => {
    const usuario = userEvent.setup();
    render(<UsuariosPage />);
    await screen.findByText('Carla Caja');
    await usuario.type(screen.getByLabelText('Buscar usuario'), 'carla');
    await usuario.selectOptions(screen.getByLabelText('Filtrar por rol'), 'Cajero');
    await waitFor(() => expect(api.listarUsuarios).toHaveBeenLastCalledWith('carla', 'Cajero'));
  });

  it('si la lista no carga muestra la página de error con reintento', async () => {
    api.listarUsuarios.mockRejectedValueOnce(Object.assign(new Error('caído'), { estado: 503 }));
    const usuario = userEvent.setup();
    render(<UsuariosPage />);
    const reintentar = await screen.findByRole('button', { name: /Reintentar|Intentar/i });
    api.listarUsuarios.mockResolvedValue([YO]);
    await usuario.click(reintentar);
    expect(await screen.findByText('Isabella Admin')).toBeInTheDocument();
  });

  it('con la lista vacía invita a crear la primera cuenta', async () => {
    api.listarUsuarios.mockResolvedValue([]);
    render(<UsuariosPage />);
    expect(await screen.findByText('Aún no hay usuarios')).toBeInTheDocument();
  });
});
