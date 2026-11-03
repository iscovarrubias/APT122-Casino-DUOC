import { useState } from 'react';
import { useNavAnimada } from '../utils/navAnimada';
import { Store, ClipboardList, Carrot, ChefHat, Users, ChartColumn, Globe, LogOut, Sun, Moon } from 'lucide-react';
import { useTema } from '../utils/tema';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { NAVEGACION, PERMISOS } from '../ruteo/rutas';

const ICONOS = {
  '/panel/kiosco': Store,
  '/panel/menu': ClipboardList,
  '/panel/ingredientes': Carrot,
  '/panel/preparaciones': ChefHat,
  '/panel/usuarios': Users,
  '/panel/analisis': ChartColumn,
};

export default function PanelSidebar({ ruta }) {
  const { usuario, kiosco, cerrarSesion } = useAuth();
  const { esOscuro, alternar } = useTema();
  const [ajustes, setAjustes] = useState(false);

  const logo = esOscuro ? '/logooscuro.svg' : '/logo.svg';
  const primerNombre = usuario.nombre.split(' ')[0];
  const inicial = usuario.nombre.trim().charAt(0).toUpperCase();
  const items = kiosco ? [] : NAVEGACION.filter((item) => PERMISOS[item.ruta].includes(usuario.rol));

  const { activa, ir, ref, indicadorRef } = useNavAnimada(ruta, navegar, items.length);

  const cerrarHoja = () => setAjustes(false);
  const accion = (fn) => () => { cerrarHoja(); fn(); };
  const salir = () => { cerrarSesion(); navegar('/'); };
  const verMenuPublico = () => navegar('/');

  return (
    <aside className="sidebar sidebar--panel">
      <header className="movil-cabecera">
        <img src={logo} alt="Casinos DuocUC" className="movil-logo" />
        <span className="etiqueta-panel">Panel de administración</span>
        <div className="movil-saludo">
          <div>
            <h2>¡Hola, {primerNombre}!</h2>
            <p>{usuario.rol}</p>
          </div>
          <button
            type="button"
            className="avatar avatar-boton"
            onClick={() => setAjustes(true)}
            aria-label="Abrir configuración"
          >
            {inicial}
          </button>
        </div>
      </header>

      <div className="sidebar-logo">
        <img src="/logooscuro.svg" alt="Casinos DuocUC" className="sidebar-logo-img" />
      </div>

      <span className="etiqueta-panel">Panel de administración</span>

      <div className="sidebar-greeting">
        <h2>¡Hola, {primerNombre}!</h2>
        <p>{usuario.rol}</p>
      </div>

      {items.length > 0 && (
        <nav className={`sidebar-nav ${items.length > 4 ? 'sidebar-nav--compacta' : ''}`} aria-label="Secciones del panel">
          {items.map((item) => {
            const Icono = ICONOS[item.ruta];
            const activo = item.ruta === activa;
            return (
              <button
                key={item.ruta}
                ref={ref(item.ruta)}
                className={`sidebar-nav-item ${activo ? 'active' : ''}`}
                aria-current={activo ? 'page' : undefined}
                title={item.etiqueta}
                aria-label={item.etiqueta}
                onClick={() => ir(item.ruta)}
              >
                <Icono size={20} /> <span className="sidebar-nav-texto">{item.corta}</span>
              </button>
            );
          })}
          <span className="nav-indicador" ref={indicadorRef} aria-hidden="true" />
        </nav>
      )}

      <div className="sidebar-bottom">
        <button
          className="sidebar-link"
          onClick={alternar}
          title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {esOscuro ? <Sun size={16} /> : <Moon size={16} />}
          {esOscuro ? 'Modo claro' : 'Modo oscuro'}
        </button>
        {!kiosco && (
          <button className="sidebar-link" onClick={verMenuPublico}>
            <Globe size={16} /> Ver menú público
          </button>
        )}
        <button className="sidebar-logout" onClick={salir}>
          <LogOut size={16} /> Cerrar sesión
        </button>
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
            {!kiosco && (
              <button className="hoja-opcion" onClick={accion(verMenuPublico)}>
                Ver menú público <span aria-hidden="true">›</span>
              </button>
            )}
            <button className="hoja-salir" onClick={accion(salir)}>Cerrar sesión</button>
          </div>
        </div>
      )}
    </aside>
  );
}
