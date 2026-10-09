import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { NAVEGACION, PERMISOS } from '../ruteo/rutas';
import { IconTenedor, IconSol, IconLuna } from './iconos';
import { useTema } from '../utils/tema';

export default function PanelLayout({ ruta, titulo, children }) {
  const { usuario, kiosco, cerrarSesion } = useAuth();
  const { esOscuro, alternar } = useTema();
  const visibles = NAVEGACION.filter((item) => PERMISOS[item.ruta].includes(usuario.rol));

  function salir() {
    cerrarSesion();
    navegar('/');
  }

  return (
    <div className="panel">
      <header className="panel-barra">
        <div className="panel-marca">
          <img
            src={esOscuro ? '/logooscuro.svg' : '/logo.svg'}
            alt="Casinos DuocUC"
            className="panel-marca-img"
          />
        </div>

        {}
        {!kiosco && (
          <nav className="panel-nav" aria-label="Secciones del panel">
            {visibles.map((item) => (
              <button
                key={item.ruta}
                className={`panel-nav-item ${item.ruta === ruta ? 'activo' : ''}`}
                aria-current={item.ruta === ruta ? 'page' : undefined}
                onClick={() => navegar(item.ruta)}
              >
                {item.etiqueta}
              </button>
            ))}
          </nav>
        )}

        <div className="panel-usuario">
          <span className="panel-usuario-nombre">{usuario.nombre}</span>
          <span className="panel-usuario-rol">{usuario.rol}</span>
          {!kiosco && <button className="boton boton-secundario" onClick={() => navegar('/')}>Ver menú público</button>}
          <button
            className="boton boton-secundario"
            onClick={alternar}
            title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {esOscuro ? <IconSol width={16} height={16} /> : <IconLuna width={16} height={16} />}
          </button>
          <button className="boton boton-secundario" onClick={salir}>Cerrar sesión</button>
        </div>
      </header>

      <main className="panel-contenido">
        <h1 className="panel-titulo">{titulo}</h1>
        {children}
      </main>
    </div>
  );
}
