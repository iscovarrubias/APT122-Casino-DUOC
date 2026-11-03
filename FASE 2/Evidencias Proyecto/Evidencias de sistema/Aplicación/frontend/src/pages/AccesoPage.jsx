import { useEffect, useRef } from 'react';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { rutaInicial } from '../ruteo/rutas';
import Cargando from '../components/Cargando';

const MENSAJES = {
  cancelado: 'Cancelaste el inicio de sesión con Microsoft.',
  cuenta_no_permitida: 'Esa cuenta de Microsoft no pertenece a la institución. Usa tu correo @duocuc.cl.',
  sin_acceso: 'Tu cuenta no tiene acceso al sistema del casino. Si eres parte del personal, pide al administrador que te registre.',
  cuenta_desactivada: 'Tu cuenta está desactivada. Habla con el administrador del casino.',
  no_disponible: 'El acceso con Microsoft no está disponible.',
  fallo: 'No pudimos completar el inicio de sesión con Microsoft. Inténtalo de nuevo.',
};

export default function AccesoPage() {
  const { iniciarConTicket } = useAuth();
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const fallar = (texto) => {
      try { sessionStorage.setItem('casino_login_error', texto); } catch {  }
      navegar('/login');
    };
    const error = params.get('error');
    const ticket = params.get('ticket');
    if (error || !ticket) return fallar(MENSAJES[error] || MENSAJES.fallo);
    iniciarConTicket(ticket)
      .then((sesion) => navegar(sesion.usuario.rol === 'Estudiante' ? '/' : rutaInicial(sesion.usuario.rol, sesion.kiosco)))
      .catch((e) => fallar(e.message));
  }, [iniciarConTicket]);

  return <Cargando>Verificando tu cuenta…</Cargando>;
}
