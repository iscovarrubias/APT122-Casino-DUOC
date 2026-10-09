import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import CategoriaTabs from '../components/CategoriaTabs';
import MenuPrincipal from '../components/MenuPrincipal';
import VistaSemanal from '../components/VistaSemanal';
import VistaPreguntas from '../components/VistaPreguntas';
import { obtenerMenuHoy } from '../api/menu';
import { hoyChile, parseFechaISO } from '../utils/formato';

const INTERVALO_SONDEO_MS = 30000;

function formatearFechaLarga(fechaISO) {
  return parseFechaISO(fechaISO).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function VistaDiario() {
  const [categoria, setCategoria] = useState('Principal');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await obtenerMenuHoy(categoria, hoyChile());
      setDatos(respuesta);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [categoria]);

  useEffect(() => {
    setCargando(true);
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_SONDEO_MS);
    return () => clearInterval(intervalo);
  }, [cargar]);

  return (
    <>
      <div className="main-header">
        <h1>Menú diario {formatearFechaLarga(datos?.fecha || hoyChile())}</h1>
      </div>

      <CategoriaTabs categoriaActiva={categoria} onSeleccionar={setCategoria} />

      {cargando && <div className="estado-info">Cargando menú del día…</div>}

      {!cargando && error && (
        <div className="estado-info">No se pudo cargar el menú. Inténtalo de nuevo en unos minutos. ({error})</div>
      )}

      {!cargando && !error && datos && datos.preparaciones.length === 0 && (
        <div className="estado-info">Todavía no hay un menú publicado para hoy en la categoría "{categoria}".</div>
      )}

      {!cargando && !error && datos && datos.preparaciones.length > 0 && (
        <MenuPrincipal categoria={categoria} componentes={datos.preparaciones} />
      )}
    </>
  );
}

const TITULOS_VISTA = {
  semanal: 'Menú semanal',
  preguntas: 'Preguntas frecuentes',
};

export default function VistaPublica() {
  const [vista, setVista] = useState('diario');

  return (
    <div className="app-layout">
      <Sidebar vistaActiva={vista} onCambiarVista={setVista} />

      <main className="main">
        {vista !== 'diario' && (
          <div className="main-header">
            <h1>{TITULOS_VISTA[vista]}</h1>
          </div>
        )}

        {vista === 'diario' && <VistaDiario />}
        {vista === 'semanal' && <VistaSemanal />}
        {vista === 'preguntas' && <VistaPreguntas />}
      </main>
    </div>
  );
}
