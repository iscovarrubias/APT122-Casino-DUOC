import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { rutaInicial } from '../ruteo/rutas';
import { Sun, Moon, ChevronLeft, ArrowLeft } from 'lucide-react';
import { useTema } from '../utils/tema';
import { identificarCorreo, urlInicioMicrosoft } from '../api/gestion';
import Mensaje from '../components/Mensaje';

const CLAVE_ERROR = 'casino_login_error';

function errorPendiente() {
  try {
    const e = sessionStorage.getItem(CLAVE_ERROR);
    sessionStorage.removeItem(CLAVE_ERROR);
    return e;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const { iniciarSesion, iniciarSesionDuoc } = useAuth();
  const { esOscuro, alternar } = useTema();

  const [metodo, setMetodo] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kiosco, setKiosco] = useState(false);
  const [error, setError] = useState(errorPendiente);
  const [enviando, setEnviando] = useState(false);

  async function continuar(evento) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const { metodo: m } = await identificarCorreo(email.trim());
      setMetodo(m);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function cambiarCorreo() {
    setMetodo(null);
    setPassword('');
    setError(null);
  }

  async function entrarConClave(evento) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const sesion = await iniciarSesion(email.trim(), password, kiosco);
      navegar(rutaInicial(sesion.usuario.rol, sesion.kiosco));
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  async function entrarDemo() {
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesionDuoc(email.trim());
      navegar('/');
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  const aviso = error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>;

  return (
    <div className="login-pagina v2">
      <button type="button" className="login-volver" onClick={() => navegar('/')}>
        <ChevronLeft size={18} aria-hidden="true" /> Volver al menú
      </button>
      <button
        type="button"
        className="login-toggle-tema"
        onClick={alternar}
        aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {esOscuro ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="login-tarjeta">
        <div className="sidebar-logo login-logo">
          <img
            src={esOscuro ? '/logooscuro.svg' : '/logo.svg'}
            alt="Casinos DuocUC"
            className="sidebar-logo-img"
          />
        </div>

        <h1>Iniciar sesión</h1>

        {!metodo && (
          <form onSubmit={continuar} className="formulario">
            <p className="login-ayuda">Ingresa con tu correo institucional</p>
            <label className="campo">
              <span>Correo</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tunombre@duocuc.cl"
                autoComplete="username"
                autoFocus
                required
              />
            </label>
            {aviso}
            <button type="submit" className="boton boton-primario boton-ancho" disabled={enviando}>
              {enviando ? 'Comprobando…' : 'Continuar'}
            </button>
          </form>
        )}

        {metodo && (
          <div className="login-paso">
            <button type="button" className="login-cuenta" onClick={cambiarCorreo} title="Usar otro correo">
              <ArrowLeft size={14} aria-hidden="true" />
              <span>{email.trim()}</span>
            </button>

            {metodo === 'clave' && (
              <form onSubmit={entrarConClave} className="formulario">
                <label className="campo">
                  <span>Contraseña</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    required
                  />
                </label>
                <label className="campo-check">
                  <input type="checkbox" checked={kiosco} onChange={(e) => setKiosco(e.target.checked)} />
                  <span>Este es un dispositivo compartido de cocina (la sesión dura más tiempo)</span>
                </label>
                {aviso}
                <button type="submit" className="boton boton-primario boton-ancho" disabled={enviando}>
                  {enviando ? 'Ingresando…' : 'Ingresar'}
                </button>
              </form>
            )}

            {metodo === 'microsoft' && (
              <div className="formulario">
                <p className="login-ayuda">
                  Te llevaremos a Microsoft para confirmar tu cuenta. Tu contraseña nunca pasa por este sitio.
                </p>
                {aviso}
                <a className="boton boton-primario boton-ancho" href={urlInicioMicrosoft(email.trim())}>
                  Continuar con Microsoft
                </a>
              </div>
            )}

            {metodo === 'duoc' && (
              <div className="formulario">
                <p className="login-ayuda">
                  Cuenta de estudiante detectada. Esta versión de demostración no pide contraseña.
                </p>
                {aviso}
                <button type="button" className="boton boton-primario boton-ancho" onClick={entrarDemo} disabled={enviando}>
                  {enviando ? 'Ingresando…' : 'Ingresar con mi cuenta DUOC'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
