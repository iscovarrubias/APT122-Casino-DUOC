import { useState, useEffect, useCallback, useRef } from 'react';
import { consultarJornadaHoy, registrarVenta, anularVenta, consultarPrediccionHoy } from '../api/gestion';
import { suscribirCambios } from '../utils/eventos';
import { formatearHora } from '../utils/formato';
import { BotonesVenta, CompartidosDelDia, UltimasVentas, MenuDelDia } from '../components/PanelVentas';

export default function CajaPage() {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [estimaciones, setEstimaciones] = useState({});
  const ultimoToque = useRef(0);

  const cargar = useCallback(async () => {
    try {
      setEstado(await consultarJornadaHoy());
      consultarPrediccionHoy()
        .then((p) => setEstimaciones(Object.fromEntries(p.categorias.map((c) => [c.categoria, c.estimacion]))))
        .catch(() => {});
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 15000);
    const cerrar = suscribirCambios(cargar);
    return () => { clearInterval(intervalo); cerrar(); };
  }, [cargar]);

  async function vender(categoria) {
    if (Date.now() - ultimoToque.current < 400) return;
    ultimoToque.current = Date.now();
    setError(null);
    try {
      await registrarVenta(categoria);
      setAviso(`${categoria} registrado`);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function anular(id) {
    setOcupado(true);
    setError(null);
    try {
      await anularVenta(id);
      setAviso('Venta anulada.');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  if (!estado && !error) return <div className="estado-info">Cargando…</div>;
  const { menu, jornada, componentes = [], ventas_recientes = [], ventas_por_categoria = [] } = estado || {};
  const abierta = jornada?.estado === 'abierta';

  return (
    <>
      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      {aviso && !error && <div className="mensaje mensaje-ok" role="status">{aviso}</div>}

      {estado && !menu && <div className="estado-info">Todavía no hay un menú planificado para hoy. Avisa a la cocina o a administración.</div>}
      {menu && !jornada && (
        <div className="mensaje mensaje-aviso">
          {menu.publicado
            ? 'La cocina todavía no inicia la jornada: no se pueden registrar ventas.'
            : 'El menú de hoy aún no está publicado.'}
        </div>
      )}

      {abierta && (
        <>
          <div className="barra-herramientas">
            <span className="insignia insignia-ok">Jornada abierta desde las {formatearHora(jornada.iniciada_en)}</span>
          </div>
          <BotonesVenta componentes={componentes} onVender={vender} estimaciones={estimaciones} />
          <h2 className="subtitulo-panel">Incluido en todos los combos</h2>
          <CompartidosDelDia componentes={componentes} />
          <UltimasVentas ventas={ventas_recientes} ocupado={ocupado} onAnular={anular} />
        </>
      )}

      {jornada?.estado === 'cerrada' && (
        <div className="tarjeta">
          <h2>Jornada cerrada{jornada.cierre_automatico ? ' (cierre automático)' : ''}</h2>
          <p className="texto-suave">Combos vendidos hoy:</p>
          {ventas_por_categoria.map((v) => <div key={v.categoria}><strong>{v.categoria}</strong>: {v.ventas}</div>)}
        </div>
      )}

      {menu && !abierta && componentes.length > 0 && <MenuDelDia componentes={componentes} />}
    </>
  );
}
