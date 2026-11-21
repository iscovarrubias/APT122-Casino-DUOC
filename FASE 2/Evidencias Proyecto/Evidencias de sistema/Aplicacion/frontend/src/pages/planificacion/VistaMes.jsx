import { useState, useEffect } from 'react';
import { consultarMes } from '../../api/gestion';
import { hoyChile, colorDeCategoria } from '../../utils/formato';
import { PRINCIPALES, lunesDe } from './utilidades';

export default function VistaMes({ mes, onCambiarMes, onElegir, version, copia, onError }) {
  const [dias, setDias] = useState(null);
  const [error, setError] = useState(null);
  const [intento] = useState(0);

  useEffect(() => {
    let activo = true;
    setDias(null);
    consultarMes(mes)
      .then((d) => {
        if (activo) {
          setDias(d.dias);
          setError(null);
          if (onError) onError(null);
        }
      })
      .catch((e) => {
        if (activo) {
          setError(e);
          if (onError) onError(e);
        }
      });
    return () => {
      activo = false;
    };
  }, [mes, version, intento, onError]);

  if (error) return null;

  const [anio, m] = mes.split('-').map(Number);
  const total = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  const semanas = [];
  let semana = null;
  for (let d = 1; d <= total; d++) {
    const fecha = `${mes}-${String(d).padStart(2, '0')}`;
    const dow = (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7;
    if (dow >= 5) continue;
    if (!semana || dow === 0) {
      semana = Array(5).fill(null);
      semanas.push(semana);
    }
    semana[dow] = fecha;
  }
  const mapa = new Map((dias || []).map((d) => [d.fecha, d]));
  const mover = (n) => onCambiarMes(new Date(Date.UTC(anio, m - 1 + n, 1)).toISOString().slice(0, 7));
  const tituloMes = new Date(Date.UTC(anio, m - 1, 1)).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const titulo = tituloMes.charAt(0).toUpperCase() + tituloMes.slice(1);

  return (
    <>
      <div className="barra-herramientas">
        <div className="en-linea">
          <button className="boton boton-secundario" onClick={() => mover(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <strong>{titulo}</strong>
          <button className="boton boton-secundario" onClick={() => mover(1)} aria-label="Mes siguiente">
            ›
          </button>
        </div>
        <span className="texto-suave">
          {copia ? 'Modo copiar y pegar: sigue los pasos de arriba.' : 'Haz clic en un día para planificarlo.'}
        </span>
      </div>
      <div className="mes-grid">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((n) => (
          <div key={n} className="mes-cabeza">
            {n}
          </div>
        ))}
        {semanas.flat().map((f, i) => {
          if (!f) return <div key={`v${i}`} className="mes-celda vacia-fuera" />;
          const info = mapa.get(f);
          const principales = (info?.componentes || [])
            .filter((c) => c.componente === 'Plato Principal')
            .sort(
              (x, y) =>
                PRINCIPALES.findIndex((q) => q.categoria === x.categoria) - PRINCIPALES.findIndex((q) => q.categoria === y.categoria)
            );
          const claveSel = (x) => (copia?.tipo === 'semana' ? lunesDe(x) : x);
          const esOrigen = copia?.origen && claveSel(f) === claveSel(copia.origen);
          const esDestino = copia?.destino && claveSel(f) === claveSel(copia.destino);
          const semanaConMenu = semanas.some((fila) => fila.includes(f) && fila.some((x) => x && mapa.get(x)));
          const bloqueada = copia?.paso === 'origen' && !(copia.tipo === 'semana' ? semanaConMenu : info);
          const clases = [
            'mes-celda',
            f === hoyChile() ? 'hoy' : '',
            copia ? 'mes-celda--copia' : '',
            esOrigen ? 'sel-origen' : '',
            esDestino ? 'sel-destino' : '',
            bloqueada ? 'bloqueada' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button key={f} type="button" className={clases} disabled={bloqueada} onClick={() => (copia ? onElegir(f, true) : onElegir(f))}>
              {esOrigen && <span className="mes-etiqueta mes-etiqueta--origen">Copiar</span>}
              {esDestino && <span className="mes-etiqueta mes-etiqueta--destino">Pegar aquí</span>}
              <span className="mes-fila">
                <span className="mes-dia">{Number(f.slice(8))}</span>
                <span className={`mes-estado-txt ${info ? (info.publicado ? 'pub' : 'bor') : 'sin'}`}>
                  {info ? (info.publicado ? 'Publicado' : 'Borrador') : 'Sin menú'}
                </span>
              </span>
              {principales.map((c) => (
                <span
                  key={c.categoria}
                  className="mes-pildora"
                  style={{ '--acento': colorDeCategoria(c.categoria).color }}
                  title={`${c.categoria}: ${c.preparacion}`}
                >
                  {c.preparacion}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </>
  );
}
