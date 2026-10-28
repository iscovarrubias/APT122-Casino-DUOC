import { useState } from 'react';
import { Utensils, Calendar, HelpCircle, Settings, User, LogOut, LogIn, Sun, Moon } from 'lucide-react';
import { useTema } from '../utils/tema';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { rutaInicial } from '../ruteo/rutas';

export default function Sidebar({ vistaActiva, onCambiarVista, onAbrirPerfil }) {
  const { usuario, kiosco, cerrarSesion } = useAuth();
  const { esOscuro, alternar } = useTema();
  const [ajustes, setAjustes] = useState(false);

  const logo = esOscuro ? '/logooscuro.svg' : '/logo.svg';
  const primerNombre = usuario ? usuario.nombre.split(' ')[0] : null;
  const inicial = usuario ? usuario.nombre.trim().charAt(0).toUpperCase() : null;
  const esEstudiante = usuario?.rol === 'Estudiante';

  const cerrarHoja = () => setAjustes(false);
  const accion = (fn) => () => { cerrarHoja(); fn(); };

  return (
    <aside className="sidebar">
      <header className="movil-cabecera">
        <img src={logo} alt="Casinos DuocUC" className="movil-logo" />
        <div className="movil-saludo">
          <div>
            <h2>{usuario ? `¡Hola, ${primerNombre}!` : 'Menú del casino'}</h2>
            <p>{esEstudiante || !usuario ? 'Sede Valparaíso' : usuario.rol}</p>
          </div>
          <button
            type="button"
            className="avatar avatar-boton"
            onClick={() => setAjustes(true)}
            aria-label="Abrir configuración"
          >
            {inicial || <User size={20} />}
          </button>
        </div>
      </header>

      <div className="sidebar-logo">
        <img src={logo} alt="Casinos DuocUC" className="sidebar-logo-img" />
      </div>

      <div className="sidebar-greeting">
        {usuario ? (
          <>
            <h2>¡Hola, {primerNombre}!</h2>
            <p>{esEstudiante ? 'Sede Valparaíso' : usuario.rol}</p>
          </>
        ) : (
          <>
            <h2>Menú del casino</h2>
            <p>Sede Valparaíso</p>
          </>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Secciones del menú">
        <button
          className={`sidebar-nav-item ${vistaActiva === 'semanal' ? 'active' : ''}`}
          onClick={() => onCambiarVista('semanal')}
          aria-current={vistaActiva === 'semanal' ? 'page' : undefined}
        >
          <Calendar size={20} /> Semanal
        </button>
        <button
          className={`sidebar-nav-item ${vistaActiva === 'diario' ? 'active' : ''}`}
          onClick={() => onCambiarVista('diario')}
          aria-current={vistaActiva === 'diario' ? 'page' : undefined}
        >
          <Utensils size={20} /> Menú diario
        </button>
        <button
          className={`sidebar-nav-item ${vistaActiva === 'preguntas' ? 'active' : ''}`}
          onClick={() => onCambiarVista('preguntas')}
          aria-current={vistaActiva === 'preguntas' ? 'page' : undefined}
        >
          <HelpCircle size={20} /> Preguntas
        </button>
      </nav>

      <div className="sidebar-bottom">
        <button
          className="sidebar-link"
          onClick={alternar}
          title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {esOscuro ? <Sun size={16} /> : <Moon size={16} />}
          {esOscuro ? 'Modo claro' : 'Modo oscuro'}
        </button>

        {esEstudiante && (
          <>
            <button className="sidebar-link" onClick={onAbrirPerfil}>
              <User size={16} /> Mi perfil
            </button>
            <button className="sidebar-logout" onClick={cerrarSesion}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </>
        )}

        {usuario && !esEstudiante && (
          <>
            <button className="sidebar-link" onClick={() => navegar(rutaInicial(usuario.rol, kiosco))}>
              <Settings size={16} /> Ir al panel
            </button>
            <button className="sidebar-logout" onClick={cerrarSesion}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </>
        )}

        {!usuario && (
          <button className="sidebar-logout" onClick={() => navegar('/login')}>
            <LogIn size={16} /> Iniciar sesión
          </button>
        )}
      </div>

      {ajustes && (
        <div className="hoja-fondo" onClick={cerrarHoja}>
          <div
            className="hoja"
            role="dialog"
            aria-modal="true"
            aria-label="Configuración"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="hoja-asa" aria-hidden="true" />
            <div className="hoja-titulo">
              <h2>Configuración</h2>
              <button
                type="button"
                className="interruptor-tema"
                onClick={alternar}
                aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                aria-pressed={esOscuro}
              >
                <span className="interruptor-bola">{esOscuro ? <Moon size={16} /> : <Sun size={16} />}</span>
              </button>
            </div>

            {esEstudiante && (
              <button className="hoja-opcion" onClick={accion(onAbrirPerfil)}>
                Cuenta y perfil <span aria-hidden="true">›</span>
              </button>
            )}
            {usuario && !esEstudiante && (
              <button className="hoja-opcion" onClick={accion(() => navegar(rutaInicial(usuario.rol, kiosco)))}>
                Ir al panel <span aria-hidden="true">›</span>
              </button>
            )}
            <button className="hoja-opcion" onClick={accion(() => onCambiarVista('preguntas'))}>
              Centro de ayuda <span aria-hidden="true">›</span>
            </button>

            {usuario ? (
              <button className="hoja-salir" onClick={accion(cerrarSesion)}>Cerrar sesión</button>
            ) : (
              <button className="hoja-salir" onClick={accion(() => navegar('/login'))}>Iniciar sesión</button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
