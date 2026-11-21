import { useState } from 'react';
import { copiarMenus } from '../../api/gestion';
import Mensaje from '../../components/Mensaje';
import { sumarDias, lunesDe, corta, etiquetaCopia } from './utilidades';

export default function PanelCopiar({ copia, onCambiar, onCopiado, onCerrar }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const { tipo, origen, destino, paso, sobrescribir } = copia;
  const listo = origen && destino;
  const esSemana = tipo === 'semana';

  async function pegar() {
    setOcupado(true);
    setError(null);
    try {
      const pares = esSemana
        ? [0, 1, 2, 3, 4, 5].map((i) => ({ origen: sumarDias(lunesDe(origen), i), destino: sumarDias(lunesDe(destino), i) }))
        : [{ origen, destino }];
      const r = await copiarMenus(pares, sobrescribir);
      const omitidos = r.omitidos.filter((o) => !esSemana || !/no tiene menú/.test(o.motivo));
      const detalle = omitidos.length
        ? ` Omitidos: ${omitidos.map((o) => `${corta(o.fecha)} (${o.motivo.replace(/\.$/, '')})`).join('; ')}.`
        : '';
      onCopiado(`Se copiaron ${r.copiados} día(s); quedaron sin publicar.${detalle}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const paso1 = (
    <button
      type="button"
      className={`copia-paso ${paso === 'origen' ? 'activo' : ''} ${origen ? 'hecho' : ''}`}
      onClick={() => onCambiar({ paso: 'origen' })}
    >
      <span className="copia-num">{origen ? '✓' : '1'}</span>
      <span className="copia-texto">
        <strong>Copiar</strong>
        <span>{origen ? etiquetaCopia(tipo, origen) : `Elige ${esSemana ? 'la semana' : 'el día'} en el calendario`}</span>
      </span>
    </button>
  );
  const paso2 = (
    <button
      type="button"
      className={`copia-paso ${paso === 'destino' ? 'activo' : ''} ${destino ? 'hecho' : ''}`}
      disabled={!origen}
      onClick={() => onCambiar({ paso: 'destino' })}
    >
      <span className="copia-num">{destino ? '✓' : '2'}</span>
      <span className="copia-texto">
        <strong>Pegar en</strong>
        <span>{destino ? etiquetaCopia(tipo, destino) : `Elige ${esSemana ? 'la semana' : 'el día'} de destino`}</span>
      </span>
    </button>
  );

  return (
    <div className="tarjeta copia-panel">
      <div className="copia-cabeza">
        <h2>Copiar y pegar menú</h2>
        <div className="segmentado" role="group" aria-label="Qué copiar">
          <button
            type="button"
            className={!esSemana ? 'activo' : ''}
            onClick={() => onCambiar({ tipo: 'dia', origen: null, destino: null, paso: 'origen' })}
          >
            Un día
          </button>
          <button
            type="button"
            className={esSemana ? 'activo' : ''}
            onClick={() => onCambiar({ tipo: 'semana', origen: null, destino: null, paso: 'origen' })}
          >
            Una semana
          </button>
        </div>
      </div>
      <p className="texto-suave copia-ayuda">
        {paso === 'origen'
          ? `Paso 1: haz clic en ${esSemana ? 'cualquier día de la semana' : 'el día'} que quieres copiar. Solo se pueden elegir los que ya tienen menú.`
          : `Paso 2: haz clic en ${esSemana ? 'cualquier día de la semana' : 'el día'} donde quieres pegarlo. Puedes cambiar de mes con las flechas.`}
      </p>
      <div className="copia-pasos">
        {paso1}
        <span className="copia-flecha" aria-hidden="true">
          →
        </span>
        {paso2}
      </div>
      <label className="campo-check">
        <input type="checkbox" checked={sobrescribir} onChange={(e) => onCambiar({ sobrescribir: e.target.checked })} />
        <span>Reemplazar lo que ya esté cargado en el destino</span>
      </label>
      {error && (
        <Mensaje tipo="error" style={{ marginTop: 10 }} onCerrar={() => setError(null)}>
          {error}
        </Mensaje>
      )}
      <div className="en-linea" style={{ marginTop: 12 }}>
        <button className="boton boton-primario" disabled={!listo || ocupado} onClick={pegar}>
          {ocupado ? 'Pegando…' : 'Pegar'}
        </button>
        <button className="boton boton-secundario" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
