const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let token = null;
let alSesionInvalida = null;

export function configurarCliente({ token: nuevoToken, alSesionInvalida: callback }) {
  if (nuevoToken !== undefined) token = nuevoToken;
  if (callback !== undefined) alSesionInvalida = callback;
}

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

export async function pedir(ruta, { metodo = 'GET', cuerpo, conToken = true } = {}) {
  const headers = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (conToken && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
  }

  let datos = null;
  try {
    datos = await res.json();
  } catch {
  }

  if (!res.ok) {
    if (res.status === 401 && conToken && token && alSesionInvalida) alSesionInvalida();
    throw new ErrorApi(datos?.error || `Error del servidor (${res.status}).`, res.status);
  }
  return datos;
}

export async function pedirArchivo(ruta, archivo, campo = 'imagen') {
  const form = new FormData();
  form.append(campo, archivo);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${ruta}`, { method: 'POST', headers, body: form });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
  }

  let datos = null;
  try {
    datos = await res.json();
  } catch {
  }

  if (!res.ok) {
    if (res.status === 401 && token && alSesionInvalida) alSesionInvalida();
    throw new ErrorApi(datos?.error || `Error del servidor (${res.status}).`, res.status);
  }
  return datos;
}
