import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import PerfilEstudianteModal from '../components/PerfilEstudianteModal';
import { useEstudiante } from '../utils/useEstudiante';
import CategoriaTabs from '../components/CategoriaTabs';
import MenuPrincipal from '../components/MenuPrincipal';
import VistaSemanal from '../components/VistaSemanal';
import VistaPreguntas from '../components/VistaPreguntas';
import DocumentoLegal from '../components/DocumentoLegal';
import { TITULOS_LEGALES } from '../utils/legal';
import { navegar } from '../ruteo/useRuta';
import PantallaCarga from '../components/PantallaCarga';
import { obtenerMenuHoy } from '../api/menu';
import { hoyChile, parseFechaISO, estadoEfectivo, NO_DISPONIBLE, CATEGORIAS_MENU } from '../utils/formato';
import { suscribirCambios } from '../utils/eventos';
import Cargando from '../components/Cargando';
import PaginaError from '../components/PaginaError';

function estadosPorCategoria(preparaciones) {
  const estados = {};
  for (const nombre of CATEGORIAS_MENU) {
    const principal = preparaciones.find((p) => p.categoria === nombre);
    const estado = principal ? estadoEfectivo(principal) : null;
    if (NO_DISPONIBLE.includes(estado)) estados[nombre] = estado;
  }
  return estados;
}

const INTERVALO_SONDEO_MS = 30000;

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatearFechaLarga(fechaISO) {
  const f = parseFechaISO(fechaISO);
  return `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
}

function esFinDeSemana(fechaISO) {
  const dia = parseFechaISO(fechaISO).getDay();
  return dia === 0 || dia === 6;
}

function AvisoJornada({ titulo, children, onVerSemanal }) {
  return (
    <div className="aviso-jornada" role="status">
      <strong>{titulo}</strong>
      <p>{children}</p>
      {onVerSemanal && (
        <button type="button" className="boton boton-primario" onClick={onVerSemanal}>
          Ver menú semanal
        </button>
      )}
    </div>
  );
}

function VistaDiario({ onVerSemanal }) {
  const { categoriaPreferida } = useEstudiante();
  const [categoria, setCategoria] = useState(categoriaPreferida || 'General');

  useEffect(() => {
    if (categoriaPreferida) setCategoria(categoriaPreferida);
  }, [categoriaPreferida]);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await obtenerMenuHoy(null, hoyChile());
      setDatos(respuesta);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    setCargando(true);
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_SONDEO_MS);
    const cerrar = suscribirCambios(cargar, { dispersionMs: 2000 });
    return () => { clearInterval(intervalo); cerrar(); };
  }, [cargar]);

  const delDia = datos?.preparaciones || [];
  const especificos = delDia.filter((p) => p.categoria === categoria);
  const compartidos = delDia.filter((p) => {
    if (p.categoria) return false;
    return !delDia.some((x) => x.categoria === categoria && x.componente === p.componente);
  });

  const visibles = [...especificos, ...compartidos];
  const estados = estadosPorCategoria(delDia);
  const fechaMenu = datos?.fecha || hoyChile();
  const jornadaCerrada = delDia.some((p) => p.jornada_estado === 'cerrada');
  const sinMenuHoy = delDia.length === 0;

  return (
    <>
      <div className="main-header">
        <h1>Menú del día <span className="titulo-separador" aria-hidden="true">|</span> <span className="titulo-fecha">{formatearFechaLarga(datos?.fecha || hoyChile())}</span></h1>
      </div>

      <CategoriaTabs categoriaActiva={categoria} onSeleccionar={setCategoria} estados={estados} />

      {cargando && !datos && <PantallaCarga compacta mensaje="Cargando menú del día…" />}
      {cargando && datos && <Cargando>Cargando menú del día…</Cargando>}

      {!cargando && error && (
        <PaginaError
          compacta
          codigo={error.estado ?? 0}
          detalle={error.message}
          onReintentar={() => { setCargando(true); cargar(); }}
        />
      )}

      {!cargando && !error && datos && sinMenuHoy && esFinDeSemana(fechaMenu) && (
        <AvisoJornada titulo="Los fines de semana no hay menú disponible" onVerSemanal={onVerSemanal}>
          El casino atiende de lunes a viernes. Puedes revisar el menú de la próxima semana en el menú semanal, si ya está publicado.
        </AvisoJornada>
      )}

      {!cargando && !error && datos && visibles.length === 0 && !(sinMenuHoy && esFinDeSemana(fechaMenu)) && (
        <div className="estado-info">Todavía no hay un menú publicado para hoy en la categoría "{categoria}".</div>
      )}

      {!cargando && !error && datos && visibles.length > 0 && jornadaCerrada && (
        <AvisoJornada titulo="La jornada de almuerzos de hoy ya cerró" onVerSemanal={onVerSemanal}>
          Este fue el menú de hoy. Puedes revisar el de los próximos días en el menú semanal.
        </AvisoJornada>
      )}

      {!cargando && !error && datos && visibles.length > 0 && (
        <MenuPrincipal
          categoria={categoria}
          componentes={visibles}
          composicionDeCategoria={datos.composicion?.[categoria] || []}
        />
      )}
    </>
  );
}

const TITULOS_VISTA = {
  semanal: 'Menú semanal',
  preguntas: 'Preguntas frecuentes',
};

const TITULOS_PESTANA = {
  diario: 'Menú del día',
  semanal: 'Menú semanal',
  preguntas: 'Preguntas frecuentes',
};

export default function VistaPublica({ legal = null }) {
  const [vista, setVista] = useState('diario');
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const titulo = legal ? TITULOS_LEGALES[legal] : TITULOS_PESTANA[vista];

  useEffect(() => {
    document.title = `${titulo || 'Casinos DUOC UC'} - Casinos DUOC UC`;
  }, [titulo]);

  useEffect(() => {
    if (legal) window.scrollTo?.(0, 0);
  }, [legal]);

  const cambiarVista = (v) => {
    if (legal) navegar('/');
    setVista(v);
  };

  return (
    <div className="app-layout">
      <Sidebar
        vistaActiva={legal ? null : vista}
        onCambiarVista={cambiarVista}
        onAbrirPerfil={() => setPerfilAbierto(true)}
      />

      <main className="main v2 v2-pub">
        {legal ? (
          <div className="pagina" key={legal}>
            <div className="main-header">
              <h1>{TITULOS_LEGALES[legal]}</h1>
            </div>
            <DocumentoLegal tipo={legal} />
          </div>
        ) : (
          <div className="pagina" key={vista}>
            {vista !== 'diario' && (
              <div className="main-header">
                <h1>{TITULOS_VISTA[vista]}</h1>
              </div>
            )}

            {vista === 'diario' && <VistaDiario onVerSemanal={() => setVista('semanal')} />}
            {vista === 'semanal' && <VistaSemanal />}
            {vista === 'preguntas' && <VistaPreguntas />}
          </div>
        )}
      </main>

      {perfilAbierto && (
        <PerfilEstudianteModal onCerrar={() => setPerfilAbierto(false)} />
      )}
    </div>
  );
}