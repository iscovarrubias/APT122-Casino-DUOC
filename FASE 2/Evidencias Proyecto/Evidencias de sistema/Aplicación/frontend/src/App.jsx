import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import CategoriaTabs from './components/CategoriaTabs';
import MenuPrincipal from './components/MenuPrincipal';
import { obtenerMenuHoy } from './api/menu';

const INTERVALO_SONDEO_MS = 30000;

function formatearFechaLarga(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-');
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function App() {
  const [categoria, setCategoria] = useState('Principal');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await obtenerMenuHoy(categoria);
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

  const hoyISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main">
        <div className="main-header">
          <h1>Menú diario {formatearFechaLarga(datos?.fecha || hoyISO)}</h1>
          <div className="avatar">E</div>
        </div>

        <CategoriaTabs categoriaActiva={categoria} onSeleccionar={setCategoria} />

        {cargando && <div className="estado-info">Cargando menú del día…</div>}

        {!cargando && error && (
          <div className="estado-info">
            No se pudo cargar el menú. Revisa que el backend esté corriendo. ({error})
          </div>
        )}

        {!cargando && !error && datos && datos.preparaciones.length === 0 && (
          <div className="estado-info">
            Todavía no hay un menú publicado para hoy en la categoría "{categoria}".
          </div>
        )}

        {!cargando && !error && datos && datos.preparaciones.length > 0 && (
          <MenuPrincipal categoria={categoria} componentes={datos.preparaciones} />
        )}
      </main>
    </div>
  );
}
