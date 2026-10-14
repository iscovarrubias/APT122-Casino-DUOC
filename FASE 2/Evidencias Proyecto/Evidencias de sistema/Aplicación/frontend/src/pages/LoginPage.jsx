import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { rutaInicial } from '../ruteo/rutas';
import { Sun, Moon } from 'lucide-react';
import { useTema } from '../utils/tema';

export default function LoginPage() {
  const { iniciarSesion, iniciarSesionDuoc } = useAuth();
  const { esOscuro, alternar } = useTema();

  const [pestana, setPestana] = useState('estudiante');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kiosco, setKiosco] = useState(false);
  const [emailDuoc, setEmailDuoc] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviarPersonal(evento) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const sesion = await iniciarSesion(email.trim(), password, kiosco);
      navegar(rutaInicial(sesion.usuario.rol, sesion.kiosco));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function enviarEstudiante(evento) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesionDuoc(emailDuoc.trim());
      navegar('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-pagina">
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

        <h1 style={{ marginBottom: 6 }}>Iniciar sesión</h1>
        <p className="login-ayuda">
          Ingresa con tu cuenta DUOC UC para acceder a tu perfil y dejar tus opiniones.
        </p>

        <div className="segmentado" style={{ display: 'flex', marginBottom: 20 }}>
          <button
            type="button"
            className={pestana === 'estudiante' ? 'activo' : ''}
            onClick={() => { setPestana('estudiante'); setError(null); }}
            style={{ flex: 1 }}
          >
            Estudiante
          </button>
          <button
            type="button"
            className={pestana === 'personal' ? 'activo' : ''}
            onClick={() => { setPestana('personal'); setError(null); }}
            style={{ flex: 1 }}
          >
            Personal
          </button>
        </div>

        {pestana === 'estudiante' && (
          <form onSubmit={enviarEstudiante} className="formulario">
            <label className="campo">
              <span>Correo institucional</span>
              <input
                type="email"
                value={emailDuoc}
                onChange={(e) => setEmailDuoc(e.target.value)}
                placeholder="tunombre@duocuc.cl"
                autoComplete="username"
                required
              />
            </label>

            {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}

            <button type="submit" className="boton boton-primario boton-ancho" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar con mi cuenta DUOC'}
            </button>
          </form>
        )}

        {pestana === 'personal' && (
          <form onSubmit={enviarPersonal} className="formulario">
            <label className="campo">
              <span>Correo</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="campo">
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="campo-check">
              <input type="checkbox" checked={kiosco} onChange={(e) => setKiosco(e.target.checked)} />
              <span>Este es un dispositivo compartido de cocina (la sesión dura más tiempo)</span>
            </label>

            {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}

            <button type="submit" className="boton boton-primario boton-ancho" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        )}

        <button className="boton-enlace" onClick={() => navegar('/')}>Volver al menú</button>
      </div>
    </div>
  );
}