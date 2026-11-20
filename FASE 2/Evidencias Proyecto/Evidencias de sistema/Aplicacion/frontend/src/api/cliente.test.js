import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pedir, pedirArchivo, configurarCliente, ErrorApi, resolverUrl } from './cliente';

const respuesta = (status, cuerpo) => ({ ok: status < 400, status, json: async () => { if (cuerpo === undefined) throw new Error('sin cuerpo'); return cuerpo; } });

describe('cliente de la API', () => {
  let alSesionInvalida;
  beforeEach(() => {
    alSesionInvalida = vi.fn();
    configurarCliente({ token: null, alSesionInvalida });
    globalThis.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('envía el token y el cuerpo en JSON', async () => {
    configurarCliente({ token: 'abc' });
    fetch.mockResolvedValue(respuesta(200, { ok: true }));
    await pedir('/api/usuarios', { metodo: 'POST', cuerpo: { nombre: 'Ana' } });
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/usuarios$/);
    expect(opciones.method).toBe('POST');
    expect(opciones.headers.Authorization).toBe('Bearer abc');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opciones.body)).toEqual({ nombre: 'Ana' });
  });

  it('no envía el token en rutas públicas', async () => {
    configurarCliente({ token: 'abc' });
    fetch.mockResolvedValue(respuesta(200, {}));
    await pedir('/api/menu/hoy', { conToken: false });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('un GET sin cuerpo no declara Content-Type', async () => {
    fetch.mockResolvedValue(respuesta(200, {}));
    await pedir('/api/menu/hoy');
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });

  it('muestra el mensaje de error que manda el servidor', async () => {
    fetch.mockResolvedValue(respuesta(409, { error: 'La jornada ya está iniciada.' }));
    await expect(pedir('/api/jornada/iniciar', { metodo: 'POST', cuerpo: {} })).rejects.toMatchObject({ message: 'La jornada ya está iniciada.', estado: 409 });
  });

  it('si el servidor no manda JSON igual entrega un error entendible', async () => {
    fetch.mockResolvedValue(respuesta(502));
    const error = await pedir('/api/menu/hoy').catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.message).toBe('Error del servidor (502).');
  });

  it('sin conexión avisa con estado 0', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(pedir('/api/menu/hoy')).rejects.toMatchObject({ estado: 0, message: expect.stringMatching(/conectar/) });
  });

  it('un 401 con sesión iniciada cierra la sesión', async () => {
    configurarCliente({ token: 'vencido' });
    fetch.mockResolvedValue(respuesta(401, { error: 'Token inválido o expirado.' }));
    await expect(pedir('/api/usuarios')).rejects.toThrow();
    expect(alSesionInvalida).toHaveBeenCalledTimes(1);
  });

  it('un 401 al iniciar sesión (sin token) no dispara el cierre de sesión', async () => {
    fetch.mockResolvedValue(respuesta(401, { error: 'Correo o contraseña incorrectos.' }));
    await expect(pedir('/api/auth/login', { metodo: 'POST', cuerpo: {}, conToken: false })).rejects.toThrow('Correo o contraseña incorrectos.');
    expect(alSesionInvalida).not.toHaveBeenCalled();
  });

  it('sube archivos como formulario con el token', async () => {
    configurarCliente({ token: 'abc' });
    fetch.mockResolvedValue(respuesta(201, { imagen_url: '/api/imagenes/1' }));
    const archivo = new File(['x'], 'foto.png', { type: 'image/png' });
    expect(await pedirArchivo('/api/preparaciones/imagen', archivo)).toEqual({ imagen_url: '/api/imagenes/1' });
    const [, opciones] = fetch.mock.calls[0];
    expect(opciones.body).toBeInstanceOf(FormData);
    expect(opciones.body.get('imagen').name).toBe('foto.png');
    expect(opciones.headers.Authorization).toBe('Bearer abc');
  });

  it('una subida rechazada muestra el motivo', async () => {
    fetch.mockResolvedValue(respuesta(413, { error: 'La imagen supera el tamaño máximo de 3 MB.' }));
    await expect(pedirArchivo('/api/preparaciones/imagen', new File(['x'], 'a.png'))).rejects.toThrow('3 MB');
  });

  it('resuelve rutas relativas de imágenes hacia la API y deja intactas las absolutas', () => {
    expect(resolverUrl('/api/imagenes/1')).toMatch(/^https?:\/\/.+\/api\/imagenes\/1$/);
    expect(resolverUrl('https://cdn.ejemplo.cl/a.jpg')).toBe('https://cdn.ejemplo.cl/a.jpg');
    expect(resolverUrl(null)).toBe(null);
    expect(resolverUrl('relativa.png')).toBe('relativa.png');
  });
});
