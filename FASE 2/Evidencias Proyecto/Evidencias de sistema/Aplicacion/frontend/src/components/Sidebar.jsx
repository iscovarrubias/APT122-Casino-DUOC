import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavAnimada } from '../utils/navAnimada';
import { Utensils, Calendar, HelpCircle, LayoutPanelLeft, User, LogOut, LogIn, Sun, Moon } from 'lucide-react';
import { useTema } from '../utils/tema';
import { useAuth } from '../context/auth-context';
import { navegar } from '../ruteo/useRuta';
import { rutaInicial } from '../ruteo/rutas';

export default function Sidebar({ vistaActiva, onCambiarVista, onAbrirPerfil }) {
  const { usuario, kiosco, cerrarSesion } = useAuth();
  const { esOscuro, alternar } = useTema();
  const [ajustes, setAjustes] = useState(false);

  const { activa, ir, ref, indicadorRef } = useNavAnimada(vistaActiva, onCambiarVista, 3);

  const logo = esOscuro ? '/logooscuro.svg' : '/logo.svg';
  const primerNombre = usuario ? usuario.nombre.split(' ')[0] : null;
  const inicial = usuario ? usuario.nombre.trim().charAt(0).toUpperCase() : null;
  const esEstudiante = usuario?.rol === 'Estudiante';

  const cerrarHoja = () => setAjustes(false);
  const accion = (fn) => () => {
    cerrarHoja();
    fn();
  };
  const botonTema = (
    <div className="app-toggle-tema-pos">
      <button
        type="button"
        className="app-toggle-tema"
        onClick={alternar}
        aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={esOscuro ? 'Modo claro' : 'Modo oscuro'}
      >
        {esOscuro ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );

  return (
    <>
      {createPortal(botonTema, document.body)}

      <aside className="sidebar">
        <header className="movil-cabecera">
          <img src={logo} alt="Casinos DuocUC" className="movil-logo" />
          <div className="movil-saludo">
            <div>
              <h2>{usuario ? `¡Hola, ${primerNombre}!` : 'Menú del casino'}</h2>
              <p>{esEstudiante || !usuario ? 'Sede Valparaíso' : usuario.rol}</p>
            </div>
            <button type="button" className="avatar avatar-boton" onClick={() => setAjustes(true)} aria-label="Abrir configuración">
              {inicial || <User size={20} />}
            </button>
          </div>
        </header>

        <div className="sidebar-logo">
          <img src="/logooscuro.svg" alt="Casinos DuocUC" className="sidebar-logo-img" />
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
          {[
            { id: 'semanal', Icono: Calendar, texto: 'Semanal' },
            { id: 'diario', Icono: Utensils, texto: 'Menú diario' },
            { id: 'preguntas', Icono: HelpCircle, texto: 'Preguntas' },
          ].map(({ id, Icono, texto }) => (
            <button
              key={id}
              ref={ref(id)}
              className={`sidebar-nav-item ${activa === id ? 'active' : ''}`}
              onClick={() => ir(id)}
              aria-current={activa === id ? 'page' : undefined}
            >
              <Icono size={20} /> {texto}
            </button>
          ))}
          <span className="nav-indicador" ref={indicadorRef} aria-hidden="true" />
        </nav>

        <div className="sidebar-bottom">
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
              <button type="button" className="sidebar-panel-cta" onClick={() => navegar(rutaInicial(usuario.rol, kiosco))}>
                <LayoutPanelLeft size={20} aria-hidden="true" />
                <span>Ir al panel</span>
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

          <div className="sidebar-legales">
            <button type="button" className="sidebar-legal-link" onClick={() => navegar('/terminos')}>
              Términos y Condiciones
            </button>
            <button type="button" className="sidebar-legal-link" onClick={() => navegar('/privacidad')}>
              Política de Privacidad
            </button>
          </div>
        </div>

        {ajustes && (
          <div className="hoja-fondo" onClick={cerrarHoja}>
            <div className="hoja" role="dialog" aria-modal="true" aria-label="Configuración" onClick={(e) => e.stopPropagation()}>
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
              {usuario && !esEstudiante && (
                <button
                  type="button"
                  className="hoja-opcion hoja-panel-cta"
                  onClick={accion(() => navegar(rutaInicial(usuario.rol, kiosco)))}
                >
                  <span className="hoja-panel-cta-izq">
                    <LayoutPanelLeft size={18} aria-hidden="true" />
                    <span>Ir al panel</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              )}

              {esEstudiante && (
                <button className="hoja-opcion" onClick={accion(onAbrirPerfil)}>
                  Cuenta y perfil <span aria-hidden="true">›</span>
                </button>
              )}

              <button className="hoja-opcion" onClick={accion(() => onCambiarVista('preguntas'))}>
                Centro de ayuda <span aria-hidden="true">›</span>
              </button>

              <div className="hoja-legales">
                <button type="button" className="hoja-opcion hoja-opcion--legal" onClick={accion(() => navegar('/terminos'))}>
                  Términos y Condiciones <span aria-hidden="true">›</span>
                </button>
                <button type="button" className="hoja-opcion hoja-opcion--legal" onClick={accion(() => navegar('/privacidad'))}>
                  Política de Privacidad <span aria-hidden="true">›</span>
                </button>
              </div>

              {usuario ? (
                <button className="hoja-salir" onClick={accion(cerrarSesion)}>
                  Cerrar sesión
                </button>
              ) : (
                <button className="hoja-salir" onClick={accion(() => navegar('/login'))}>
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
