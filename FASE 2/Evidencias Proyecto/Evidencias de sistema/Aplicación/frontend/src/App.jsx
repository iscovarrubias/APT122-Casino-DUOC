import { useEffect, useState } from 'react';
import './panel.css';
import AuthProvider from './context/AuthProvider';
import { EstudianteProvider } from './utils/estudiante';
import { useAuth } from './context/auth-context';
import { useRuta, navegar } from './ruteo/useRuta';
import { PERMISOS, rutaInicial } from './ruteo/rutas';
import VistaPublica from './pages/VistaPublica';
import LoginPage from './pages/LoginPage';
import PanelLayout from './components/PanelLayout';
import KioscoPage from './pages/KioscoPage';
import CajaPage from './pages/CajaPage';
import PlanificacionPage from './pages/PlanificacionPage';
import IngredientesPage from './pages/IngredientesPage';
import PreparacionesPage from './pages/PreparacionesPage';
import UsuariosPage from './pages/UsuariosPage';
import AnalisisPage from './pages/AnalisisPage';

const PAGINAS = {
  '/panel/caja': { titulo: 'Caja', Pagina: CajaPage },
  '/panel/kiosco': { titulo: 'Disponibilidad de hoy', Pagina: KioscoPage },
  '/panel/menu': { titulo: 'Planificación del menú', Pagina: PlanificacionPage },
  '/panel/ingredientes': { titulo: 'Ingredientes', Pagina: IngredientesPage },
  '/panel/preparaciones': { titulo: 'Preparaciones', Pagina: PreparacionesPage },
  '/panel/usuarios': { titulo: 'Usuarios', Pagina: UsuariosPage },
  '/panel/analisis': { titulo: 'Análisis de la oferta', Pagina: AnalisisPage },
};

function Redirigir({ a }) {
  useEffect(() => { navegar(a); }, [a]);
  return null;
}

function Enrutador() {
  const ruta = useRuta();
  const { usuario, kiosco, cargando } = useAuth();
  const [ocultarDesactivadas, setOcultarDesactivadas] = useState(false);

  if (ruta === '/login') {
    if (cargando) return <div className="estado-info">Cargando…</div>;
    return usuario ? <Redirigir a={rutaInicial(usuario.rol, kiosco)} /> : <LoginPage />;
  }

  if (ruta.startsWith('/panel')) {
    if (cargando) return <div className="estado-info">Comprobando tu sesión…</div>;
    if (!usuario) return <Redirigir a="/login" />;
    if (usuario.rol === 'Estudiante') return <Redirigir a="/" />;

    const pagina = PAGINAS[ruta];
    if (!pagina) return <Redirigir a={rutaInicial(usuario.rol, kiosco)} />;

    if (usuario.rol === 'Cajero') {
      if (ruta !== '/panel/caja') return <Redirigir a="/panel/caja" />;
    } else if (kiosco && ruta !== '/panel/kiosco') {
      return <Redirigir a="/panel/kiosco" />;
    }

    if (!PERMISOS[ruta].includes(usuario.rol)) {
      return (
        <PanelLayout ruta={ruta} titulo="Sin permiso">
          <div className="mensaje mensaje-error" role="alert">
            Tu rol (<strong>{usuario.rol}</strong>) no tiene acceso a esta sección.
          </div>
          <button className="boton boton-primario" onClick={() => navegar(rutaInicial(usuario.rol, false))}>Ir a mi panel</button>
        </PanelLayout>
      );
    }

    const { titulo, Pagina } = pagina;
    const esPreparaciones = ruta === '/panel/preparaciones';
    const accionesTitulo = esPreparaciones ? (
      <label className="campo-check">
        <input
          type="checkbox"
          checked={ocultarDesactivadas}
          onChange={(e) => setOcultarDesactivadas(e.target.checked)}
        />
        <span>Ocultar desactivadas</span>
      </label>
    ) : null;

    return (
      <PanelLayout ruta={ruta} titulo={titulo} accionesTitulo={accionesTitulo}>
        <Pagina
          soloActivas={esPreparaciones ? ocultarDesactivadas : undefined}
          setSoloActivas={esPreparaciones ? setOcultarDesactivadas : undefined}
        />
      </PanelLayout>
    );
  }

  return <VistaPublica />;
}

export default function App() {
  return (
    <AuthProvider>
      <EstudianteProvider>
        <Enrutador />
      </EstudianteProvider>
    </AuthProvider>
  );
}