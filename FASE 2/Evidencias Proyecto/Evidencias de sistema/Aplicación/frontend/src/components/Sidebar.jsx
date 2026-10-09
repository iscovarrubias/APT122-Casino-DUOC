import { IconTenedor, IconCalendario, IconPregunta, IconEngranaje, IconPerfil, IconSalir, IconSol, IconLuna } from './iconos';
import { useTema } from '../utils/tema';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { rutaInicial } from '../ruteo/rutas';

export default function Sidebar({ vistaActiva, onCambiarVista }) {
  const { usuario, kiosco } = useAuth();
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
        <h2>Menú del casino</h2>
        <p>Sede Valparaíso</p>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${vistaActiva === 'diario' ? 'active' : ''}`}
          onClick={() => onCambiarVista('diario')}
        >
          <IconTenedor /> Diario
        </button>
        <button
          className={`sidebar-nav-item ${vistaActiva === 'semanal' ? 'active' : ''}`}
          onClick={() => onCambiarVista('semanal')}
        >
          <IconCalendario /> Semanal
        </button>
        <button
          className={`sidebar-nav-item ${vistaActiva === 'preguntas' ? 'active' : ''}`}
          onClick={() => onCambiarVista('preguntas')}
        >
          <IconPregunta /> Preguntas
        </button>
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-link" onClick={alternar} title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
          {esOscuro ? <IconSol width={16} height={16} /> : <IconLuna width={16} height={16} />}
          {esOscuro ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <button className="sidebar-link" disabled title="Requiere cuenta DUOC Microsoft">
          <IconEngranaje width={16} height={16} /> Configuración
        </button>
        <button className="sidebar-link" disabled title="Requiere cuenta DUOC Microsoft">
          <IconPerfil width={16} height={16} /> Cuenta y perfil
        </button>
        {}
        <button
          className="sidebar-logout"
          onClick={() => navegar(usuario ? rutaInicial(usuario.rol, kiosco) : '/login')}
        >
          <IconSalir width={16} height={16} /> {usuario ? 'Ir al panel' : 'Acceso personal'}
        </button>
      </div>
    </aside>
  );
}
