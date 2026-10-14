import { Utensils, Calendar, HelpCircle, Settings, User, LogOut, Sun, Moon } from 'lucide-react';
import { useTema } from '../utils/tema';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { rutaInicial } from '../ruteo/rutas';

export default function Sidebar({ vistaActiva, onCambiarVista, onAbrirPerfil }) {
  const { usuario, kiosco, cerrarSesion } = useAuth();
  const { esOscuro, alternar } = useTema();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src={esOscuro ? '/logooscuro.svg' : '/logo.svg'}
          alt="Casinos DuocUC"
          className="sidebar-logo-img"
        />
      </div>

      <div className="sidebar-greeting">
        {usuario ? (
          <>
            <h2>¡Hola, {usuario.nombre.split(' ')[0]}!</h2>
            <p>{usuario.rol === 'Estudiante' ? 'Sede Valparaíso' : usuario.rol}</p>
          </>
        ) : (
          <>
            <h2>Menú del casino</h2>
            <p>Sede Valparaíso</p>
          </>
        )}
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${vistaActiva === 'diario' ? 'active' : ''}`}
          onClick={() => onCambiarVista('diario')}
        >
          <Utensils size={20} /> Diario
        </button>
        <button
          className={`sidebar-nav-item ${vistaActiva === 'semanal' ? 'active' : ''}`}
          onClick={() => onCambiarVista('semanal')}
        >
          <Calendar size={20} /> Semanal
        </button>
        <button
          className={`sidebar-nav-item ${vistaActiva === 'preguntas' ? 'active' : ''}`}
          onClick={() => onCambiarVista('preguntas')}
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

        {/* Solo con sesión activa: */}
        {usuario?.rol === 'Estudiante' && (
          <>
            <button className="sidebar-link" onClick={onAbrirPerfil}>
              <User size={16} /> Mi perfil
            </button>
            <button className="sidebar-logout" onClick={cerrarSesion}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </>
        )}

        {usuario && usuario.rol !== 'Estudiante' && (
          <>
            <button
              className="sidebar-link"
              onClick={() => navegar(rutaInicial(usuario.rol, kiosco))}
            >
              <Settings size={16} /> Ir al panel
            </button>
            <button className="sidebar-logout" onClick={cerrarSesion}>
              <IconSalir width={16} height={16} /> Cerrar sesión
            </button>
          </>
        )}

        {!usuario && (
          <button className="sidebar-logout" onClick={() => navegar('/login')}>
            <LogOut size={16} /> Iniciar sesión
          </button>
        )}
      </div>

    </aside>
  );
}