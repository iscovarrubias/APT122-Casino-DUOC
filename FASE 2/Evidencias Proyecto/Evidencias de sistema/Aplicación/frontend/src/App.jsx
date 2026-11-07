import { lazy, Suspense, useEffect, useState } from 'react';
import './panel.css';
import './responsive.css';
import './diseno.css';
import AuthProvider from './context/AuthProvider';
import ConfirmacionProvider from './context/ConfirmacionProvider';
import { EstudianteProvider } from './utils/estudiante';
import { useAuth } from './context/auth-context';
import { useRuta, navegar } from './ruteo/useRuta';
import { PERMISOS, rutaInicial } from './ruteo/rutas';
import VistaPublica from './pages/VistaPublica';
import LoginPage from './pages/LoginPage';
import AccesoPage from './pages/AccesoPage';
import PanelLayout from './components/PanelLayout';
import PantallaCarga from './components/PantallaCarga';
import { debeMostrarSplash, marcarSplashVisto, SPLASH_DURACION_MS, SPLASH_SALIDA_MS } from './utils/splash';
const KioscoPage = lazy(() => import('./pages/KioscoPage'));
const CajaPage = lazy(() => import('./pages/CajaPage'));
const PlanificacionPage = lazy(() => import('./pages/PlanificacionPage'));
const IngredientesPage = lazy(() => import('./pages/IngredientesPage'));
const PreparacionesPage = lazy(() => import('./pages/PreparacionesPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const AnalisisPage = lazy(() => import('./pages/AnalisisPage'));
import Mensaje from './components/Mensaje';
import Cargando from './components/Cargando';
import NoEncontrada from './components/NoEncontrada';

const NOMBRE_SITIO = 'Casinos DUOC UC';

function useTitulo(titulo) {
  useEffect(() => { document.title = titulo ? `${titulo} - ${NOMBRE_SITIO}` : NOMBRE_SITIO; }, [titulo]);
}

const PAGINAS = {
  '/panel/caja': { titulo: 'Caja', descripcion: 'Toca el combo que vendes. Cada toque descuenta una porción del plato y de los acompañamientos.', Pagina: CajaPage },
  '/panel/kiosco': { titulo: 'Disponibilidad', ayuda: 'Controla la jornada: porciones que quedan, ventas del día y cierre con conteo de sobrantes.', Pagina: KioscoPage },
  '/panel/menu': { titulo: 'Planificación', ayuda: 'Define qué se sirve cada día, en qué cantidad y a qué precio. El menú solo lo ven los estudiantes cuando lo publicas.', Pagina: PlanificacionPage },
  '/panel/ingredientes': { titulo: 'Ingredientes', ayuda: 'Catálogo base con valores nutricionales por 100 g. De aquí se calculan las preparaciones.', Pagina: IngredientesPage },
  '/panel/preparaciones': { titulo: 'Preparaciones', ayuda: 'Recetas del casino con su información nutricional y alérgenos. Lo que se desactiva deja de poder planificarse.', Pagina: PreparacionesPage },
  '/panel/usuarios': { titulo: 'Usuarios', ayuda: 'Cuentas del personal del casino. Los estudiantes consultan el menú sin cuenta.', Pagina: UsuariosPage },
  '/panel/analisis': { titulo: 'Análisis', ayuda: 'Qué se vende, qué se agota y qué opinan los estudiantes. Elige un período y compara por menú o por preparación.', Pagina: AnalisisPage },
};

function Redirigir({ a }) {
  useEffect(() => { navegar(a); }, [a]);
  return null;
}

function Enrutador() {
  const ruta = useRuta();
  const { usuario, kiosco, cargando } = useAuth();
  const [ocultarDesactivadas, setOcultarDesactivadas] = useState(false);

  const tituloPagina = ruta === '/login' ? 'Iniciar sesión'
    : ruta.startsWith('/panel') ? (PAGINAS[ruta]?.titulo || 'Panel')
    : ruta === '/' ? 'Menú del día' : 'Página no encontrada';
  useTitulo(tituloPagina);

  if (ruta.startsWith('/acceso')) return <AccesoPage />;

  if (ruta === '/login') {
    if (cargando) return <PantallaCarga mensaje="Cargando…" />;
    return usuario ? <Redirigir a={rutaInicial(usuario.rol, kiosco)} /> : <LoginPage />;
  }

  if (ruta.startsWith('/panel')) {
    if (cargando) return <PantallaCarga mensaje="Comprobando tu sesión…" />;
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
          <Mensaje tipo="error" titulo="Sin permiso">
            Tu rol (<strong>{usuario.rol}</strong>) no tiene acceso a esta sección.
          </Mensaje>
          <button className="boton boton-primario" onClick={() => navegar(rutaInicial(usuario.rol, false))}>Ir a mi panel</button>
        </PanelLayout>
      );
    }

    const { titulo, descripcion, ayuda, Pagina } = pagina;
    const esPreparaciones = ruta === '/panel/preparaciones';

    return (
      <PanelLayout ruta={ruta} titulo={titulo} descripcion={descripcion} ayuda={ayuda}>
        <div className="pagina" key={ruta}>
          <Suspense fallback={<Cargando>Cargando…</Cargando>}>
            <Pagina
              soloActivas={esPreparaciones ? ocultarDesactivadas : undefined}
              setSoloActivas={esPreparaciones ? setOcultarDesactivadas : undefined}
            />
          </Suspense>
        </div>
      </PanelLayout>
    );
  }

  if (ruta !== '/') return <NoEncontrada />;
  return <VistaPublica />;
}

export default function App() {
  const [mostrarInicial] = useState(debeMostrarSplash);
  const [splash, setSplash] = useState(mostrarInicial ? 'visible' : false);

  useEffect(() => {
    if (!mostrarInicial) return undefined;
    marcarSplashVisto();
    const t1 = setTimeout(() => setSplash('saliendo'), SPLASH_DURACION_MS);
    const t2 = setTimeout(() => setSplash(false), SPLASH_DURACION_MS + SPLASH_SALIDA_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [mostrarInicial]);

  return (
    <AuthProvider>
      <EstudianteProvider>
        <ConfirmacionProvider>
          <Enrutador />
        </ConfirmacionProvider>
      </EstudianteProvider>
      {splash && (
        <PantallaCarga forzada saliendo={splash === 'saliendo'} duracionMs={SPLASH_DURACION_MS} mensaje="Cargando Casinos DUOC UC…" />
      )}
    </AuthProvider>
  );
}
