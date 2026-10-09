import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './auth-context';
import { configurarCliente } from '../api/cliente';
import { iniciarSesionApi, consultarSesion } from '../api/gestion';
import { ROLES_PANEL } from '../ruteo/rutas';

const CLAVE = 'casino_sesion';

function leerGuardada() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE));
  } catch {
    return null;
  }
}

function guardar(sesion) {
  try {
    if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE);
  } catch {
  }
}

export default function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cerrarSesion = useCallback(() => {
    configurarCliente({ token: null });
    guardar(null);
    setSesion(null);
  }, []);

  useEffect(() => {
    configurarCliente({ alSesionInvalida: cerrarSesion });
    const guardada = leerGuardada();
    if (!guardada?.token) {
      setCargando(false);
      return;
    }
    configurarCliente({ token: guardada.token });
    consultarSesion()
      .then(({ usuario }) => setSesion({ ...guardada, usuario }))
      .catch(() => cerrarSesion())
      .finally(() => setCargando(false));
  }, [cerrarSesion]);

  async function iniciarSesion(email, password, kiosco) {
    const respuesta = await iniciarSesionApi(email, password, kiosco);

    if (!ROLES_PANEL.includes(respuesta.usuario.rol)) {
      throw new Error('Esta cuenta no tiene acceso al panel. El menú se consulta sin iniciar sesión.');
    }

    const nueva = { token: respuesta.token, usuario: respuesta.usuario, kiosco: respuesta.kiosco };
    configurarCliente({ token: nueva.token });
    guardar(nueva);
    setSesion(nueva);
    return nueva;
  }

  const valor = {
    usuario: sesion?.usuario || null,
    kiosco: !!sesion?.kiosco,
    cargando,
    iniciarSesion,
    cerrarSesion,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
