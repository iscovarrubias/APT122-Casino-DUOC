import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { rutaInicial } from '../ruteo/rutas';
import { IconSol, IconLuna } from '../components/iconos';
import { useTema } from '../utils/tema';

export default function LoginPage() {
  const { iniciarSesion } = useAuth();
  const { esOscuro, alternar } = useTema();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kiosco, setKiosco] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
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

  return (
    <div className="login-pagina">
      <button
        type="button"
        className="login-toggle-tema"
        onClick={alternar}
        aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {esOscuro ? <IconSol width={18} height={18} /> : <IconLuna width={18} height={18} />}
      </button>

      <div className="login-tarjeta">
        <div className="sidebar-logo login-logo">
          <img
            src={esOscuro ? '/logooscuro.svg' : '/logo.svg'}
            alt="Casinos DuocUC"
            className="sidebar-logo-img"
          />
        </div>

        <h1>Acceso del personal</h1>
        <p className="login-ayuda">
          Solo para el personal del casino y la administración. Para consultar el menú no necesitas iniciar sesión.
        </p>

        <form onSubmit={enviar} className="formulario">
          <label className="campo">
            <span>Correo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </label>
          <label className="campo">
            <span>Contraseña</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
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

        <button className="boton-enlace" onClick={() => navegar('/')}>Volver al menú</button>
      </div>
    </div>
  );
}