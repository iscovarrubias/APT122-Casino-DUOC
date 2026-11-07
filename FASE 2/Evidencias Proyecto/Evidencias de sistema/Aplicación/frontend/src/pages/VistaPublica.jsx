import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import PerfilEstudianteModal from '../components/PerfilEstudianteModal';
import { useEstudiante } from '../utils/useEstudiante';
import CategoriaTabs from '../components/CategoriaTabs';
import MenuPrincipal from '../components/MenuPrincipal';
import VistaSemanal from '../components/VistaSemanal';
import VistaPreguntas from '../components/VistaPreguntas';
import PantallaCarga from '../components/PantallaCarga';
import { obtenerMenuHoy } from '../api/menu';
import { hoyChile, parseFechaISO, estadoEfectivo, NO_DISPONIBLE, CATEGORIAS_MENU } from '../utils/formato';
import { suscribirCambios } from '../utils/eventos';
import Cargando from '../components/Cargando';

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

function VistaDiario() {
  const { categoriaPreferida } = useEstudiante();
  const [categoria, setCategoria] = useState(categoriaPreferida || 'Principal');

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
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    setCargando(true);
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_SONDEO_MS);
    const cerrar = suscribirCambios(cargar);
    return () => { clearInterval(intervalo); cerrar(); };
  }, [cargar]);

  const delDia = datos?.preparaciones || [];
  const visibles = delDia.filter((p) => !p.categoria || p.categoria === categoria);
  const estados = estadosPorCategoria(delDia);

  return (
    <>
      <div className="main-header">
        <h1>Menú del día <span className="titulo-separador" aria-hidden="true">|</span> <span className="titulo-fecha">{formatearFechaLarga(datos?.fecha || hoyChile())}</span></h1>
      </div>

      <CategoriaTabs categoriaActiva={categoria} onSeleccionar={setCategoria} estados={estados} />

      {cargando && !datos && <PantallaCarga compacta mensaje="Cargando menú del día…" />}
      {cargando && datos && <Cargando>Cargando menú del día…</Cargando>}

      {!cargando && error && (
        <div className="estado-info">No se pudo cargar el menú. Inténtalo de nuevo en unos minutos. ({error})</div>
      )}

      {!cargando && !error && datos && visibles.length === 0 && (
        <div className="estado-info">Todavía no hay un menú publicado para hoy en la categoría "{categoria}".</div>
      )}

      {!cargando && !error && datos && visibles.length > 0 && (
        <MenuPrincipal categoria={categoria} componentes={visibles} />
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

export default function VistaPublica() {
  const [vista, setVista] = useState('diario');
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  useEffect(() => {
    document.title = `${TITULOS_PESTANA[vista] || 'Casinos DUOC UC'} - Casinos DUOC UC`;
  }, [vista]);

  return (
    <div className="app-layout">
      <Sidebar
        vistaActiva={vista}
        onCambiarVista={setVista}
        onAbrirPerfil={() => setPerfilAbierto(true)}
      />

      <main className="main v2 v2-pub">
        <div className="pagina" key={vista}>
          {vista !== 'diario' && (
            <div className="main-header">
              <h1>{TITULOS_VISTA[vista]}</h1>
            </div>
          )}

          {vista === 'diario' && <VistaDiario />}
          {vista === 'semanal' && <VistaSemanal />}
          {vista === 'preguntas' && <VistaPreguntas />}
        </div>
      </main>

      {perfilAbierto && (
        <PerfilEstudianteModal onCerrar={() => setPerfilAbierto(false)} />
      )}
    </div>
  );
}